"""PARK — Certificates Router"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import AuthedUser
from app.core.rbac import require_permission
from app.schemas.certificate import CertificateApplicationCreateIn, CertificateApplicationReviewIn
from app.services import certificate_service

router = APIRouter(tags=["Certificates"])


@router.get("/v1/pairings/{pairing_id}/certificate/status")
async def get_completion_status(
    pairing_id: str, db: AsyncSession = Depends(get_db),
    user: AuthedUser = Depends(require_permission("certificate:view")),
):
    result = await certificate_service.get_completion_status(db, pairing_id)
    return {"data": result}


@router.get("/v1/pairings/{pairing_id}/certificate/application")
async def get_application(
    pairing_id: str, db: AsyncSession = Depends(get_db),
    user: AuthedUser = Depends(require_permission("certificate:view")),
):
    result = await certificate_service.get_application(db, user, pairing_id)
    return {"data": {"application": result}}


@router.post("/v1/pairings/{pairing_id}/certificate/application", status_code=201)
async def apply_for_certificate(
    pairing_id: str, body: CertificateApplicationCreateIn, db: AsyncSession = Depends(get_db),
    user: AuthedUser = Depends(require_permission("certificate:view")),
):
    result = await certificate_service.apply_for_certificate(db, user, pairing_id, body)
    return {"data": {"application": result}}


@router.patch("/v1/pairings/{pairing_id}/certificate/application")
async def review_application(
    pairing_id: str, body: CertificateApplicationReviewIn, db: AsyncSession = Depends(get_db),
    user: AuthedUser = Depends(require_permission("certificate:issue")),
):
    result = await certificate_service.review_application(db, user, pairing_id, body)
    if isinstance(result, dict):
        return {"data": {"application": result}}
    if hasattr(result, "certificate_number"):
        return {"data": {"certificate": result}}
    return {"data": {"application": result}}


@router.post("/v1/pairings/{pairing_id}/certificate/confirm", status_code=201)
async def confirm_completion(
    pairing_id: str, db: AsyncSession = Depends(get_db),
    user: AuthedUser = Depends(require_permission("certificate:issue")),
):
    result = await certificate_service.confirm_completion(db, user, pairing_id)
    return {"data": {"certificate": result}}


@router.get("/v1/pairings/{pairing_id}/certificate")
async def get_certificate(
    pairing_id: str, db: AsyncSession = Depends(get_db),
    user: AuthedUser = Depends(require_permission("certificate:view")),
):
    result = await certificate_service.get_certificate_for_pairing(db, user, pairing_id)
    return {"data": {"certificate": result}}


# Public verification — no auth dependency at all. Anyone holding a
# printed certificate can type its number in and confirm it's real,
# the same way a university's own verification portal would work.
@router.get("/v1/certificates/verify/{certificate_number}")
async def verify_certificate(certificate_number: str, db: AsyncSession = Depends(get_db)):
    result = await certificate_service.verify_certificate(db, certificate_number)
    return {"data": result}
