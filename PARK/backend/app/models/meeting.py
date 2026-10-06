"""
PARK — Meeting Model (Module 3)
====================================
REDESIGNED: meetings are now scheduled IN ADVANCE by a supervisor,
not logged after the fact by either party. A meeting belongs to a
supervisor's whole cohort by default (pairing_id = NULL means "every
active student under this supervisor"); a supervisor can optionally
target a single student by setting pairing_id.

The 24-hour minimum notice rule lives in the schema validator AND is
re-checked in the service layer (defense in depth — same two-layer
pattern used everywhere else in this codebase).
"""

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base


class MeetingType(str, enum.Enum):
    physical = "physical"
    virtual = "virtual"
    phone = "phone"


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Whose cohort this meeting is for — always the scheduling supervisor.
    # This is the primary anchor now (not pairing_id), since one meeting
    # can apply to many students at once.
    supervisor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # NULL = broadcast to every active student under this supervisor.
    # Set = a 1-on-1 meeting with just that one student.
    pairing_id = Column(UUID(as_uuid=True), ForeignKey("pairings.id", ondelete="CASCADE"), nullable=True)

    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    venue = Column(String(255), nullable=False)   # physical room OR a virtual meeting link
    agenda = Column(Text, nullable=False)          # what will be discussed — required
    meeting_type = Column(SAEnum(MeetingType, name="meeting_type"), nullable=False, default=MeetingType.physical)
    duration_minutes = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
