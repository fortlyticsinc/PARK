"""PARK — User Model"""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum

from backend.app.core.database import Base


class UserRole(str, enum.Enum):
    student = "student"
    supervisor = "supervisor"
    coordinator = "coordinator"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    supabase_uid = Column(UUID(as_uuid=True), unique=True, nullable=True)

    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(20), nullable=True)

    full_name = Column(String(200), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    role = Column(SAEnum(UserRole, name="user_role"), nullable=False, default=UserRole.student)

    matric_number = Column(String(50), nullable=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    institution_id = Column(UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True)

    is_active = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=False, nullable=False)
    email_verified = Column(Boolean, default=False)
    phone_verified = Column(Boolean, default=False)

    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
