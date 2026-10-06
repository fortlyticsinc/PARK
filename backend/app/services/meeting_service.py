"""
PARK — Meeting Service (Module 3, redesigned)
====================================================
Supervisors schedule meetings; students only view them. A meeting with
pairing_id = NULL is visible to every one of the supervisor's active
students (computed live, same pattern as broadcast_service.py — no
membership table to keep in sync). Scheduling also drops a matching
BroadcastMessage so the meeting shows up in the students' existing
announcements feed without building a second notification system.
"""

from datetime import datetime, timezone, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.core.auth import AuthedUser
from backend.app.core.permissions import Role
from backend.app.core.error_handler import NotFoundError, PermissionError_, ValidationAppError
from backend.app.models.meeting import Meeting, MeetingType
from backend.app.models.pairing import Pairing, PairingStatus
from backend.app.models.user import User
from backend.app.models.broadcast import BroadcastMessage
from backend.app.schemas.meeting import (
    MeetingOut, PaginatedMeetingsOut, MeetingCreateIn, MeetingUpdateIn, InactivityFlagOut,
)


async def _to_meeting_out(db: AsyncSession, meeting: Meeting) -> MeetingOut:
    supervisor = (await db.execute(select(User).where(User.id == meeting.supervisor_id))).scalar_one_or_none()

    student_name = None
    if meeting.pairing_id:
        pairing = (await db.execute(select(Pairing).where(Pairing.id == meeting.pairing_id))).scalar_one_or_none()
        if pairing:
            student = (await db.execute(select(User).where(User.id == pairing.student_id))).scalar_one_or_none()
            student_name = student.full_name if student else None

    return MeetingOut(
        id=str(meeting.id), supervisor_id=str(meeting.supervisor_id),
        supervisor_name=supervisor.full_name if supervisor else "Unknown",
        pairing_id=str(meeting.pairing_id) if meeting.pairing_id else None,
        student_name=student_name, scheduled_at=meeting.scheduled_at,
        venue=meeting.venue, agenda=meeting.agenda, meeting_type=meeting.meeting_type.value,
        duration_minutes=meeting.duration_minutes,
        is_upcoming=meeting.scheduled_at > datetime.now(timezone.utc),
        created_at=meeting.created_at,
    )


async def list_meetings(
    db: AsyncSession, user: AuthedUser, pairing_id: str | None = None,
    page: int = 1, limit: int = 20, upcoming_only: bool = False,
) -> PaginatedMeetingsOut:
    query = select(Meeting)

    if user.role == Role.SUPERVISOR:
        # A supervisor sees everything they've scheduled.
        query = query.where(Meeting.supervisor_id == user.id)

    elif user.role == Role.STUDENT:
        # A student sees: cohort-wide meetings from the supervisor(s) on
        # their active pairing(s), PLUS any 1-on-1 meeting scheduled
        # specifically for their pairing.
        my_pairings = (
            await db.execute(
                select(Pairing.id, Pairing.supervisor_id)
                .where(Pairing.student_id == user.id, Pairing.status == PairingStatus.active)
            )
        ).all()
        if not my_pairings:
            return PaginatedMeetingsOut(items=[], total=0, page=page, limit=limit, pages=1)

        my_pairing_ids = [str(p.id) for p in my_pairings]
        my_supervisor_ids = [str(p.supervisor_id) for p in my_pairings]

        query = query.where(
            Meeting.supervisor_id.in_(my_supervisor_ids)
            & (Meeting.pairing_id.is_(None) | Meeting.pairing_id.in_(my_pairing_ids))
        )

    elif user.role == Role.COORDINATOR:
        # Coordinators see meetings from supervisors in their department.
        query = query.join(User, Meeting.supervisor_id == User.id).where(User.department_id == user.department_id)

    # Admins get no extra filter — full, institution-wide visibility.

    if pairing_id:
        query = query.where(Meeting.pairing_id == pairing_id)

    if upcoming_only:
        query = query.where(Meeting.scheduled_at > datetime.now(timezone.utc))

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * limit
    rows = (
        await db.execute(query.order_by(Meeting.scheduled_at.asc()).offset(offset).limit(limit))
    ).scalars().all()

    items = [await _to_meeting_out(db, m) for m in rows]
    pages = (total + limit - 1) // limit if total > 0 else 1

    return PaginatedMeetingsOut(items=items, total=total, page=page, limit=limit, pages=pages)


