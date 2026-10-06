"""Local Supabase Auth admin operations."""

from datetime import datetime, timedelta, timezone

import httpx

from app.core.config import settings
from app.core.error_handler import ConflictError, ValidationAppError


async def get_recent_auth_user(user_id: str) -> dict | None:
    """Return a newly created Supabase user, or None if it is not recent."""
    if (
        not settings.SUPABASE_SERVICE_ROLE_KEY
        or settings.SUPABASE_SERVICE_ROLE_KEY.startswith("local-")
        or settings.SUPABASE_SERVICE_ROLE_KEY == "your-service-role-key"
    ):
        raise ValidationAppError("Configure the Supabase service-role key before processing signup events")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                headers={
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                },
            )
    except httpx.RequestError as exc:
        raise ValidationAppError("Supabase Auth is unavailable") from exc

    if response.status_code == 404:
        return None
    if response.status_code >= 400:
        raise ValidationAppError("Could not verify signup with Supabase Auth")

    user = response.json()
    created_at = user.get("created_at")
    if not created_at:
        return None

    created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    if created < datetime.now(timezone.utc) - timedelta(minutes=15):
        return None
    return user


async def create_auth_user(email: str, password: str, full_name: str) -> str:
    """Create a confirmed Supabase Auth user and return its UUID."""
    if (
        not settings.SUPABASE_SERVICE_ROLE_KEY
        or settings.SUPABASE_SERVICE_ROLE_KEY.startswith("local-")
        or settings.SUPABASE_SERVICE_ROLE_KEY == "your-service-role-key"
    ):
        raise ValidationAppError("Configure the Supabase service-role key before creating accounts")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{settings.SUPABASE_URL}/auth/v1/admin/users",
                headers={
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {"full_name": full_name},
                },
            )
    except httpx.RequestError as exc:
        raise ValidationAppError(f"Supabase Auth is unavailable: {exc}")

    if response.status_code == 422:
        raise ConflictError(f"An Auth account with email {email} already exists")
    if response.status_code >= 400:
        detail = response.json().get("msg", "Supabase Auth rejected the account")
        raise ValidationAppError(detail)

    user_id = response.json().get("id")
    if not user_id:
        raise ValidationAppError("Supabase Auth returned no user id")
    return user_id


async def update_auth_user_password(user_id: str, password: str) -> None:
    """Update a provisioned Supabase Auth user's password via the admin API."""
    if (
        not settings.SUPABASE_SERVICE_ROLE_KEY
        or settings.SUPABASE_SERVICE_ROLE_KEY.startswith("local-")
        or settings.SUPABASE_SERVICE_ROLE_KEY == "your-service-role-key"
    ):
        raise ValidationAppError("Configure the Supabase service-role key before changing provisioned passwords")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.put(
                f"{settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                headers={
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                    "Content-Type": "application/json",
                },
                json={"password": password},
            )
    except httpx.RequestError as exc:
        raise ValidationAppError("Supabase Auth is unavailable") from exc

    if response.status_code >= 400:
        raise ValidationAppError("Supabase rejected the new password")


async def delete_auth_user(user_id: str) -> None:
    """Best-effort rollback when local database provisioning fails."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        await client.delete(
            f"{settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}",
            headers={
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            },
        )
