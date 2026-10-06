"""PARK — Meetings Router (Module 3)"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import AuthedUser
from app.core.rbac import require_permission
from app.schemas.meeting import MeetingCreateIn, MeetingUpdateIn
from app.services import meeting_service

router = APIRouter(prefix="/v1/meetings", tags=["Meetings"])


@router.get("")
async def list_meetings(
    pairing_id: str | None = None, page: int = Query(default=1, ge=1), limit: int = Query(default=20, ge=1, le=100),
    upcoming_only: bool = False, db: AsyncSession = Depends(get_db),
    user: AuthedUser = Depends(require_permission("meeting:view")),
):
    result = await meeting_service.list_meetings(db, user, pairing_id, page, limit, upcoming_only)
    return {"data": result}


@router.get("/flags/inactivity")
async def get_inactivity_flags(db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("dashboard:view"))):
    flags = await meeting_service.get_inactivity_flags(db, user)
    return {"data": {"flags": flags, "count": len(flags)}}


@router.post("", status_code=201)
async def create_meeting(body: MeetingCreateIn, db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("meeting:log"))):
    result = await meeting_service.create_meeting(db, user, body)
    return {"data": {"meeting": result}}


@router.put("/{meeting_id}")
@router.patch("/{meeting_id}")
async def update_meeting(meeting_id: str, body: MeetingUpdateIn, db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("meeting:edit"))):
    result = await meeting_service.update_meeting(db, user, meeting_id, body)
    return {"data": {"meeting": result}}
