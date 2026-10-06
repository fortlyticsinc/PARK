"""
PARK — Certificate Service
================================
Gates issuance behind an explicit supervisor action (not automatic on
the last chapter approval) and requires every one of the 5 chapters to
be approved on its LATEST version — a chapter that was approved, then
reverted/resubmitted, doesn't count until the new version is approved
too.
"""

from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.auth import AuthedUser
from backend.app.core.permissions import Role
from backend.app.core.error_handler import NotFoundError, PermissionError_, ValidationAppError, ConflictError
from backend.app.models.certificate import Certificate
from backend.app.models.certificate_application import CertificateApplication
from backend.app.models.pairing import Pairing, PairingStatus
from backend.app.models.chapter import Chapter, ChapterStatus
from backend.app.models.user import User
from backend.app.models.department import Department
from backend.app.models.institution import Institution
from backend.app.models.message import Message
from backend.app.models.repository import RepositoryProject
from backend.app.services.chapter_service import validate_cloudinary_asset
from backend.app.schemas.certificate import (
    CertificateOut, CertificateVerifyOut, CompletionStatusOut, CompletionChecklistItemOut,
    CertificateApplicationOut, CertificateApplicationCreateIn, CertificateApplicationReviewIn,
)

TOTAL_CHAPTERS = 5


def _certificate_out(certificate: Certificate) -> CertificateOut:
    """Serialize UUID-backed ORM fields to the public string schema."""
    return CertificateOut(
        id=str(certificate.id),
        pairing_id=str(certificate.pairing_id),
        certificate_number=certificate.certificate_number,
        student_name=certificate.student_name,
        student_matric=certificate.student_matric,
        supervisor_name=certificate.supervisor_name,
        department_name=certificate.department_name,
        institution_name=certificate.institution_name,
        project_title=certificate.project_title,
        academic_year=certificate.academic_year,
        issued_at=certificate.issued_at,
    )


def _application_out(application: CertificateApplication) -> CertificateApplicationOut:
    return CertificateApplicationOut(
        id=str(application.id), pairing_id=str(application.pairing_id),
        final_copy_url=application.final_copy_url, status=application.status,
        supervisor_comment=application.supervisor_comment,
        applied_at=application.applied_at, reviewed_at=application.reviewed_at,
    )


async def _get_pairing(db: AsyncSession, pairing_id: str) -> Pairing:
    pairing = (await db.execute(select(Pairing).where(Pairing.id == pairing_id))).scalar_one_or_none()
    if pairing is None:
        raise NotFoundError("Pairing not found")
    return pairing


async def _latest_chapter_per_number(db: AsyncSession, pairing_id: str) -> dict[int, Chapter]:
    """Returns {chapter_number: latest-version Chapter row} for a pairing."""
    rows = (await db.execute(
        select(Chapter).where(Chapter.pairing_id == pairing_id).order_by(Chapter.version.desc())
    )).scalars().all()

    latest: dict[int, Chapter] = {}
    for ch in rows:
        # Rows arrive newest-version-first, so the first time we see a
        # chapter_number IS its latest version — skip any older ones.
        if ch.chapter_number not in latest:
            latest[ch.chapter_number] = ch
    return latest


async def get_completion_status(db: AsyncSession, pairing_id: str) -> CompletionStatusOut:
    latest = await _latest_chapter_per_number(db, pairing_id)

    checklist = []
    all_approved = True
    for n in range(1, TOTAL_CHAPTERS + 1):
        chapter = latest.get(n)
        submitted = chapter is not None
        approved = chapter is not None and chapter.status == ChapterStatus.approved
        if not approved:
            all_approved = False
        checklist.append(CompletionChecklistItemOut(chapter_number=n, submitted=submitted, approved=approved))

    existing_cert = (await db.execute(select(Certificate).where(Certificate.pairing_id == pairing_id))).scalar_one_or_none()

    return CompletionStatusOut(
        ready=all_approved and existing_cert is None,
        chapters=checklist,
        already_certified=existing_cert is not None,
    )


