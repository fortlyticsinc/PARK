"""PARK — Pairings Router (Module 1)"""

from fastapi import APIRouter, Depends, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.auth import AuthedUser
from backend.app.core.rbac import require_permission
from backend.app.core.error_handler import ValidationAppError
from backend.app.schemas.pairing import PairingCreate, PairingUpdate
from backend.app.services import pairing_service

router = APIRouter(prefix="/v1/pairings", tags=["Pairings"])


@router.get("")
async def list_pairings(
    page: int = Query(default=1, ge=1), limit: int = Query(default=20, ge=1, le=100),
    academic_year: str | None = None, status: str | None = None, search: str | None = None,
    db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("pairing:view")),
):
    result = await pairing_service.list_pairings(db, user, page=page, limit=limit, academic_year=academic_year, status=status, search=search)
    return {"data": result}


@router.get("/{pairing_id}")
async def get_pairing(pairing_id: str, db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("pairing:view"))):
    result = await pairing_service.get_pairing(db, user, pairing_id)
    return {"data": {"pairing": result}}


@router.post("", status_code=201)
async def create_pairing(body: PairingCreate, db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("pairing:create"))):
    result = await pairing_service.create_pairing(db, user, body)
    return {"data": {"pairing": result}}


@router.patch("/{pairing_id}")
async def update_pairing(pairing_id: str, body: PairingUpdate, db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("pairing:update"))):
    result = await pairing_service.update_pairing(db, user, pairing_id, body)
    return {"data": {"pairing": result}}


@router.delete("/{pairing_id}", status_code=200)
async def delete_pairing(pairing_id: str, db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("pairing:delete"))):
    await pairing_service.delete_pairing(db, user, pairing_id)
    return {"data": {"deleted": True}}


@router.post("/bulk-import")
async def bulk_import_pairings(file: UploadFile = File(...), db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("pairing:bulk_import"))):
    if not file.filename.lower().endswith((".csv", ".xlsx")):
        raise ValidationAppError("File must be a .csv or .xlsx", field="file")
    file_bytes = await file.read()
    result = await pairing_service.bulk_import_pairings(db, user, file.filename, file_bytes)
    return {"data": result}
