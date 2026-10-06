"""PARK — Pairing Service (Module 1)"""

from datetime import datetime, timezone
import re
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased
from sqlalchemy.exc import IntegrityError

from backend.app.models.pairing import Pairing, PairingStatus
from backend.app.models.user import User, UserRole
from backend.app.models.institution import Institution
from backend.app.core.auth import AuthedUser
from backend.app.core.permissions import Role
from backend.app.core.error_handler import NotFoundError, ConflictError, PermissionError_, ValidationAppError
from backend.app.utils.file_parsing import parse_tabular_file
from backend.app.schemas.pairing import (
    PairingCreate, PairingUpdate, PairingOut, PairingDetailOut,
    PaginatedPairingsOut, BulkImportResultOut, BulkImportSummaryOut,
)


def _normalize_project_title(title: str) -> str:
    return re.sub(r"\s+", " ", title).strip().lower()


async def _pairing_conflict(
    db: AsyncSession,
    student_id: str,
    institution_id: str,
    project_title: str | None,
    exclude_pairing_id: str | None = None,
) -> tuple[str, str] | None:
    active_pairing = select(Pairing.id).where(
        Pairing.student_id == student_id,
        Pairing.status == PairingStatus.active,
        Pairing.deleted_at.is_(None),
    )
    if exclude_pairing_id:
        active_pairing = active_pairing.where(Pairing.id != exclude_pairing_id)
    if (await db.execute(active_pairing.limit(1))).scalar_one_or_none():
        return "STUDENT_ALREADY_PAIRED", "This student already has an active supervisor pairing."

    normalized_title = _normalize_project_title(project_title or "")
    if normalized_title:
        normalized_column = func.lower(func.regexp_replace(func.trim(Pairing.project_title), r"\s+", " ", "g"))
        duplicate_topic = select(Pairing.id).where(
            Pairing.institution_id == institution_id,
            Pairing.project_title.is_not(None),
            func.trim(Pairing.project_title) != "",
            normalized_column == normalized_title,
            Pairing.deleted_at.is_(None),
        )
        if exclude_pairing_id:
            duplicate_topic = duplicate_topic.where(Pairing.id != exclude_pairing_id)
        if (await db.execute(duplicate_topic.limit(1))).scalar_one_or_none():
            return "DUPLICATE_PROJECT_TOPIC", "This project topic is already assigned in this institution."
    return None


def _pairing_conflict_from_integrity(error: IntegrityError) -> tuple[str, str]:
    detail = str(error.orig).lower()
    if "uq_pairings_active_student" in detail or "uq_pairing_student_year" in detail:
        return "STUDENT_ALREADY_PAIRED", "This student already has an active supervisor pairing."
    if "uq_pairings_institution_topic" in detail:
        return "DUPLICATE_PROJECT_TOPIC", "This project topic is already assigned in this institution."
    return "DUPLICATE_PAIRING", "This pairing conflicts with an existing record."


async def _institution_academic_session(db: AsyncSession, institution_id: str) -> str:
    institution = (await db.execute(
        select(Institution).where(Institution.id == institution_id)
    )).scalar_one_or_none()
    if institution is None:
        raise ValidationAppError("Selected institution is invalid", field="institution_id")
    academic_session = (institution.settings or {}).get("academic_session")
    if not academic_session:
        raise ValidationAppError("Set the current academic session for this institution before creating pairings")
    return academic_session


def _visibility_filter(user: AuthedUser):
    if user.role == Role.STUDENT:
        return Pairing.student_id == user.id
    if user.role == Role.SUPERVISOR:
        return Pairing.supervisor_id == user.id
    if user.role == Role.ADMIN:
        # Admin is institution-wide, not tied to any single department
        # (admin.department_id is NULL) — comparing it against a real
        # pairing's department_id would always be false and silently
        # return zero rows, which is exactly what was happening here.
        return Pairing.id != None  # noqa: E711 — deliberate "match everything" filter
    if user.role == Role.COORDINATOR:
        return Pairing.department_id == user.department_id
    return Pairing.id == None


