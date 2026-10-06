"""PARK — Department Model"""

from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from backend.app.core.database import Base


class Department(Base):
    __tablename__ = "departments"
    __table_args__ = (
        UniqueConstraint("institution_id", "code", name="uq_department_institution_code"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    institution_id = Column(UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    code = Column(String(20), nullable=True)
    coordinator_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
