"""PARK — Pairing Model (Module 1)"""

from sqlalchemy import (
    Column, String, DateTime, ForeignKey, Integer,
    Enum as SAEnum, UniqueConstraint, CheckConstraint, Index, text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum

from backend.app.core.database import Base


class PairingStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    suspended = "suspended"
    withdrawn = "withdrawn"


class Pairing(Base):
    __tablename__ = "pairings"
    __table_args__ = (
        UniqueConstraint("student_id", "academic_year", name="uq_pairing_student_year"),
        CheckConstraint("student_id != supervisor_id", name="chk_pairing_different_users"),
        Index(
            "uq_pairings_active_student", "student_id", unique=True,
            postgresql_where=text("status = 'active' AND deleted_at IS NULL"),
        ),
        Index(
            "uq_pairings_institution_topic",
            "institution_id",
            text("lower(regexp_replace(trim(project_title), '\\s+', ' ', 'g'))"),
            unique=True,
            postgresql_where=text("project_title IS NOT NULL AND trim(project_title) <> '' AND deleted_at IS NULL"),
        ),
        Index("idx_pairings_supervisor_status", "supervisor_id", "status"),
        Index("idx_pairings_dept_year", "department_id", "academic_year"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    supervisor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    institution_id = Column(UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False)

    academic_year = Column(String(9), nullable=False)
    project_title = Column(String(500), nullable=True)
    status = Column(SAEnum(PairingStatus, name="pairing_status"), nullable=False, default=PairingStatus.active)

    chapter_count = Column(Integer, default=0)
    last_meeting_date = Column(DateTime(timezone=True), nullable=True)

    deleted_at = Column(DateTime(timezone=True), nullable=True)

    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
