"""PARK — Repository Service (Module 5)"""

import secrets
import hashlib
import logging
from datetime import datetime, timezone
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.cache import (
    cache_get, cache_set, cache_hash_increment_from, cache_hash_get_all,
    cache_acquire_lock, cache_release_lock,
)
from app.core.database import AsyncSessionLocal
from app.core.auth import AuthedUser
from app.core.permissions import Role
from app.core.error_handler import NotFoundError, PermissionError_, ValidationAppError, FeatureDisabledError
from app.models.repository import RepositoryProject, RepositoryDownloadLog, RepoStatus
from app.models.pairing import Pairing
from app.models.chapter import Chapter, ChapterStatus
from app.models.user import User
from app.models.institution import Institution
from app.schemas.repository import (
    RepositoryProjectOut, RepositoryProjectDetailOut, SearchResultsOut,
    DownloadUrlOut, RepositoryStatusUpdateIn,
)

logger = logging.getLogger("p_ark.repository")
DOWNLOAD_URL_TTL_SECONDS = 15 * 60
VIEW_TOTALS_KEY = "repository:view_totals"
VIEW_COUNT_FLUSH_LOCK_KEY = "repository:view_flush_lock"


async def list_academic_years(db: AsyncSession) -> list[str]:
    """Return current institution sessions plus years with published projects."""
    configured_rows = (await db.execute(select(Institution.settings))).scalars().all()
    configured_years = {
        settings.get("academic_session")
        for settings in configured_rows
        if settings and settings.get("academic_session")
    }
    published_years = (await db.execute(
        select(RepositoryProject.academic_year)
        .where(RepositoryProject.status == RepoStatus.published)
        .distinct()
    )).scalars().all()
    return sorted(configured_years.union(published_years), reverse=True)


async def search_projects(
    db: AsyncSession, q: str | None = None, academic_year: str | None = None,
    department_id: str | None = None, sort_by: str = "relevance", page: int = 1, limit: int = 20,
) -> SearchResultsOut:
    cache_key = None
    if not q:
        cache_key = f"repo:browse:{academic_year}:{department_id}:{sort_by}:{page}:{limit}"
        cached = await cache_get(cache_key)
        if cached:
            return SearchResultsOut(**cached)

    query = select(RepositoryProject).where(RepositoryProject.status == RepoStatus.published)

    if academic_year:
        query = query.where(RepositoryProject.academic_year == academic_year)
    if department_id:
        query = query.where(RepositoryProject.department_id == department_id)

    if q:
        query = query.where(RepositoryProject.search_vector.op("@@")(func.plainto_tsquery("english", q)))

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()

    if sort_by == "newest":
        query = query.order_by(RepositoryProject.approved_at.desc())
    elif sort_by == "most_viewed":
        query = query.order_by(RepositoryProject.view_count.desc())
    elif q:
        query = query.order_by(func.ts_rank(RepositoryProject.search_vector, func.plainto_tsquery("english", q)).desc())
    else:
        query = query.order_by(RepositoryProject.approved_at.desc())

    offset = (page - 1) * limit
    rows = (await db.execute(query.offset(offset).limit(limit))).scalars().all()

    items = [
        RepositoryProjectOut(id=str(r.id), title=r.title, student_name=r.student_name, academic_year=r.academic_year,
            keywords=r.keywords, view_count=r.view_count, download_count=r.download_count)
        for r in rows
    ]

    result = SearchResultsOut(items=items, total=total, page=page, limit=limit, query=q)

    if cache_key:
        await cache_set(cache_key, result.model_dump(), settings.DASHBOARD_CACHE_TTL_SECONDS)

    return result


