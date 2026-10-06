"""PARK — Dashboard Service (Module 6)"""

from datetime import datetime, timezone, timedelta
from sqlalchemy import select, func
from sqlalchemy.orm import aliased
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.core.cache import cache_get, cache_set
from backend.app.core.auth import AuthedUser
from backend.app.core.permissions import Role
from backend.app.models.pairing import Pairing, PairingStatus
from backend.app.models.chapter import Chapter, ChapterStatus
from backend.app.models.meeting import Meeting
from backend.app.models.message import Message
from backend.app.models.user import User, UserRole
from backend.app.schemas.dashboard import DashboardOverviewOut, AtRiskPairingOut, AtRiskListOut
from backend.app.schemas.workload import SupervisorWorkloadOut, SupervisorWorkloadListOut


def _resolve_scope(user: AuthedUser, department_id: str | None, institution_id: str | None):
    if department_id:
        return "department_id", department_id
    if institution_id:
        return "institution_id", institution_id
    if user.role == Role.COORDINATOR and user.department_id:
        return "department_id", user.department_id
    if user.institution_id:
        return "institution_id", user.institution_id
    return None, None


def _week_start() -> datetime:
    now = datetime.now(timezone.utc)
    return (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)


async def get_overview(db: AsyncSession, user: AuthedUser, department_id: str | None = None, institution_id: str | None = None) -> DashboardOverviewOut:
    scope_field, scope_value = _resolve_scope(user, department_id, institution_id)
    cache_key = f"dashboard:overview:{scope_field}:{scope_value}"

    cached = await cache_get(cache_key)
    if cached:
        return DashboardOverviewOut(**cached)

    pairing_filter = (getattr(Pairing, scope_field) == scope_value) if scope_field else True
    user_filter = (getattr(User, scope_field) == scope_value) if scope_field else True
    week_start = _week_start()

    total_pairings = (await db.execute(select(func.count()).select_from(Pairing).where(pairing_filter))).scalar_one()
    active_pairings = (await db.execute(select(func.count()).select_from(Pairing).where(pairing_filter, Pairing.status == PairingStatus.active))).scalar_one()
    completed_pairings = (await db.execute(select(func.count()).select_from(Pairing).where(pairing_filter, Pairing.status == PairingStatus.completed))).scalar_one()

    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.INACTIVITY_THRESHOLD_DAYS)
    at_risk_pairings = (await db.execute(
        select(func.count()).select_from(Pairing).where(
            pairing_filter, Pairing.status == PairingStatus.active,
            (Pairing.last_meeting_date.is_(None)) | (Pairing.last_meeting_date < cutoff),
        )
    )).scalar_one()

    total_students = (await db.execute(select(func.count()).select_from(User).where(user_filter, User.role == UserRole.student))).scalar_one()
    total_supervisors = (await db.execute(select(func.count()).select_from(User).where(user_filter, User.role == UserRole.supervisor))).scalar_one()

    chapters_submitted_this_week = (await db.execute(
        select(func.count()).select_from(Chapter).join(Pairing, Chapter.pairing_id == Pairing.id)
        .where(pairing_filter, Chapter.submitted_at >= week_start)
    )).scalar_one()

    chapters_approved_this_week = (await db.execute(
        select(func.count()).select_from(Chapter).join(Pairing, Chapter.pairing_id == Pairing.id)
        .where(pairing_filter, Chapter.status == ChapterStatus.approved, Chapter.reviewed_at >= week_start)
    )).scalar_one()

    pending_reviews = (await db.execute(
        select(func.count()).select_from(Chapter).join(Pairing, Chapter.pairing_id == Pairing.id)
        .where(pairing_filter, Chapter.status.in_([ChapterStatus.submitted, ChapterStatus.resubmitted]))
    )).scalar_one()

    meetings_logged_this_week = (await db.execute(
        select(func.count()).select_from(Meeting).join(Pairing, Meeting.pairing_id == Pairing.id)
        .where(pairing_filter, Meeting.created_at >= week_start)
    )).scalar_one()

    messages_sent_this_week = (await db.execute(
        select(func.count()).select_from(Message).join(Pairing, Message.pairing_id == Pairing.id)
        .where(pairing_filter, Message.created_at >= week_start)
    )).scalar_one()

    result = DashboardOverviewOut(
        total_pairings=total_pairings, active_pairings=active_pairings, at_risk_pairings=at_risk_pairings,
        completed_pairings=completed_pairings, total_students=total_students, total_supervisors=total_supervisors,
        chapters_submitted_this_week=chapters_submitted_this_week, chapters_approved_this_week=chapters_approved_this_week,
        pending_reviews=pending_reviews, meetings_logged_this_week=meetings_logged_this_week,
        messages_sent_this_week=messages_sent_this_week, last_updated=datetime.now(timezone.utc).isoformat(),
    )

    await cache_set(cache_key, result.model_dump(), settings.DASHBOARD_CACHE_TTL_SECONDS)
    return result