async def list_pairings(
    db: AsyncSession, user: AuthedUser, page: int = 1, limit: int = 20,
    academic_year: str | None = None, status: str | None = None, search: str | None = None,
) -> PaginatedPairingsOut:
    Student = aliased(User)
    Supervisor = aliased(User)

    base_query = (
        select(Pairing, Student.full_name.label("student_name"),
               Student.matric_number.label("student_matric"),
               Supervisor.full_name.label("supervisor_name"))
        .join(Student, Pairing.student_id == Student.id)
        .join(Supervisor, Pairing.supervisor_id == Supervisor.id)
        .where(Pairing.deleted_at.is_(None))
        .where(_visibility_filter(user))
    )

    if academic_year:
        base_query = base_query.where(Pairing.academic_year == academic_year)
    if status:
        base_query = base_query.where(Pairing.status == status)
    if search:
        pattern = f"%{search}%"
        base_query = base_query.where(or_(
            Student.full_name.ilike(pattern), Student.matric_number.ilike(pattern),
            Supervisor.full_name.ilike(pattern),
            Pairing.project_title.ilike(pattern),
        ))

    count_query = select(func.count()).select_from(base_query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * limit
    paged_query = base_query.order_by(Pairing.created_at.desc()).offset(offset).limit(limit)
    rows = (await db.execute(paged_query)).all()

    items = [
        PairingOut(
            id=str(row.Pairing.id), student_name=row.student_name, student_matric=row.student_matric,
            supervisor_name=row.supervisor_name, project_title=row.Pairing.project_title,
            status=row.Pairing.status.value, academic_year=row.Pairing.academic_year,
            chapter_count=row.Pairing.chapter_count, last_meeting_date=row.Pairing.last_meeting_date,
            created_at=row.Pairing.created_at,
        )
        for row in rows
    ]

    pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedPairingsOut(items=items, total=total, page=page, limit=limit, pages=pages)


async def get_pairing(db: AsyncSession, user: AuthedUser, pairing_id: str) -> PairingDetailOut:
    Student = aliased(User)
    Supervisor = aliased(User)

    query = (
        select(Pairing, Student.full_name.label("student_name"), Student.matric_number.label("student_matric"),
               Student.email.label("student_email"), Supervisor.full_name.label("supervisor_name"),
               Supervisor.email.label("supervisor_email"))
        .join(Student, Pairing.student_id == Student.id)
        .join(Supervisor, Pairing.supervisor_id == Supervisor.id)
        .where(Pairing.id == pairing_id, Pairing.deleted_at.is_(None))
    )
    row = (await db.execute(query)).first()

    if row is None:
        raise NotFoundError("Pairing not found")

    pairing = row.Pairing

    is_owner = user.id in (str(pairing.student_id), str(pairing.supervisor_id))
    is_dept_staff = user.role == Role.ADMIN or (
        user.role == Role.COORDINATOR and user.department_id == str(pairing.department_id)
    )
    if not (is_owner or is_dept_staff):
        raise PermissionError_("You don't have access to this pairing")

    return PairingDetailOut(
        id=str(pairing.id), student_id=str(pairing.student_id), supervisor_id=str(pairing.supervisor_id),
        department_id=str(pairing.department_id), institution_id=str(pairing.institution_id),
        student_name=row.student_name, student_matric=row.student_matric, student_email=row.student_email,
        supervisor_name=row.supervisor_name, supervisor_email=row.supervisor_email,
        project_title=pairing.project_title, status=pairing.status.value, academic_year=pairing.academic_year,
        chapter_count=pairing.chapter_count, last_meeting_date=pairing.last_meeting_date,
        created_at=pairing.created_at,
    )


async def create_pairing(db: AsyncSession, user: AuthedUser, data: PairingCreate) -> PairingOut:
    student = (await db.execute(select(User).where(User.id == data.student_id))).scalar_one_or_none()
    if not student or student.role != UserRole.student or not student.is_active:
        raise ValidationAppError("Selected student is invalid", field="student_id")

    supervisor = (await db.execute(select(User).where(User.id == data.supervisor_id))).scalar_one_or_none()
    if not supervisor or supervisor.role != UserRole.supervisor or not supervisor.is_active:
        raise ValidationAppError("Selected supervisor is invalid", field="supervisor_id")

    academic_session = await _institution_academic_session(db, data.institution_id)
    if data.academic_year != academic_session:
        raise ValidationAppError(
            f"The current academic session is {academic_session}; refresh the pairing form and try again",
            field="academic_year",
        )

    project_title = " ".join(data.project_title.split()) if data.project_title else None
    conflict = await _pairing_conflict(db, data.student_id, data.institution_id, project_title)
    if conflict:
        raise ConflictError(conflict[1])

    pairing = Pairing(
        student_id=data.student_id, supervisor_id=data.supervisor_id, department_id=data.department_id,
        institution_id=data.institution_id, academic_year=academic_session, project_title=project_title,
        status=PairingStatus.active, created_by=user.id,
    )
    db.add(pairing)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        _, message = _pairing_conflict_from_integrity(exc)
        raise ConflictError(message)

    await db.refresh(pairing)

    return PairingOut(
        id=str(pairing.id), student_name=student.full_name, student_matric=student.matric_number,
        supervisor_name=supervisor.full_name, project_title=pairing.project_title, status=pairing.status.value,
        academic_year=pairing.academic_year, chapter_count=pairing.chapter_count,
        last_meeting_date=pairing.last_meeting_date, created_at=pairing.created_at,
    )


async def update_pairing(db: AsyncSession, user: AuthedUser, pairing_id: str, data: PairingUpdate) -> PairingOut:
    pairing = (await db.execute(select(Pairing).where(Pairing.id == pairing_id, Pairing.deleted_at.is_(None)))).scalar_one_or_none()
    if pairing is None:
        raise NotFoundError("Pairing not found")

    if user.role != Role.ADMIN and (user.role != Role.COORDINATOR or user.department_id != str(pairing.department_id)):
        raise PermissionError_("You can only edit pairings in your own department")

    if data.project_title is not None:
        project_title = " ".join(data.project_title.split()) or None
        conflict = await _pairing_conflict(
            db, str(pairing.student_id), str(pairing.institution_id), project_title,
            exclude_pairing_id=str(pairing.id),
        )
        if conflict and conflict[0] == "DUPLICATE_PROJECT_TOPIC":
            raise ConflictError(conflict[1])
        pairing.project_title = project_title
    if data.status is not None:
        pairing.status = PairingStatus(data.status)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        _, message = _pairing_conflict_from_integrity(exc)
        raise ConflictError(message)
    await db.refresh(pairing)

    student = (await db.execute(select(User).where(User.id == pairing.student_id))).scalar_one()
    supervisor = (await db.execute(select(User).where(User.id == pairing.supervisor_id))).scalar_one()

    return PairingOut(
        id=str(pairing.id), student_name=student.full_name, student_matric=student.matric_number,
        supervisor_name=supervisor.full_name, project_title=pairing.project_title, status=pairing.status.value,
        academic_year=pairing.academic_year, chapter_count=pairing.chapter_count,
        last_meeting_date=pairing.last_meeting_date, created_at=pairing.created_at,
    )


async def delete_pairing(db: AsyncSession, user: AuthedUser, pairing_id: str) -> None:
    pairing = (await db.execute(select(Pairing).where(Pairing.id == pairing_id, Pairing.deleted_at.is_(None)))).scalar_one_or_none()
    if pairing is None:
        raise NotFoundError("Pairing not found")

    if user.role != Role.ADMIN and (user.role != Role.COORDINATOR or user.department_id != str(pairing.department_id)):
        raise PermissionError_("You can only delete pairings in your own department")

    pairing.deleted_at = datetime.now(timezone.utc)
    await db.commit()


EXPECTED_COLUMNS = {
    "student_email", "supervisor_email", "department_id",
    "institution_id", "academic_year", "project_title",
}


async def bulk_import_pairings(db: AsyncSession, user: AuthedUser, filename: str, file_bytes: bytes) -> BulkImportSummaryOut:
    rows = parse_tabular_file(filename, file_bytes)

    if not rows:
        raise ValidationAppError("File has no data rows")

    header_keys = set(rows[0].keys())
    if not EXPECTED_COLUMNS.issubset(header_keys):
        raise ValidationAppError(f"File must contain columns: {', '.join(sorted(EXPECTED_COLUMNS))}")

    results: list[BulkImportResultOut] = []
    success_count = 0

    for row_number, row in enumerate(rows, start=2):  # +2: header is row 1, data starts row 2
        try:
            department_id = (row.get("department_id") or "").strip()
            institution_id = (row.get("institution_id") or "").strip()
            academic_year = (row.get("academic_year") or "").strip()

            # Coordinators can only bulk-import into their own department
            # — a coordinator from Computer Science shouldn't be able to
            # pair students in Mechanical Engineering via a spreadsheet.
            if user.role == Role.COORDINATOR and department_id != user.department_id:
                results.append(BulkImportResultOut(row_number=row_number, success=False, pairing_id=None,
                    error_code="DEPARTMENT_FORBIDDEN", error_message="You can only import pairings into your own department"))
                continue

            try:
                academic_session = await _institution_academic_session(db, institution_id)
            except ValidationAppError as exc:
                results.append(BulkImportResultOut(row_number=row_number, success=False, pairing_id=None,
                    error_code="ACADEMIC_SESSION_NOT_CONFIGURED", error_message=exc.message))
                continue
            if academic_year != academic_session:
                results.append(BulkImportResultOut(row_number=row_number, success=False, pairing_id=None,
                    error_code="ACADEMIC_SESSION_MISMATCH", error_message=f"Use the institution's current session: {academic_session}"))
                continue

            student_email = (row.get("student_email") or "").strip()
            supervisor_email = (row.get("supervisor_email") or "").strip()

            student = (await db.execute(select(User).where(User.email == student_email))).scalar_one_or_none()
            supervisor = (await db.execute(select(User).where(User.email == supervisor_email))).scalar_one_or_none()

            if not student or student.role != UserRole.student:
                results.append(BulkImportResultOut(row_number=row_number, success=False, pairing_id=None,
                    error_code="STUDENT_NOT_FOUND", error_message=f"No student found with email {student_email}"))
                continue

            if not supervisor or supervisor.role != UserRole.supervisor:
                results.append(BulkImportResultOut(row_number=row_number, success=False, pairing_id=None,
                    error_code="SUPERVISOR_NOT_FOUND", error_message=f"No supervisor found with email {supervisor_email}"))
                continue

            project_title = " ".join((row.get("project_title") or "").split()) or None
            conflict = await _pairing_conflict(db, str(student.id), institution_id, project_title)
            if conflict:
                results.append(BulkImportResultOut(row_number=row_number, success=False, pairing_id=None,
                    error_code=conflict[0], error_message=conflict[1]))
                continue

            pairing = Pairing(
                student_id=student.id, supervisor_id=supervisor.id, department_id=department_id,
                institution_id=institution_id, academic_year=academic_session,
                project_title=project_title, status=PairingStatus.active,
                created_by=user.id,
            )
            db.add(pairing)
            await db.commit()
            await db.refresh(pairing)

            results.append(BulkImportResultOut(row_number=row_number, success=True, pairing_id=str(pairing.id),
                error_code=None, error_message=None))
            success_count += 1

        except IntegrityError as exc:
            await db.rollback()
            error_code, error_message = _pairing_conflict_from_integrity(exc)
            results.append(BulkImportResultOut(row_number=row_number, success=False, pairing_id=None,
                error_code=error_code, error_message=error_message))
        except Exception as e:
            await db.rollback()
            results.append(BulkImportResultOut(row_number=row_number, success=False, pairing_id=None,
                error_code="UNKNOWN_ERROR", error_message=str(e)))

    return BulkImportSummaryOut(
        total_rows=len(rows), success_count=success_count,
        failure_count=len(rows) - success_count, results=results,
    )
