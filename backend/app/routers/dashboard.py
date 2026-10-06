"""PARK — Dashboard Router (Module 6)"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.auth import AuthedUser
from backend.app.core.rbac import require_permission
from backend.app.core.error_handler import FeatureDisabledError
from backend.app.services import dashboard_service

router = APIRouter(prefix="/v1/dashboard", tags=["Dashboard"])


@router.get("/overview")
async def get_overview(
    department_id: str | None = None, institution_id: str | None = None,
    db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("dashboard:view")),
):
    result = await dashboard_service.get_overview(db, user, department_id, institution_id)
    return {"data": result}


@router.get("/at-risk")
async def get_at_risk(
    department_id: str | None = None, limit: int = 50,
    db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("dashboard:view")),
):
    result = await dashboard_service.get_at_risk(db, user, department_id, limit)
    return {"data": result}


@router.get("/supervisor-workload")
async def get_supervisor_workload(
    db: AsyncSession = Depends(get_db),
    user: AuthedUser = Depends(require_permission("dashboard:view")),
):
    result = await dashboard_service.get_supervisor_workload(db, user)
    return {"data": result}


@router.post("/sms-blast")
async def sms_blast_disabled(user: AuthedUser = Depends(require_permission("dashboard:view"))):
    raise FeatureDisabledError(
        "SMS blasts have been disabled to control costs. Supervisors now "
        "receive a weekly email digest every Monday covering new submissions "
        "and at-risk pairings instead."
    )
