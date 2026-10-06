"""PARK — Users Router"""

from uuid import uuid4

from fastapi import APIRouter, Depends, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache_delete, cache_get, cache_set
from app.core.database import get_db
from app.core.auth import AuthedUser
from app.core.rbac import require_permission
from app.core.error_handler import ValidationAppError, FeatureDisabledError, NotFoundError, UpstreamError
from app.jobs.bulk_import import JOB_CACHE_PREFIX, JOB_TTL_SECONDS, encrypt_import_file, process_user_import
from app.schemas.user import UserCreateIn, UserUpdateIn
from app.services import user_service

router = APIRouter(prefix="/v1/users", tags=["Users"])


@router.get("")
async def list_users(
    role: str | None = None, department_id: str | None = None, search: str | None = None,
    active_only: bool = False,
    page: int = Query(default=1, ge=1), limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("user:view")),
):
    result = await user_service.list_users(db, user, role, department_id, search, active_only, page, limit)
    return {"data": result}


@router.get("/{user_id}")
async def get_user(user_id: str, db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("user:view"))):
    result = await user_service.get_user(db, user, user_id)
    return {"data": {"user": result}}


@router.post("", status_code=201)
async def create_user(body: UserCreateIn, db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("user:manage"))):
    result = await user_service.create_user(db, user, body)
    return {"data": {"user": result}}


@router.patch("/{user_id}")
async def update_user(user_id: str, body: UserUpdateIn, db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("user:manage"))):
    result = await user_service.update_user(db, user, user_id, body)
    return {"data": {"user": result}}


@router.delete("/{user_id}")
async def delete_user(user_id: str, db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("user:manage"))):
    await user_service.delete_user(db, user, user_id)
    return {"data": {"deleted": True}}


@router.patch("/{user_id}/activation")
async def set_user_activation(
    user_id: str,
    body: UserUpdateIn,
    db: AsyncSession = Depends(get_db),
    user: AuthedUser = Depends(require_permission("user:deactivate_student")),
):
    if body.is_active is None:
        raise ValidationAppError("is_active is required", field="is_active")
    result = await user_service.set_user_activation(db, user, user_id, body.is_active)
    return {"data": {"user": result}}


@router.post("/bulk-import")
async def bulk_import_users(file: UploadFile = File(...), user: AuthedUser = Depends(require_permission("user:bulk_import"))):
    if not file.filename or not file.filename.lower().endswith((".csv", ".xlsx")):
        raise ValidationAppError("File must be a .csv or .xlsx", field="file")
    job_id = str(uuid4())
    job = {"job_id": job_id, "user_id": user.id, "status": "queued"}
    await cache_set(f"{JOB_CACHE_PREFIX}{job_id}", job, JOB_TTL_SECONDS)
    try:
        process_user_import.apply_async(
            args=(job_id, file.filename, encrypt_import_file(await file.read()), user.model_dump(mode="json")),
            task_id=job_id,
        )
    except Exception as exc:
        await cache_delete(f"{JOB_CACHE_PREFIX}{job_id}")
        raise UpstreamError() from exc
    return {"data": {"job_id": job_id, "status": "queued"}}


@router.get("/bulk-import/jobs/{job_id}")
async def get_user_bulk_import_job(
    job_id: str,
    user: AuthedUser = Depends(require_permission("user:bulk_import")),
):
    job = await cache_get(f"{JOB_CACHE_PREFIX}{job_id}")
    if not job or job.get("user_id") != user.id:
        raise NotFoundError("Import job not found")
    return {"data": job}
