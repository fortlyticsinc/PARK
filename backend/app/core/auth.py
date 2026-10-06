"""
PARK — Authentication
==========================
"""

import asyncio
import time

import httpx
import jwt
from fastapi import Depends, Header, Request
from jwt.exceptions import InvalidTokenError
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.core.cache import cache_get, cache_set
from backend.app.core.database import get_db
from backend.app.core.error_handler import AuthError
from backend.app.core.permissions import Role


class AuthedUser(BaseModel):
    id: str
    supabase_uid: str
    email: str
    full_name: str
    role: Role
    department_id: str | None
    institution_id: str | None
    is_active: bool = True
    must_change_password: bool = False

    class Config:
        from_attributes = True


_JWKS_CACHE: dict | None = None
_JWKS_CACHE_EXPIRES_AT = 0.0
_JWKS_LOCK = asyncio.Lock()
_JWKS_CACHE_TTL_SECONDS = 3600
_AUTH_USER_CACHE_TTL_SECONDS = 15


async def _get_supabase_jwks(force_refresh: bool = False) -> dict:
    global _JWKS_CACHE, _JWKS_CACHE_EXPIRES_AT
    if not force_refresh and _JWKS_CACHE and time.monotonic() < _JWKS_CACHE_EXPIRES_AT:
        return _JWKS_CACHE

    async with _JWKS_LOCK:
        if not force_refresh and _JWKS_CACHE and time.monotonic() < _JWKS_CACHE_EXPIRES_AT:
            return _JWKS_CACHE
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
                )
                response.raise_for_status()
                jwks = response.json()
        except (httpx.RequestError, httpx.HTTPStatusError, ValueError) as exc:
            raise AuthError("Could not verify session, please log in again") from exc

        if not isinstance(jwks, dict) or not isinstance(jwks.get("keys"), list):
            raise AuthError("Could not verify session, please log in again")
        _JWKS_CACHE = jwks
        _JWKS_CACHE_EXPIRES_AT = time.monotonic() + _JWKS_CACHE_TTL_SECONDS
        return jwks


async def _verify_supabase_jwt(token: str) -> dict:
    try:
        header = jwt.get_unverified_header(token)
        algorithm = header.get("alg")
        if algorithm == "HS256":
            signing_key = settings.JWT_SECRET
            if len(signing_key.encode()) < 32 or "change-me" in signing_key.lower() or "dummy" in signing_key.lower():
                raise AuthError("Could not verify session, please log in again")
        elif algorithm in {"RS256", "ES256", "EdDSA"}:
            kid = header.get("kid")
            jwks = await _get_supabase_jwks()
            jwk = next((key for key in jwks["keys"] if key.get("kid") == kid), None)
            if jwk is None:
                jwks = await _get_supabase_jwks(force_refresh=True)
                jwk = next((key for key in jwks["keys"] if key.get("kid") == kid), None)
            if jwk is None:
                raise InvalidTokenError("Unknown signing key")
            signing_key = jwt.PyJWK.from_dict(jwk).key
        else:
            raise InvalidTokenError("Unsupported signing algorithm")

        claims = jwt.decode(
            token,
            signing_key,
            algorithms=[algorithm],
            audience="authenticated",
            issuer=f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1",
            options={"require": ["exp", "iat", "sub", "email"]},
        )
    except AuthError:
        raise
    except (InvalidTokenError, TypeError, ValueError) as exc:
        raise AuthError() from exc

    if claims.get("email_verified") is False:
        raise AuthError("Please verify your email address before continuing")
    return claims


def verified_supabase_identity(payload: dict) -> dict[str, str]:
    """Extract identity only when Supabase confirms the email address."""
    supabase_uid = payload.get("id")
    email = payload.get("email")
    if not supabase_uid or not email:
        raise AuthError()
    if not payload.get("email_confirmed_at"):
        raise AuthError("Please verify your email address before continuing")
    return {"id": str(supabase_uid), "email": str(email).strip().lower()}


async def _verify_supabase_token(token: str) -> dict:
    url = f"{settings.SUPABASE_URL}/auth/v1/user"
    headers = {"Authorization": f"Bearer {token}", "apikey": settings.SUPABASE_ANON_KEY}
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            response = await client.get(url, headers=headers)
        except httpx.RequestError:
            raise AuthError("Could not verify session, please log in again")

    if response.status_code != 200:
        raise AuthError()

    return response.json()


async def get_verified_supabase_identity(
    authorization: str | None = Header(default=None),
) -> dict:
    """
    Used ONLY by POST /v1/auth/sync. Verifies the bearer token against
    Supabase itself and returns the VERIFIED {id, email} — deliberately
    separate from get_current_user() because sync is called for a
    brand-new signup where no public.users row exists yet (so
    get_current_user's "look up an existing row or 401" behavior
    doesn't fit).

    CRITICAL: the caller must NEVER be allowed to pass their own
    supabase_uid/email as request-body fields and have those trusted —
    that was a real, exploitable account-takeover bug: since every
    staff account has supabase_uid = NULL until first login, an
    unauthenticated POST with an arbitrary {supabase_uid, email} could
    link an attacker's own Supabase identity to ANY existing account,
    including admin. The fix is this function existing at all — it's
    the only source of truth for identity on the sync path, and it can
    only ever return the identity Supabase itself just verified for
    the token actually presented.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise AuthError("No session found, please log in")

    token = authorization.removeprefix("Bearer ").strip()

    supabase_payload = await _verify_supabase_token(token)
    return {**verified_supabase_identity(supabase_payload), "email_verified": True}


async def get_current_user(
    request: Request,
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> AuthedUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise AuthError("No session found, please log in")

    token = authorization.removeprefix("Bearer ").strip()

    supabase_payload = await _verify_supabase_jwt(token)
    supabase_uid = str(supabase_payload["sub"])

    from backend.app.models.user import User

    cached_user = await cache_get(f"auth:user:{supabase_uid}")
    try:
        user = AuthedUser.model_validate(cached_user) if cached_user else None
    except Exception:
        user = None

    if user is None:
        result = await db.execute(select(User).where(User.supabase_uid == supabase_uid))
        user_row = result.scalar_one_or_none()
        if user_row is None:
            raise AuthError("Account not fully set up yet, contact your coordinator")
        user = AuthedUser(
            id=str(user_row.id),
            supabase_uid=str(user_row.supabase_uid),
            email=user_row.email,
            full_name=user_row.full_name,
            role=Role(user_row.role.value),
            department_id=str(user_row.department_id) if user_row.department_id else None,
            institution_id=str(user_row.institution_id) if user_row.institution_id else None,
            is_active=user_row.is_active,
            must_change_password=user_row.must_change_password,
        )
        await cache_set(
            f"auth:user:{supabase_uid}", user.model_dump(mode="json"), _AUTH_USER_CACHE_TTL_SECONDS
        )

    if not user.is_active:
        raise AuthError("Your account is inactive. Contact your coordinator or administrator.")
    if user.must_change_password and request.url.path != "/v1/auth/me":
        raise AuthError("Change your temporary password before using PARK")

    return user