async def get_project(db: AsyncSession, project_id: str) -> RepositoryProjectDetailOut:
    project = (await db.execute(select(RepositoryProject).where(RepositoryProject.id == project_id))).scalar_one_or_none()

    if project is None or project.status != RepoStatus.published:
        raise NotFoundError("Project not found")

    view_count = await cache_hash_increment_from(VIEW_TOTALS_KEY, str(project.id), project.view_count)
    if view_count is None:
        await db.execute(
            update(RepositoryProject)
            .where(RepositoryProject.id == project.id)
            .values(view_count=RepositoryProject.view_count + 1)
        )
        await db.commit()
        view_count = project.view_count + 1
    else:
        view_count = max(project.view_count, view_count)

    return RepositoryProjectDetailOut(
        id=str(project.id), title=project.title, student_name=project.student_name,
        student_matric=project.student_matric, supervisor_name=project.supervisor_name,
        academic_year=project.academic_year, abstract=project.abstract, keywords=project.keywords,
        department_id=str(project.department_id),
        chapter_count=len([f for f in (project.chapter_files or []) if f]),
        final_copy_url=project.full_thesis_url,
        view_count=view_count, download_count=project.download_count,
    )


async def flush_view_counts() -> None:
    """Persist buffered public views without serializing requests on project rows."""
    lock_token = secrets.token_urlsafe(18)
    if not await cache_acquire_lock(VIEW_COUNT_FLUSH_LOCK_KEY, lock_token, 60):
        return

    try:
        pending = {
            project_id: int(count)
            for project_id, count in (await cache_hash_get_all(VIEW_TOTALS_KEY)).items()
            if int(count) > 0
        }
        if not pending:
            return

        async with AsyncSessionLocal() as db:
            for project_id, count in pending.items():
                await db.execute(
                    update(RepositoryProject)
                    .where(RepositoryProject.id == project_id)
                    .values(view_count=func.greatest(RepositoryProject.view_count, count))
                )
            await db.commit()
    except Exception:
        logger.exception("Could not flush buffered repository views")
    finally:
        await cache_release_lock(VIEW_COUNT_FLUSH_LOCK_KEY, lock_token)


async def get_download_url(
    db: AsyncSession, user: AuthedUser, project_id: str,
    ip_address: str | None, user_agent: str | None,
) -> DownloadUrlOut:
    """
    Returns a one-time-use link that expires in 15 minutes — enforced by
    US, not by decoration. The link points to OUR OWN redirect endpoint
    (GET /v1/repository/download-file/{token}), not directly at
    Cloudinary. That endpoint looks the token up in Redis; if it's
    there, it 302-redirects to the real file and immediately deletes
    the token so it can't be reused. If it's missing or expired, the
    person gets a 410 Gone.

    Why not a Cloudinary-native signed/expiring URL? That requires the
    asset to be uploaded with type=authenticated AND Cloudinary's
    "token-based authentication" enabled on the account (an extra
    Console setting + signing key most fresh accounts don't have on by
    default). Doing expiry ourselves with Redis — which this app
    already depends on for dashboard caching — means the 15-minute
    limit is real today, on any Cloudinary plan, without extra setup.
    """
    project = (await db.execute(select(RepositoryProject).where(RepositoryProject.id == project_id))).scalar_one_or_none()
    if project is None or project.status != RepoStatus.published:
        raise NotFoundError("Project not found")

    if not project.full_thesis_url:
        raise ValidationAppError("The complete final project copy is not available yet")

    real_file_url = project.full_thesis_url

    # A long, unguessable, single-use token. 32 random bytes ≈ 43
    # URL-safe characters — brute-forcing this within a 15-minute
    # window is not practically feasible.
    token = secrets.token_urlsafe(32)
    await cache_set(
        f"download_token:{token}",
        {"url": real_file_url, "user_id": user.id, "project_id": str(project.id)},
        ttl_seconds=DOWNLOAD_URL_TTL_SECONDS,
    )

    download_url = f"{settings.API_BASE_URL}/v1/repository/download-file/{token}"

    project.download_count += 1
    log = RepositoryDownloadLog(
        project_id=project.id,
        ip_hash=hashlib.sha256(ip_address.encode()).hexdigest() if ip_address else None,
        user_agent_hash=hashlib.sha256(user_agent.encode()).hexdigest() if user_agent else None,
    )
    db.add(log)
    await db.commit()

    return DownloadUrlOut(download_url=download_url, expires_in=DOWNLOAD_URL_TTL_SECONDS)


