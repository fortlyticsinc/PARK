"""PARK — Chapter Models (Module 2)"""

from sqlalchemy import (
    Column, String, Integer, DateTime, ForeignKey, Text,
    Enum as SAEnum, UniqueConstraint, CheckConstraint, Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum

from backend.app.core.database import Base


class ChapterStatus(str, enum.Enum):
    submitted = "submitted"
    under_review = "under_review"
    revision_requested = "revision_requested"
    resubmitted = "resubmitted"
    approved = "approved"
    rejected = "rejected"


class Chapter(Base):
    __tablename__ = "chapters"
    __table_args__ = (
        UniqueConstraint("pairing_id", "chapter_number", "version", name="uq_chapter_pairing_number_version"),
        CheckConstraint("chapter_number BETWEEN 1 AND 5", name="chk_chapter_number_range"),
        Index("idx_chapters_pairing_status", "pairing_id", "status"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pairing_id = Column(UUID(as_uuid=True), ForeignKey("pairings.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    supervisor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    chapter_number = Column(Integer, nullable=False)
    title = Column(String(500), nullable=True)

    file_url = Column(String(500), nullable=True)
    file_public_id = Column(String(200), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)

    status = Column(SAEnum(ChapterStatus, name="chapter_status"), nullable=False, default=ChapterStatus.submitted)
    version = Column(Integer, default=1)
    previous_version_id = Column(UUID(as_uuid=True), ForeignKey("chapters.id", ondelete="SET NULL"), nullable=True)

    supervisor_comment = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    supervisor_notified = Column(String(20), default="pending")

    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ChapterComment(Base):
    __tablename__ = "chapter_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chapter_id = Column(UUID(as_uuid=True), ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    author_role = Column(String(20), nullable=False)

    content = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True)
    line_number = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
