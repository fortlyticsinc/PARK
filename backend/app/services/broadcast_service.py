"""
PARK — Broadcast Service
===============================
Supervisor posts once; every student with an ACTIVE pairing to that
supervisor can read it. Membership is computed live from `pairings`
on every read — never cached or duplicated into a membership table —
so a student who's re-paired away from a supervisor stops seeing new
broadcasts immediately, with zero cleanup logic needed.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.auth import AuthedUser
from backend.app.core.permissions import Role
from backend.app.core.error_handler import PermissionError_, ValidationAppError
from backend.app.models.broadcast import BroadcastMessage
from backend.app.models.pairing import Pairing, PairingStatus
from backend.app.models.user import User
from backend.app.schemas.broadcast import BroadcastMessageOut, BroadcastCreateIn


async def send_broadcast(db: AsyncSession, user: AuthedUser, data: BroadcastCreateIn) -> BroadcastMessageOut:
    if user.role != Role.SUPERVISOR:
        raise PermissionError_("Only supervisors can post announcements")

    # Require at least one active student before allowing a post —
    # posting into a channel with zero possible readers is almost
    # always a mistake (e.g. testing on the wrong account).
    has_students = (
        await db.execute(
            select(Pairing.id).where(Pairing.supervisor_id == user.id, Pairing.status == PairingStatus.active).limit(1)
        )
    ).scalar_one_or_none()
    if not has_students:
        raise ValidationAppError("You have no active students to announce to yet")

    broadcast = BroadcastMessage(supervisor_id=user.id, content=data.content)
    db.add(broadcast)
    await db.commit()
    await db.refresh(broadcast)

    return BroadcastMessageOut(
        id=str(broadcast.id), supervisor_id=str(broadcast.supervisor_id),
        supervisor_name=user.full_name, content=broadcast.content,
        created_at=broadcast.created_at.isoformat(),
    )


async def list_broadcasts(db: AsyncSession, user: AuthedUser) -> list[BroadcastMessageOut]:
    """
    Supervisors see their OWN sent announcements (their outbox).
    Students see announcements from the supervisor(s) on their ACTIVE
    pairing(s) — usually one, but a student could theoretically have
    pairings across academic years, so we resolve all active ones.
    """
    if user.role == Role.SUPERVISOR:
        supervisor_ids = [user.id]
    elif user.role == Role.STUDENT:
        rows = (
            await db.execute(
                select(Pairing.supervisor_id).where(Pairing.student_id == user.id, Pairing.status == PairingStatus.active)
            )
        ).scalars().all()
        supervisor_ids = [str(sid) for sid in rows]
        if not supervisor_ids:
            return []
    else:
        # Coordinators/admins don't have a personal announcement feed —
        # this endpoint is scoped to the DM-equivalent 1:1 relationship.
        raise PermissionError_("Announcements are only available to students and supervisors")

    rows = (
        await db.execute(
            select(BroadcastMessage, User.full_name.label("supervisor_name"))
            .join(User, BroadcastMessage.supervisor_id == User.id)
            .where(BroadcastMessage.supervisor_id.in_(supervisor_ids))
            .order_by(BroadcastMessage.created_at.desc())
        )
    ).all()

    return [
        BroadcastMessageOut(
            id=str(row[0].id), supervisor_id=str(row[0].supervisor_id),
            supervisor_name=row[1] or "Unknown supervisor", content=row[0].content,
            created_at=row[0].created_at.isoformat() if row[0].created_at else "",
        )
        for row in rows
    ]
