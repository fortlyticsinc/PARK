"""PARK — Auth Router"""

import logging
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.auth import AuthedUser, get_current_user, get_verified_supabase_identity
from backend.app.core.config import settings
from backend.app.core.supabase_admin import get_recent_auth_user
from backend.app.services import user_service
from backend.app.services.brevo_service import enroll_new_signup, send_signup_email

router = APIRouter(prefix="/v1/auth", tags=["Auth"])
logger = logging.getLogger(__name__)


@router.get("/me")
async def get_me(user: AuthedUser = Depends(get_current_user)):
    result = user_service.get_me(user)
    return {"data": result}


class SyncIn(BaseModel):
    """Student profile completion data; identity always comes from Supabase."""
    full_name: str | None = None
    matric_number: str | None = None
    department_id: UUID | None = None
    institution_id: UUID | None = None


@router.post("/sync")
async def sync_user(
    body: SyncIn,
    identity: dict = Depends(get_verified_supabase_identity),
    db: AsyncSession = Depends(get_db),
):
    result = await user_service.sync_user(
        db, identity["id"], identity["email"], body.full_name,
        body.matric_number, str(body.department_id) if body.department_id else None,
        str(body.institution_id) if body.institution_id else None,
    )
    return {"data": result}


class PasswordResetIn(BaseModel):
    password: str = Field(min_length=8, max_length=128)


@router.post("/complete-password-reset")
async def complete_password_reset(
    body: PasswordResetIn,
    identity: dict = Depends(get_verified_supabase_identity),
    db: AsyncSession = Depends(get_db),
):
    result = await user_service.complete_password_reset(db, identity["id"], identity["email"], body.password)
    return {"data": result}


class SignupEventIn(BaseModel):
    supabase_user_id: UUID


@router.post("/signup-event")
async def signup_event(body: SignupEventIn):
    """Send onboarding mail only for a recently created Supabase account."""
    auth_user = await get_recent_auth_user(str(body.supabase_user_id))
    email = auth_user.get("email") if auth_user else None
    if not email:
        return {"data": {"email_sent": False, "list_enrolled": False}}

    user_metadata = auth_user.get("user_metadata") or {}
    email_sent = False
    list_enrolled = False

    try:
        email_sent = await send_signup_email(email, user_metadata.get("full_name"))
        if settings.BREVO_SIGNUP_LIST_ID is not None:
            list_enrolled = await enroll_new_signup(email)
    except httpx.HTTPStatusError as exc:
        logger.error("Brevo signup request failed: status=%s response=%s", exc.response.status_code, exc.response.text[:500])
    except httpx.RequestError:
        logger.exception("Brevo signup request could not reach Brevo")

    return {"data": {"email_sent": email_sent, "list_enrolled": list_enrolled}}