async def get_at_risk(db: AsyncSession, user: AuthedUser, department_id: str | None = None, limit: int = 50) -> AtRiskListOut:
    scope_field, scope_value = _resolve_scope(user, department_id, None)
    pairing_filter = (getattr(Pairing, scope_field) == scope_value) if scope_field else True

    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.INACTIVITY_THRESHOLD_DAYS)
    latest_chapter = (
        select(
            Chapter.pairing_id.label("pairing_id"),
            Chapter.chapter_number.label("chapter_number"),
            Chapter.status.label("status"),
            func.row_number().over(
                partition_by=Chapter.pairing_id,
                order_by=(Chapter.chapter_number.desc(), Chapter.version.desc()),
            ).label("row_number"),
        )
        .subquery()
    )
    student = aliased(User)
    supervisor = aliased(User)
    rows = (await db.execute(
        select(
            Pairing, student.full_name.label("student_name"), student.email.label("student_email"),
            student.phone.label("student_phone"), supervisor.full_name.label("supervisor_name"),
            supervisor.email.label("supervisor_email"), supervisor.phone.label("supervisor_phone"),
            latest_chapter.c.chapter_number, latest_chapter.c.status.label("chapter_status"),
        )
        .join(student, Pairing.student_id == student.id)
        .join(supervisor, Pairing.supervisor_id == supervisor.id)
        .outerjoin(latest_chapter, (latest_chapter.c.pairing_id == Pairing.id) & (latest_chapter.c.row_number == 1))
        .where(
            pairing_filter, Pairing.status == PairingStatus.active,
            (Pairing.last_meeting_date.is_(None)) | (Pairing.last_meeting_date < cutoff),
        )
        .order_by(Pairing.last_meeting_date.asc().nullsfirst())
        .limit(limit)
    )).all()

    now = datetime.now(timezone.utc)
    items = []

    for row in rows:
        p = row.Pairing
        days_since = (now - p.last_meeting_date).days if p.last_meeting_date else 9999
        chapter_status = row.chapter_status.value if hasattr(row.chapter_status, "value") else row.chapter_status
        items.append(AtRiskPairingOut(
            pairing_id=str(p.id), student_name=row.student_name or "Unknown",
            student_email=row.student_email or "", student_phone=row.student_phone,
            supervisor_name=row.supervisor_name or "Unknown",
            supervisor_email=row.supervisor_email or "", supervisor_phone=row.supervisor_phone,
            days_since_last_meeting=days_since, last_meeting_date=p.last_meeting_date.isoformat() if p.last_meeting_date else None,
            current_chapter=row.chapter_number or 0,
            chapter_status=chapter_status or "not_started",
        ))

    items.sort(key=lambda i: i.days_since_last_meeting, reverse=True)
    return AtRiskListOut(items=items, total=len(items))


async def get_supervisor_workload(db: AsyncSession, user: AuthedUser) -> SupervisorWorkloadListOut:
    """Return workload rows visible to an admin or department coordinator."""
    now = datetime.now(timezone.utc)
    pairings = (
        select(Pairing.supervisor_id.label("supervisor_id"), func.count().label("active_pairings"))
        .where(Pairing.status == PairingStatus.active, Pairing.deleted_at.is_(None))
        .group_by(Pairing.supervisor_id)
        .subquery()
    )
    chapters = (
        select(
            Chapter.supervisor_id.label("supervisor_id"),
            func.count().filter(Chapter.status.in_([ChapterStatus.submitted, ChapterStatus.resubmitted])).label("pending_chapters"),
            func.count().filter(Chapter.status == ChapterStatus.approved).label("approved_chapters"),
        )
        .group_by(Chapter.supervisor_id)
        .subquery()
    )
    meetings = (
        select(
            Meeting.supervisor_id.label("supervisor_id"),
            func.count().filter(Meeting.scheduled_at > now).label("upcoming_meetings"),
            func.max(Meeting.scheduled_at).label("last_activity_at"),
        )
        .group_by(Meeting.supervisor_id)
        .subquery()
    )
    query = (
        select(
            User,
            func.coalesce(pairings.c.active_pairings, 0).label("active_pairings"),
            func.coalesce(chapters.c.pending_chapters, 0).label("pending_chapters"),
            func.coalesce(chapters.c.approved_chapters, 0).label("approved_chapters"),
            func.coalesce(meetings.c.upcoming_meetings, 0).label("upcoming_meetings"),
            meetings.c.last_activity_at,
        )
        .outerjoin(pairings, pairings.c.supervisor_id == User.id)
        .outerjoin(chapters, chapters.c.supervisor_id == User.id)
        .outerjoin(meetings, meetings.c.supervisor_id == User.id)
        .where(User.role == UserRole.supervisor, User.is_active.is_(True))
    )
    if user.role == Role.COORDINATOR:
        query = query.where(User.department_id == user.department_id)
    rows = (await db.execute(query.order_by(User.full_name))).all()

    items = []
    for row in rows:
        supervisor = row.User
        items.append(SupervisorWorkloadOut(
            supervisor_id=str(supervisor.id), supervisor_name=supervisor.full_name,
            supervisor_email=supervisor.email,
            department_id=str(supervisor.department_id) if supervisor.department_id else None,
            active_pairings=row.active_pairings, pending_chapters=row.pending_chapters,
            approved_chapters=row.approved_chapters, upcoming_meetings=row.upcoming_meetings,
            last_activity_at=row.last_activity_at.isoformat() if row.last_activity_at else None,
        ))

    return SupervisorWorkloadListOut(items=items, total=len(rows))