async def get_application(db: AsyncSession, user: AuthedUser, pairing_id: str) -> CertificateApplicationOut | None:
    pairing = await _get_pairing(db, pairing_id)
    is_dept_staff = user.role == Role.ADMIN or (
        user.role == Role.COORDINATOR and user.department_id == str(pairing.department_id)
    )
    if user.id not in {str(pairing.student_id), str(pairing.supervisor_id)} and not is_dept_staff:
        raise PermissionError_("You don't have access to this certificate application")
    application = (await db.execute(
        select(CertificateApplication).where(CertificateApplication.pairing_id == pairing_id)
    )).scalar_one_or_none()
    return _application_out(application) if application else None


async def apply_for_certificate(
    db: AsyncSession, user: AuthedUser, pairing_id: str, data: CertificateApplicationCreateIn,
) -> CertificateApplicationOut:
    pairing = await _get_pairing(db, pairing_id)
    if str(pairing.student_id) != user.id:
        raise PermissionError_("Only the assigned student can apply for a certificate")
    validate_cloudinary_asset(user.id, data.final_copy_url, "application/pdf", "final_copy")
    status = await get_completion_status(db, pairing_id)
    if not status.ready:
        missing = [str(item.chapter_number) for item in status.chapters if not item.approved]
        raise ValidationAppError(
            f"Certificate requirements are not complete. Chapter(s) {', '.join(missing)} still need approval"
        )
    application = (await db.execute(
        select(CertificateApplication).where(CertificateApplication.pairing_id == pairing_id)
    )).scalar_one_or_none()
    if application is None:
        application = CertificateApplication(
            pairing_id=pairing.id, student_id=pairing.student_id,
            supervisor_id=pairing.supervisor_id, final_copy_url=data.final_copy_url,
        )
        db.add(application)
    else:
        if application.status == "pending":
            return _application_out(application)
        application.final_copy_url = data.final_copy_url
        application.status = "pending"
        application.supervisor_comment = None
        application.reviewed_at = None

    repository_project = (await db.execute(
        select(RepositoryProject).where(RepositoryProject.pairing_id == pairing.id)
    )).scalar_one_or_none()
    if repository_project is not None:
        # The complete final copy is repository metadata, not another chapter.
        repository_project.full_thesis_url = data.final_copy_url

    db.add(Message(
        pairing_id=pairing.id,
        sender_id=pairing.student_id,
        content="Certificate application submitted with the complete final project copy. Please review it.",
        is_read=False,
    ))
    await db.commit()
    await db.refresh(application)
    return _application_out(application)


async def review_application(
    db: AsyncSession, user: AuthedUser, pairing_id: str, data: CertificateApplicationReviewIn,
) -> CertificateOut | CertificateApplicationOut:
    pairing = await _get_pairing(db, pairing_id)
    if str(pairing.supervisor_id) != user.id and user.role != Role.ADMIN:
        raise PermissionError_("Only the assigned supervisor can review this certificate application")
    if data.status not in {"approved", "rejected"}:
        raise ValidationAppError("Application status must be approved or rejected")
    application = (await db.execute(
        select(CertificateApplication).where(CertificateApplication.pairing_id == pairing_id)
    )).scalar_one_or_none()
    if application is None:
        raise NotFoundError("No certificate application has been submitted")
    application.status = data.status
    application.supervisor_comment = data.comment
    application.reviewed_by = user.id
    application.reviewed_at = datetime.now(timezone.utc)
    if data.status == "rejected":
        await db.commit()
        await db.refresh(application)
        return _application_out(application)
    # Keep the application approval and certificate mint in one transaction.
    # If minting fails, the session rolls back and the application remains
    # pending instead of becoming "approved" with no certificate record.
    return await _mint_certificate(db, pairing, user.id)


async def _generate_certificate_number(db: AsyncSession, academic_year: str, department_code: str | None) -> str:
    year = academic_year.split("/")[0] if "/" in academic_year else academic_year
    dept_tag = (department_code or "GEN").upper()[:6]

    prefix = f"PARK-{year}-{dept_tag}-"
    count_query = select(func.count()).select_from(Certificate).where(Certificate.certificate_number.like(f"{prefix}%"))
    existing_count = (await db.execute(count_query)).scalar_one()

    sequence = existing_count + 1
    return f"{prefix}{sequence:04d}"


async def confirm_completion(db: AsyncSession, user: AuthedUser, pairing_id: str) -> CertificateOut:
    pairing = (await db.execute(select(Pairing).where(Pairing.id == pairing_id))).scalar_one_or_none()
    if pairing is None:
        raise NotFoundError("Pairing not found")

    if str(pairing.supervisor_id) != user.id and user.role != Role.ADMIN:
        raise PermissionError_("Only the assigned supervisor can confirm completion for this pairing")

    return await _mint_certificate(db, pairing, user.id)


