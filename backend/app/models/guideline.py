"""Department-wide project guideline document."""

from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from backend.app.core.database import Base


class DepartmentGuideline(Base):
    __tablename__ = "department_guidelines"
    __table_args__ = (UniqueConstraint("department_id", name="uq_guideline_department"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    file_url = Column(String(500), nullable=False)
    file_public_id = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(String(30), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
