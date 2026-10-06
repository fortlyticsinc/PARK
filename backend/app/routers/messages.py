"""
PARK — Messages Router (Module 4)
========================================
/sms/bulk-send removed per the SMS -> weekly-email pivot.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.auth import AuthedUser
from backend.app.core.rbac import require_permission
from backend.app.schemas.message import MessageCreateIn
from backend.app.services import message_service

router = APIRouter(prefix="/v1/messages", tags=["Messages"])


@router.get("/conversations")
async def get_conversations(db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("message:view"))):
    result = await message_service.get_conversations(db, user)
    return {"data": {"conversations": result}}


@router.get("/conversations/{pairing_id}")
async def get_conversation(
    pairing_id: str, page: int = Query(default=1, ge=1), limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("message:view")),
):
    result = await message_service.get_conversation(db, user, pairing_id, page, limit)
    return {"data": result}


@router.post("", status_code=201)
async def send_message(body: MessageCreateIn, db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("message:send"))):
    result = await message_service.send_message(db, user, body)
    return {"data": {"message": result}}


@router.patch("/{message_id}/read")
async def mark_as_read(message_id: str, db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("message:view"))):
    await message_service.mark_as_read(db, user, message_id)
    return {"data": {"marked_read": True}}