async def _mint_certificate(db: AsyncSession, pairing: Pairing, confirmed_by: str) -> CertificateOut:
    """Create the certificate once the supervisor has approved completion."""

    existing = (await db.execute(select(Certificate).where(Certificate.pairing_id == pairing.id))).scalar_one_or_none()
    if existing is not None:
        raise ConflictError("A certificate has already been issued for this pairing")

    status = await get_completion_status(db, str(pairing.id))
    if not all(item.approved for item in status.chapters):
        missing = [str(item.chapter_number) for item in status.chapters if not item.approved]
        raise ValidationAppError(
            f"Cannot confirm completion — Chapter(s) {', '.join(missing)} not yet approved"
        )

    student = (await db.execute(select(User).where(User.id == pairing.student_id))).scalar_one_or_none()
    supervisor = (await db.execute(select(User).where(User.id == pairing.supervisor_id))).scalar_one_or_none()
    department = (await db.execute(select(Department).where(Department.id == pairing.department_id))).scalar_one_or_none()
    institution = (await db.execute(select(Institution).where(Institution.id == pairing.institution_id))).scalar_one_or_none()

    if not student or not supervisor or not department or not institution:
        raise ValidationAppError("Missing student, supervisor, department, or institution data — cannot issue certificate")

    certificate_number = await _generate_certificate_number(db, pairing.academic_year, department.code)

    certificate = Certificate(
        pairing_id=pairing.id, certificate_number=certificate_number,
        student_name=student.full_name, student_matric=student.matric_number,
        supervisor_name=supervisor.full_name, department_name=department.name,
        institution_name=institution.name, project_title=pairing.project_title or "Untitled Project",
        academic_year=pairing.academic_year, confirmed_by=confirmed_by,
    )
    db.add(certificate)

    # Completion confirmation is the "official" close of the pairing —
    # matches the pre-existing PairingStatus.completed value, which
    # previously had no code path that actually set it.
    pairing.status = PairingStatus.completed

    await db.commit()
    await db.refresh(certificate)

    return _certificate_out(certificate)


async def get_certificate_for_pairing(db: AsyncSession, user: AuthedUser, pairing_id: str) -> CertificateOut:
    pairing = (await db.execute(select(Pairing).where(Pairing.id == pairing_id))).scalar_one_or_none()
    if pairing is None:
        raise NotFoundError("Pairing not found")

    is_participant = user.id in (str(pairing.student_id), str(pairing.supervisor_id))
    is_dept_staff = user.role in (Role.COORDINATOR, Role.ADMIN) and (
        user.role == Role.ADMIN or user.department_id == str(pairing.department_id)
    )
    if not (is_participant or is_dept_staff):
        raise PermissionError_("You don't have access to this certificate")

    certificate = (await db.execute(select(Certificate).where(Certificate.pairing_id == pairing_id))).scalar_one_or_none()
    if certificate is None:
        # Older approval records may exist from the period when application
        # approval was committed before certificate minting. Repair that
        # state on the first authorized certificate view.
        application = (await db.execute(
            select(CertificateApplication).where(CertificateApplication.pairing_id == pairing_id)
        )).scalar_one_or_none()
        if application and application.status == "approved":
            confirmed_by = str(application.reviewed_by or pairing.supervisor_id)
            return await _mint_certificate(db, pairing, confirmed_by)
        raise NotFoundError("No certificate has been issued for this pairing yet")

    return _certificate_out(certificate)


async def verify_certificate(db: AsyncSession, certificate_number: str) -> CertificateVerifyOut:
    """Public — no auth. Only ever returns what's already printed on the certificate."""
    certificate = (await db.execute(
        select(Certificate).where(Certificate.certificate_number == certificate_number)
    )).scalar_one_or_none()

    if certificate is None:
        raise NotFoundError("No certificate found with that number")

    return CertificateVerifyOut(
        certificate_number=certificate.certificate_number, student_name=certificate.student_name,
        project_title=certificate.project_title, department_name=certificate.department_name,
        institution_name=certificate.institution_name, academic_year=certificate.academic_year,
        issued_at=certificate.issued_at, valid=True,
    )
