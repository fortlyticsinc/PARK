"""Department guideline upload and retrieval."""

import hashlib
import time
import uuid

import httpx
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.auth import AuthedUser
from backend.app.core.config import settings
from backend.app.core.error_handler import NotFoundError, PermissionError_, ValidationAppError
from backend.app.core.permissions import Role
from backend.app.models.department import Department
from backend.app.models.guideline import DepartmentGuideline
from backend.app.schemas.guideline import GuidelineOut

ALLOWED_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def _to_out(guideline: DepartmentGuideline) -> GuidelineOut:
    return GuidelineOut(
        id=str(guideline.id), department_id=str(guideline.department_id),
        file_url=guideline.file_url, file_name=guideline.file_name,
        mime_type=guideline.mime_type, file_size=guideline.file_size,
        updated_at=guideline.updated_at,
    )


async def get_for_user(db: AsyncSession, user: AuthedUser) -> GuidelineOut | None:
    if user.department_id is None or user.role not in (Role.STUDENT, Role.SUPERVISOR, Role.COORDINATOR):
        return None
    guideline = (await db.execute(
        select(DepartmentGuideline).where(DepartmentGuideline.department_id == user.department_id)
    )).scalar_one_or_none()
    return _to_out(guideline) if guideline else None


async def upload_for_department(
    db: AsyncSession, user: AuthedUser, department_id: str, file: UploadFile,
) -> GuidelineOut:
    if user.role != Role.COORDINATOR or user.department_id != department_id:
        raise PermissionError_("Only the department coordinator can manage its guideline")
    if not file.filename or file.content_type not in ALLOWED_TYPES:
        raise ValidationAppError("Guideline must be a PDF or Word document", field="file")

    department = (await db.execute(select(Department).where(Department.id == department_id))).scalar_one_or_none()
    if department is None:
        raise NotFoundError("Department not found")

    contents = await file.read()
    if len(contents) > settings.MAX_CHAPTER_FILE_MB * 1024 * 1024:
        raise ValidationAppError(f"File must be under {settings.MAX_CHAPTER_FILE_MB}MB", field="file")

    timestamp = int(time.time())
    folder = f"p-ark/guidelines/{department_id}"
    public_id = f"{uuid.uuid4().hex}"
    signed_params = {"folder": folder, "public_id": public_id, "timestamp": timestamp}
    source = "&".join(f"{key}={value}" for key, value in sorted(signed_params.items()))
    signature = hashlib.sha1(f"{source}{settings.CLOUDINARY_API_SECRET}".encode()).hexdigest()
    resource_type = "image" if file.content_type == "application/pdf" else "raw"
    upload_url = f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/{resource_type}/upload"

    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            upload_url,
            data={**signed_params, "api_key": settings.CLOUDINARY_API_KEY, "signature": signature},
            files={"file": (file.filename, contents, file.content_type)},
        )
    result = response.json()
    if response.status_code >= 300 or "secure_url" not in result:
        raise ValidationAppError(result.get("error", {}).get("message", "Cloudinary upload failed"))

    guideline = (await db.execute(
        select(DepartmentGuideline).where(DepartmentGuideline.department_id == department_id)
    )).scalar_one_or_none()
    if guideline is None:
        guideline = DepartmentGuideline(department_id=department_id)
        db.add(guideline)
    guideline.uploaded_by = user.id
    guideline.file_url = result["secure_url"]
    guideline.file_public_id = result["public_id"]
    guideline.file_name = file.filename
    guideline.mime_type = file.content_type
    guideline.file_size = str(result.get("bytes", len(contents)))
    await db.commit()
    await db.refresh(guideline)
    return _to_out(guideline)
