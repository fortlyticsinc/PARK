"""PARK — Institutions & Departments Router"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.auth import AuthedUser, get_current_user
from backend.app.core.rbac import require_role
from backend.app.core.permissions import Role
from backend.app.schemas.lookup import AcademicSessionUpdateIn, DepartmentCreateIn, DepartmentUpdateIn
from backend.app.services import lookup_service

router = APIRouter(prefix="/v1", tags=["Institutions & Departments"])


@router.get("/institutions")
async def list_institutions(db: AsyncSession = Depends(get_db)):
    # PUBLIC on purpose — the signup page needs this before a student
    # has any auth token at all. Non-sensitive reference data.
    result = await lookup_service.list_institutions(db)
    return {"data": {"institutions": result}}


@router.get("/departments")
async def list_departments(institution_id: str | None = None, db: AsyncSession = Depends(get_db)):
    # PUBLIC — same reasoning as institutions above.
    result = await lookup_service.list_departments(db, institution_id)
    return {"data": {"departments": result}}


@router.post("/departments", status_code=201)
async def create_department(body: DepartmentCreateIn, db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_role(Role.ADMIN))):
    result = await lookup_service.create_department(db, body)
    return {"data": {"department": result}}


@router.patch("/institutions/{institution_id}/academic-session")
async def update_academic_session(
    institution_id: str,
    body: AcademicSessionUpdateIn,
    db: AsyncSession = Depends(get_db),
    user: AuthedUser = Depends(require_role(Role.ADMIN)),
):
    result = await lookup_service.update_academic_session(db, institution_id, body.academic_session)
    return {"data": {"institution": result}}


@router.patch("/departments/{department_id}")
async def update_department(department_id: str, body: DepartmentUpdateIn, db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_role(Role.ADMIN))):
    result = await lookup_service.update_department(db, department_id, body)
    return {"data": {"department": result}}


@router.delete("/departments/{department_id}")
async def delete_department(department_id: str, db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_role(Role.ADMIN))):
    await lookup_service.delete_department(db, department_id)
    return {"data": {"deleted": True}}
