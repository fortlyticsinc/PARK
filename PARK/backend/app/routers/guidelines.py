from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthedUser
from app.core.database import get_db
from app.core.rbac import require_permission
from app.services import guideline_service

router = APIRouter(prefix="/v1/guidelines", tags=["Guidelines"])


@router.get("/mine")
async def get_my_guideline(
    db: AsyncSession = Depends(get_db),
    user: AuthedUser = Depends(require_permission("guideline:view")),
):
    return {"data": {"guideline": await guideline_service.get_for_user(db, user)}}


@router.post("/{department_id}")
async def upload_guideline(
    department_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: AuthedUser = Depends(require_permission("guideline:manage")),
):
    guideline = await guideline_service.upload_for_department(db, user, department_id, file)
    return {"data": {"guideline": guideline}}