async def create_meeting(db: AsyncSession, user: AuthedUser, data: MeetingCreateIn) -> MeetingOut:
    if user.role != Role.SUPERVISOR and user.role != Role.ADMIN:
        raise PermissionError_("Only supervisors can schedule meetings")

    # Defense-in-depth: the schema validator already checked this, but a
    # slow request or a client with a skewed clock could theoretically
    # slip through — re-check against the server's clock right before write.
    now = datetime.now(timezone.utc)
    if data.scheduled_at < now + timedelta(hours=settings.MEETING_MIN_NOTICE_HOURS):
        raise ValidationAppError(
            f"Meetings must be scheduled at least {settings.MEETING_MIN_NOTICE_HOURS} hours in advance"
        )

    # Figure out which pairings this meeting applies to, and validate
    # ownership if a single student was targeted.
    if data.pairing_id:
        pairing = (await db.execute(select(Pairing).where(Pairing.id == data.pairing_id))).scalar_one_or_none()
        if pairing is None:
            raise NotFoundError("Pairing not found")
        if str(pairing.supervisor_id) != user.id and user.role != Role.ADMIN:
            raise PermissionError_("You can only schedule meetings for your own students")
        affected_pairings = [pairing]
    else:
        result = await db.execute(
            select(Pairing).where(Pairing.supervisor_id == user.id, Pairing.status == PairingStatus.active)
        )
        affected_pairings = result.scalars().all()
        if not affected_pairings:
            raise ValidationAppError("You have no active students to schedule a meeting for yet")

    meeting = Meeting(
        supervisor_id=user.id, pairing_id=data.pairing_id, scheduled_at=data.scheduled_at,
        venue=data.venue, agenda=data.agenda, meeting_type=MeetingType(data.meeting_type),
        duration_minutes=data.duration_minutes,
    )
    db.add(meeting)

    # Keep the inactivity tracker (pairings.last_meeting_date) meaningful:
    # scheduling a meeting is itself a sign of active engagement, so bump
    # it for every affected pairing (only forward, never backward).
    for pairing in affected_pairings:
        if pairing.last_meeting_date is None or data.scheduled_at > pairing.last_meeting_date:
            pairing.last_meeting_date = data.scheduled_at

    # Auto-post to the supervisor's existing broadcast channel so this
    # shows up as an announcement in the students' feed for free — reuses
    # already-tested code instead of building a second notification path.
    when_str = data.scheduled_at.strftime("%A, %d %b %Y at %I:%M %p")
    audience = "you" if data.pairing_id else "all my students"
    announcement = (
        f"\U0001F4C5 Meeting scheduled for {audience} — {when_str} at {data.venue}.\n"
        f"Agenda: {data.agenda}"
    )
    db.add(BroadcastMessage(supervisor_id=user.id, content=announcement))

    await db.commit()
    await db.refresh(meeting)

    return await _to_meeting_out(db, meeting)


async def update_meeting(db: AsyncSession, user: AuthedUser, meeting_id: str, data: MeetingUpdateIn) -> MeetingOut:
    meeting = (await db.execute(select(Meeting).where(Meeting.id == meeting_id))).scalar_one_or_none()
    if meeting is None:
        raise NotFoundError("Meeting not found")

    if str(meeting.supervisor_id) != user.id and user.role != Role.ADMIN:
        raise PermissionError_("You can only edit meetings you scheduled")

    # A meeting that's already happened is history, not editable —
    # replaces the old "24h after creation" edit window, which made
    # less sense once meetings are scheduled ahead of time.
    if meeting.scheduled_at <= datetime.now(timezone.utc):
        raise ValidationAppError("This meeting has already happened and can no longer be edited")

    if data.venue is not None:
        meeting.venue = data.venue
    if data.agenda is not None:
        meeting.agenda = data.agenda
    if data.duration_minutes is not None:
        meeting.duration_minutes = data.duration_minutes
    if data.scheduled_at is not None:
        meeting.scheduled_at = data.scheduled_at

    await db.commit()
    await db.refresh(meeting)
    return await _to_meeting_out(db, meeting)


async def get_inactivity_flags(db: AsyncSession, user: AuthedUser) -> list[InactivityFlagOut]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.INACTIVITY_THRESHOLD_DAYS)

    query = select(Pairing).where(
        Pairing.status == PairingStatus.active,
    ).where((Pairing.last_meeting_date.is_(None)) | (Pairing.last_meeting_date < cutoff))

    # Admin gets institution-wide oversight — every at-risk pairing,
    # not just one department (admins have no department_id, so the
    # old unconditional filter silently returned zero rows for them).
    # Coordinators stay scoped to their own department.
    if user.role != Role.ADMIN:
        query = query.where(Pairing.department_id == user.department_id)

    pairings = (await db.execute(query)).scalars().all()

    flags = []
    now = datetime.now(timezone.utc)
    for p in pairings:
        days_since = (now - p.last_meeting_date).days if p.last_meeting_date else None
        flags.append(InactivityFlagOut(
            pairing_id=str(p.id), student_id=str(p.student_id), supervisor_id=str(p.supervisor_id),
            days_since_meeting=days_since, last_meeting_date=p.last_meeting_date,
        ))

    return flags
