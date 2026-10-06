"""PARK — Health Router"""

from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(tags=["system"])


@router.get("/health")
async def health_check():
    return {"status": "ok", "env": settings.ENV}