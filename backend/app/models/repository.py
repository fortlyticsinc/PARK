"""PARK — Repository Models (Module 5)"""

from sqlalchemy import (
    Column, String, Text, Integer, DateTime, ForeignKey,
    ARRAY, Enum as SAEnum, UniqueConstraint, Index,
)
from sqlalchemy.dialects.postgresql import UUID, TSVECTOR
from sqlalchemy.sql import func
import uuid
import enum

from backend.app.core.database import Base


class RepoStatus(str, enum.Enum):
    published = "published"
    hidden = "hidden"
    withdrawn = "withdrawn"


class RepositoryProject(Base):
    __tablename__ = "repository_projects"
    __table_args__ = (
        UniqueConstraint("student_matric", "academic_year", name="uq_repo_matric_year"),
        Index("idx_repo_dept_year", "department_id", "academic_year"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pairing_id = Column(UUID(as_uuid=True), ForeignKey("pairings.id", ondelete="SET NULL"), nullable=True)

    student_name = Column(String(200), nullable=False)
    student_matric = Column(String(50), nullable=False)
    student_email = Column(String(255), nullable=False)
    supervisor_name = Column(String(200), nullable=False)
    supervisor_email = Column(String(255), nullable=False)

    title = Column(String(500), nullable=False)
    abstract = Column(Text, nullable=True)
    keywords = Column(ARRAY(String), nullable=True)

    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False)
    institution_id = Column(UUID(as_uuid=True), ForeignKey("institutions.id"), nullable=False)
    academic_year = Column(String(9), nullable=False)

    chapter_files = Column(ARRAY(String), nullable=False, default=list)
    full_thesis_url = Column(String(500), nullable=True)

    search_vector = Column(TSVECTOR, nullable=True)
    view_count = Column(Integer, default=0, nullable=False)
    download_count = Column(Integer, default=0, nullable=False)

    status = Column(SAEnum(RepoStatus, name="repo_status"), nullable=False, default=RepoStatus.published)

    approved_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class RepositoryDownloadLog(Base):
    __tablename__ = "repository_download_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("repository_projects.id", ondelete="CASCADE"), nullable=False)
    downloaded_at = Column(DateTime(timezone=True), server_default=func.now())
    ip_hash = Column(String(64), nullable=True)
    user_agent_hash = Column(String(64), nullable=True)
