"""
PARK — Institution & Department Lookups
==============================================
Thin service for populating dropdowns and basic admin management.
No row-level ownership complexity here — institutions/departments are
inherently shared reference data, not personal records.

NOTE: id/institution_id/coordinator_id are converted to str() manually
below rather than relying on model_validate(from_attributes=True) to
do it — Pydantic v2 does NOT auto-stringify a UUID column into a str
field (unlike int/float, which do get lax coercion). Every other
service in the codebase does this conversion manually already; this
file just hadn't caught up to that pattern, and it only surfaces once
you're hitting a real Postgres UUID column instead of the seed script.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from backend.app.models.institution import Institution
from backend.app.models.department import Department
from backend.app.core.error_handler import ConflictError, NotFoundError
from backend.app.schemas.lookup import (
    InstitutionOut, InstitutionCreateIn, InstitutionUpdateIn,
    DepartmentOut, DepartmentCreateIn, DepartmentUpdateIn,
)


def _to_institution_out(inst: Institution) -> InstitutionOut:
    return InstitutionOut(
        id=str(inst.id), name=inst.name, code=inst.code,
        academic_session=(inst.settings or {}).get("academic_session"),
    )


def _to_department_out(dept: Department) -> DepartmentOut:
    return DepartmentOut(
        id=str(dept.id),
        institution_id=str(dept.institution_id),
        name=dept.name,
        code=dept.code,
        coordinator_id=str(dept.coordinator_id) if dept.coordinator_id else None,
    )


async def list_institutions(db: AsyncSession) -> list[InstitutionOut]:
    rows = (await db.execute(select(Institution).order_by(Institution.name))).scalars().all()
    return [_to_institution_out(r) for r in rows]


async def create_institution(db: AsyncSession, data: InstitutionCreateIn) -> InstitutionOut:
    inst = Institution(name=data.name, code=data.code)
    db.add(inst)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise ConflictError(f"Institution code '{data.code}' already in use")
    await db.refresh(inst)
    return _to_institution_out(inst)


async def list_departments(db: AsyncSession, institution_id: str | None = None) -> list[DepartmentOut]:
    query = select(Department)
    if institution_id:
        query = query.where(Department.institution_id == institution_id)
    rows = (await db.execute(query.order_by(Department.name))).scalars().all()
    return [_to_department_out(r) for r in rows]


async def create_department(db: AsyncSession, data: DepartmentCreateIn) -> DepartmentOut:
    dept = Department(institution_id=data.institution_id, name=data.name, code=data.code)
    db.add(dept)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise ConflictError(f"Department code '{data.code}' already exists for this institution")
    await db.refresh(dept)
    return _to_department_out(dept)


async def update_institution(db: AsyncSession, institution_id: str, data: InstitutionUpdateIn) -> InstitutionOut:
    inst = (await db.execute(select(Institution).where(Institution.id == institution_id))).scalar_one_or_none()
    if inst is None:
        raise NotFoundError("Institution not found")
    if data.name is not None:
        inst.name = data.name
    if data.code is not None:
        inst.code = data.code
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise ConflictError(f"Institution code '{data.code}' already in use")
    await db.refresh(inst)
    return _to_institution_out(inst)


async def update_academic_session(db: AsyncSession, institution_id: str, academic_session: str) -> InstitutionOut:
    inst = (await db.execute(select(Institution).where(Institution.id == institution_id))).scalar_one_or_none()
    if inst is None:
        raise NotFoundError("Institution not found")
    inst.settings = {**(inst.settings or {}), "academic_session": academic_session}
    await db.commit()
    await db.refresh(inst)
    return _to_institution_out(inst)


async def delete_institution(db: AsyncSession, institution_id: str) -> None:
    inst = (await db.execute(select(Institution).where(Institution.id == institution_id))).scalar_one_or_none()
    if inst is None:
        raise NotFoundError("Institution not found")
    await db.delete(inst)
    await db.commit()


async def update_department(db: AsyncSession, department_id: str, data: DepartmentUpdateIn) -> DepartmentOut:
    dept = (await db.execute(select(Department).where(Department.id == department_id))).scalar_one_or_none()
    if dept is None:
        raise NotFoundError("Department not found")
    if data.name is not None:
        dept.name = data.name
    if data.code is not None:
        dept.code = data.code
    if data.coordinator_id is not None:
        dept.coordinator_id = data.coordinator_id
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise ConflictError(f"Department code '{data.code}' already exists for this institution")
    await db.refresh(dept)
    return _to_department_out(dept)


async def delete_department(db: AsyncSession, department_id: str) -> None:
    dept = (await db.execute(select(Department).where(Department.id == department_id))).scalar_one_or_none()
    if dept is None:
        raise NotFoundError("Department not found")
    await db.delete(dept)
    await db.commit()
