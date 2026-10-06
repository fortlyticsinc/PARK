"""
PARK — Message Service (Module 4)
========================================
SMS bulk-send removed per the Brevo/weekly-digest pivot — this file
now only handles send/read/conversation history, which was never
SMS-dependent in the first place.
"""

from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.auth import AuthedUser
from backend.app.core.permissions import Role
from backend.app.core.error_handler import NotFoundError, PermissionError_
from backend.app.models.message import Message
from backend.app.models.pairing import Pairing
from backend.app.models.user import User
from backend.app.schemas.message import MessageOut, PaginatedMessagesOut, ConversationSummaryOut, MessageCreateIn


def _assert_pairing_participant(user: AuthedUser, pairing: Pairing):
    is_participant = user.id in (str(pairing.student_id), str(pairing.supervisor_id))
    if not is_participant and user.role != Role.ADMIN:
        raise PermissionError_("You are not part of this conversation")


async def _to_message_out(db: AsyncSession, message: Message) -> MessageOut:
    sender = (await db.execute(select(User).where(User.id == message.sender_id))).scalar_one_or_none()
    return MessageOut(
        id=str(message.id), pairing_id=str(message.pairing_id), sender_id=str(message.sender_id),
        sender_role=sender.role.value if sender else "unknown", sender_name=sender.full_name if sender else None,
        content=message.content, read=bool(message.is_read),
        created_at=message.created_at.isoformat() if message.created_at else "",
    )


async def get_conversations(db: AsyncSession, user: AuthedUser) -> list[ConversationSummaryOut]:
    if user.role == Role.STUDENT:
        pairing_filter = Pairing.student_id == user.id
    elif user.role == Role.SUPERVISOR:
        pairing_filter = Pairing.supervisor_id == user.id
    else:
        pairing_filter = Pairing.department_id == user.department_id

    pairings = (await db.execute(select(Pairing).where(pairing_filter))).scalars().all()

    summaries = []
    for pairing in pairings:
        last_msg = (await db.execute(
            select(Message).where(Message.pairing_id == pairing.id).order_by(Message.created_at.desc()).limit(1)
        )).scalar_one_or_none()

        unread_count = (await db.execute(
            select(func.count()).select_from(Message).where(
                Message.pairing_id == pairing.id, Message.is_read.is_(False), Message.sender_id != user.id,
            )
        )).scalar_one()

        student = (await db.execute(select(User).where(User.id == pairing.student_id))).scalar_one_or_none()
        supervisor = (await db.execute(select(User).where(User.id == pairing.supervisor_id))).scalar_one_or_none()

        summaries.append(ConversationSummaryOut(
            pairing_id=str(pairing.id), student_name=student.full_name if student else None,
            supervisor_name=supervisor.full_name if supervisor else None,
            last_message=last_msg.content if last_msg else None,
            last_message_at=last_msg.created_at.isoformat() if last_msg and last_msg.created_at else None,
            unread_count=unread_count,
        ))

    summaries.sort(key=lambda s: s.last_message_at or "", reverse=True)
    return summaries


async def get_conversation(db: AsyncSession, user: AuthedUser, pairing_id: str, page: int = 1, limit: int = 50) -> PaginatedMessagesOut:
    pairing = (await db.execute(select(Pairing).where(Pairing.id == pairing_id))).scalar_one_or_none()
    if pairing is None:
        raise NotFoundError("Pairing not found")
    _assert_pairing_participant(user, pairing)

    query = select(Message).where(Message.pairing_id == pairing_id)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()

    offset = (page - 1) * limit
    rows = (await db.execute(query.order_by(Message.created_at.desc()).offset(offset).limit(limit))).scalars().all()

    items = [await _to_message_out(db, m) for m in reversed(rows)]
    pages = (total + limit - 1) // limit if total > 0 else 1

    return PaginatedMessagesOut(items=items, total=total, page=page, limit=limit, pages=pages)


async def send_message(db: AsyncSession, user: AuthedUser, data: MessageCreateIn) -> MessageOut:
    pairing = (await db.execute(select(Pairing).where(Pairing.id == data.pairing_id))).scalar_one_or_none()
    if pairing is None:
        raise NotFoundError("Pairing not found")
    _assert_pairing_participant(user, pairing)

    message = Message(pairing_id=data.pairing_id, sender_id=user.id, content=data.content, is_read=False)
    db.add(message)
    await db.commit()
    await db.refresh(message)

    return await _to_message_out(db, message)


async def mark_as_read(db: AsyncSession, user: AuthedUser, message_id: str) -> None:
    message = (await db.execute(select(Message).where(Message.id == message_id))).scalar_one_or_none()
    if message is None:
        raise NotFoundError("Message not found")

    pairing = (await db.execute(select(Pairing).where(Pairing.id == message.pairing_id))).scalar_one_or_none()
    if pairing:
        _assert_pairing_participant(user, pairing)

    message.is_read = True
    message.read_at = datetime.now(timezone.utc)
    await db.commit()
