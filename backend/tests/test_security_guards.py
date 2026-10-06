from uuid import uuid4

import pytest
from pydantic import ValidationError

from backend.app.core.auth import AuthedUser, verified_supabase_identity
from backend.app.core.config import settings
from backend.app.core.error_handler import AuthError, PermissionError_, ValidationAppError
from backend.app.core.permissions import Role
from backend.app.models.user import User, UserRole
from backend.app.schemas.certificate import CertificateApplicationCreateIn
from backend.app.schemas.chapter import ChapterResubmitIn, ChapterSubmitIn
from backend.app.services.chapter_service import validate_cloudinary_asset
from backend.app.services.chapter_service import _assert_chapter_access
from backend.app.services.user_service import coordinator_can_manage_user


def test_supabase_identity_requires_confirmed_email():
    with pytest.raises(AuthError):
        verified_supabase_identity({"id": str(uuid4()), "email": "student@example.edu"})


def test_supabase_identity_normalizes_verified_email():
    identity = verified_supabase_identity({
        "id": str(uuid4()),
        "email": "Student@Example.edu ",
        "email_confirmed_at": "2026-10-06T12:00:00Z",
    })
    assert identity["email"] == "student@example.edu"


def _coordinator(department_id: str) -> AuthedUser:
    return AuthedUser(
        id=str(uuid4()), supabase_uid=str(uuid4()), email="coord@example.edu", full_name="Coordinator",
        role=Role.COORDINATOR, department_id=department_id, institution_id=str(uuid4()),
    )


def _target(role: UserRole, department_id: str) -> User:
    return User(id=uuid4(), email="target@example.edu", full_name="Target", role=role, department_id=department_id)


def test_coordinator_can_manage_only_own_department_supervisors():
    own_department = str(uuid4())
    coordinator = _coordinator(own_department)
    assert coordinator_can_manage_user(coordinator, _target(UserRole.supervisor, own_department))
    assert not coordinator_can_manage_user(coordinator, _target(UserRole.coordinator, own_department))
    assert not coordinator_can_manage_user(coordinator, _target(UserRole.supervisor, str(uuid4())))


class _ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class _ChapterAccessDb:
    def __init__(self, department_id):
        self.department_id = department_id

    async def execute(self, _statement):
        return _ScalarResult(type("PairingScope", (), {"department_id": self.department_id})())


@pytest.mark.asyncio
async def test_coordinator_chapter_detail_is_department_scoped_and_read_only():
    own_department = str(uuid4())
    coordinator = _coordinator(own_department)
    chapter = type("ChapterScope", (), {
        "student_id": uuid4(), "supervisor_id": uuid4(), "pairing_id": uuid4(),
    })()

    await _assert_chapter_access(_ChapterAccessDb(own_department), coordinator, chapter)
    with pytest.raises(PermissionError_):
        await _assert_chapter_access(_ChapterAccessDb(str(uuid4())), coordinator, chapter)
    with pytest.raises(PermissionError_):
        await _assert_chapter_access(_ChapterAccessDb(own_department), coordinator, chapter, write=True)


def test_chapter_upload_requires_owner_scoped_raw_cloudinary_asset():
    user_id = str(uuid4())
    public_id = f"p-ark/chapters/{user_id}/chapter.docx"
    file_url = f"https://res.cloudinary.com/{settings.CLOUDINARY_CLOUD_NAME}/raw/upload/v123/{public_id}"
    validate_cloudinary_asset(
        user_id, file_url,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "chapter", public_id,
    )

    with pytest.raises(ValidationAppError):
        validate_cloudinary_asset(
            user_id, file_url.replace(user_id, str(uuid4())),
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "chapter", public_id,
        )
    with pytest.raises(ValidationAppError):
        validate_cloudinary_asset(
            user_id, "https://evil.example/phishing.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "chapter", public_id,
        )


def test_final_copy_must_be_owned_cloudinary_pdf():
    user_id = str(uuid4())
    public_id = f"p-ark/final-copies/{user_id}/final.pdf"
    file_url = f"https://res.cloudinary.com/{settings.CLOUDINARY_CLOUD_NAME}/raw/upload/v123/{public_id}"
    validate_cloudinary_asset(user_id, file_url, "application/pdf", "final_copy")

    with pytest.raises(ValidationAppError):
        validate_cloudinary_asset(user_id, file_url.replace("final.pdf", "final.docx"), "application/pdf", "final_copy")


def test_chapter_schema_accepts_docx_rejects_pdf_and_checks_resubmit_size():
    ChapterSubmitIn(
        pairing_id=str(uuid4()), chapter_number=1, file_url="https://example.test/file.docx",
        file_public_id="file.docx", file_size=100,
        mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    with pytest.raises(ValidationError):
        ChapterSubmitIn(
            pairing_id=str(uuid4()), chapter_number=1, file_url="https://example.test/file.pdf",
            file_public_id="file.pdf", file_size=100, mime_type="application/pdf",
        )
    with pytest.raises(ValidationError):
        ChapterResubmitIn(
            chapter_id=str(uuid4()), file_url="https://example.test/file.docx",
            file_public_id="file.docx", file_size=21 * 1024 * 1024,
            mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )


def test_certificate_application_requires_https_pdf():
    CertificateApplicationCreateIn(final_copy_url="https://res.cloudinary.com/demo/raw/upload/final.pdf")
    with pytest.raises(ValidationError):
        CertificateApplicationCreateIn(final_copy_url="https://example.test/final.docx")