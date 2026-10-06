"""
PARK — Certificate Model
==============================
A "PARK Approved" certificate of completion. Issued once per pairing,
only after a supervisor explicitly confirms completion (all 5 chapters
approved) — this is a deliberate human action, not an automatic side
effect of the last chapter being approved, so the supervisor is always
the one vouching for the work being genuinely done.

Fields are denormalized (student/supervisor/department/institution
names captured as plain strings at issue time) for the same reason
repository_projects does it: a certificate is a historical record — if
someone's name is corrected later or a department is renamed, the
certificate should keep showing what was true the day it was issued.
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class Certificate(Base):
    __tablename__ = "certificates"
    __table_args__ = (
        # One certificate per pairing — re-confirming completion should
        # never silently mint a second certificate.
        UniqueConstraint("pairing_id", name="uq_certificate_pairing"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pairing_id = Column(UUID(as_uuid=True), ForeignKey("pairings.id", ondelete="CASCADE"), nullable=False)

    # Human-readable, publicly verifiable identifier printed on the
    # certificate itself — e.g. "PARK-2025-CSC-0007".
    certificate_number = Column(String(50), unique=True, nullable=False)

    # Denormalized display fields (see module docstring for why)
    student_name = Column(String(200), nullable=False)
    student_matric = Column(String(50), nullable=True)
    supervisor_name = Column(String(200), nullable=False)
    department_name = Column(String(200), nullable=False)
    institution_name = Column(String(200), nullable=False)
    project_title = Column(String(500), nullable=False)
    academic_year = Column(String(9), nullable=False)

    confirmed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
