import asyncio
import base64
import hashlib
import logging

from cryptography.fernet import Fernet

from backend.app.core.auth import AuthedUser
from backend.app.core.cache import cache_get, cache_set
from backend.app.core.config import settings
from backend.app.core.database import AsyncSessionLocal, dispose_engine
from backend.app.core.error_handler import AppError
from backend.app.jobs.celery_app import celery_app
from backend.app.services.user_service import bulk_import_users

logger = logging.getLogger("p_ark.jobs.bulk_import")
JOB_CACHE_PREFIX = "bulk_import_job:"
JOB_TTL_SECONDS = 86400


def _fernet() -> Fernet:
    secret = settings.BULK_IMPORT_ENCRYPTION_KEY or settings.JWT_SECRET
    if len(secret.encode()) < 32 or "change-me" in secret.lower() or "dummy" in secret.lower():
        raise RuntimeError("Configure a strong JWT_SECRET or BULK_IMPORT_ENCRYPTION_KEY")
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
    return Fernet(key)


def encrypt_import_file(file_bytes: bytes) -> str:
    return _fernet().encrypt(file_bytes).decode("ascii")


@celery_app.task(name="app.jobs.bulk_import.process_user_import")
def process_user_import(job_id: str, filename: str, encrypted_file: str, requesting_user: dict) -> None:
    asyncio.run(_process_user_import(job_id, filename, encrypted_file, requesting_user))


async def _process_user_import(job_id: str, filename: str, encrypted_file: str, requesting_user: dict) -> None:
    cache_key = f"{JOB_CACHE_PREFIX}{job_id}"
    job = await cache_get(cache_key)
    if not job:
        return

    await cache_set(cache_key, {**job, "status": "processing"}, JOB_TTL_SECONDS)
    try:
        file_bytes = _fernet().decrypt(encrypted_file.encode("ascii"))
        user = AuthedUser.model_validate(requesting_user)
        async with AsyncSessionLocal() as db:
            result = await bulk_import_users(db, user, filename, file_bytes)
        job = await cache_get(cache_key) or job
        await cache_set(
            cache_key,
            {**job, "status": "completed", "result": result.model_dump(mode="json")},
            JOB_TTL_SECONDS,
        )
    except AppError as exc:
        job = await cache_get(cache_key) or job
        await cache_set(cache_key, {**job, "status": "failed", "error_message": exc.message}, JOB_TTL_SECONDS)
    except Exception:
        logger.exception("User bulk import job %s failed", job_id)
        job = await cache_get(cache_key) or job
        await cache_set(
            cache_key,
            {**job, "status": "failed", "error_message": "The import job failed unexpectedly."},
            JOB_TTL_SECONDS,
        )
    finally:
        await dispose_engine()