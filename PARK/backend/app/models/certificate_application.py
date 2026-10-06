"""Certificate completion applications submitted by students."""

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class CertificateApplication(Base):
    __tablename__ = "certificate_applications"
    __table_args__ = (UniqueConstraint("pairing_id", name="uq_certificate_application_pairing"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pairing_id = Column(UUID(as_uuid=True), ForeignKey("pairings.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    supervisor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    final_copy_url = Column(String(500), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    supervisor_comment = Column(Text, nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)