async def redeem_download_token(token: str) -> str:
    """
    Called by the public redirect endpoint. Returns the real Cloudinary
    URL while the short-lived token remains valid. A browser may issue
    more than one request while opening a document, so burning the token
    on the first redirect incorrectly produced 410 responses for valid
    final-copy downloads.
    """
    record = await cache_get(f"download_token:{token}")
    if not record:
        raise FeatureDisabledError("This download link has expired or was already used — please request a new one")

    return record["url"]


async def update_status(db: AsyncSession, user: AuthedUser, project_id: str, data: RepositoryStatusUpdateIn) -> RepositoryProjectOut:
    project = (await db.execute(select(RepositoryProject).where(RepositoryProject.id == project_id))).scalar_one_or_none()
    if project is None:
        raise NotFoundError("Project not found")

    if user.role != Role.ADMIN and user.department_id != str(project.department_id):
        raise PermissionError_("You can only manage projects in your own department")

    project.status = RepoStatus(data.status)
    await db.commit()
    await db.refresh(project)

    return RepositoryProjectOut(id=str(project.id), title=project.title, student_name=project.student_name,
        academic_year=project.academic_year, keywords=project.keywords,
        view_count=project.view_count, download_count=project.download_count)


async def auto_create_from_pairing(db: AsyncSession, pairing_id: str) -> None:
    """
    Called after ANY chapter reaches 'approved' (not just chapter 5 —
    see the fixed trigger in chapter_service.review_chapter). Only
    actually creates and PUBLISHES the repository entry once every one
    of the 5 chapters is approved on its latest version. Publishing
    early with placeholder/missing chapters would put an incomplete
    project in front of the public search — before it fixed, this
    fired unconditionally on chapter 5 alone, regardless of chapters
    1-4's status, and never re-checked once they caught up.
    """
    try:
        existing = (await db.execute(select(RepositoryProject).where(RepositoryProject.pairing_id == pairing_id))).scalar_one_or_none()
        if existing:
            return

        pairing = (await db.execute(select(Pairing).where(Pairing.id == pairing_id))).scalar_one_or_none()
        if pairing is None:
            return

        student = (await db.execute(select(User).where(User.id == pairing.student_id))).scalar_one_or_none()
        supervisor = (await db.execute(select(User).where(User.id == pairing.supervisor_id))).scalar_one_or_none()
        if not student or not supervisor or not student.matric_number:
            logger.warning(f"Skipping repo auto-create for pairing {pairing_id}: missing student/supervisor/matric")
            return

        chapter_files = []
        for n in range(1, 6):
            chapter = (await db.execute(
                select(Chapter).where(Chapter.pairing_id == pairing_id, Chapter.chapter_number == n)
                .order_by(Chapter.version.desc()).limit(1)
            )).scalar_one_or_none()
            # Latest version must exist AND be approved — a chapter
            # that's submitted-but-pending, or was approved then
            # reverted/resubmitted, does not count.
            if chapter is None or chapter.status != ChapterStatus.approved:
                return  # not ready yet — this function will be called
                        # again the next time any chapter is approved
            chapter_files.append(chapter.file_public_id)

        project = RepositoryProject(
            pairing_id=pairing.id, student_name=student.full_name, student_matric=student.matric_number,
            student_email=student.email, supervisor_name=supervisor.full_name, supervisor_email=supervisor.email,
            title=pairing.project_title or "Untitled Project", department_id=pairing.department_id,
            institution_id=pairing.institution_id, academic_year=pairing.academic_year,
            chapter_files=chapter_files, status=RepoStatus.published, approved_at=datetime.now(timezone.utc),
        )
        db.add(project)
        await db.commit()
        logger.info(f"Auto-created repository entry for pairing {pairing_id}")

    except Exception as e:
        logger.error(f"Failed to auto-create repository entry for pairing {pairing_id}: {e}")
        await db.rollback()
