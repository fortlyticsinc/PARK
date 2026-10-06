"""PARK — Broadcast Router"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.auth import AuthedUser
from backend.app.core.rbac import require_permission
from backend.app.schemas.broadcast import BroadcastCreateIn
from backend.app.services import broadcast_service

router = APIRouter(prefix="/v1/broadcasts", tags=["Broadcasts"])


@router.get("")
async def list_broadcasts(db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("broadcast:view"))):
    result = await broadcast_service.list_broadcasts(db, user)
    return {"data": {"items": result}}


@router.post("", status_code=201)
async def send_broadcast(body: BroadcastCreateIn, db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("broadcast:send"))):
    result = await broadcast_service.send_broadcast(db, user, body)
    return {"data": {"broadcast": result}}
