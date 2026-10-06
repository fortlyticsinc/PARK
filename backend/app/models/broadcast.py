"""
PARK — Broadcast Model (Supervisor Announcements)
========================================================
A supervisor posts ONE message here; it's visible to every student
they currently supervise (computed live from active pairings.
supervisor_id — NOT a stored membership list). This is deliberately
simpler than a general-purpose "groups" system: membership can never
go stale because it's never stored, just queried at read time.

This is separate from `messages` (DMs) on purpose — it doesn't touch
the already-tested 1:1 messaging code at all, so shipping this can't
regress anything that currently works.
"""

from sqlalchemy import Column, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from backend.app.core.database import Base


class BroadcastMessage(Base):
    __tablename__ = "broadcast_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # The supervisor whose "channel" this belongs to — every student
    # with an active pairing to this supervisor sees it.
    supervisor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
