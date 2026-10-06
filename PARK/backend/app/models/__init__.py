"""
PARK — Model Registry
==========================
Every model must be imported here so Alembic's autogenerate (and
Base.metadata.create_all in tests) can discover it.
"""

from app.models.institution import Institution
from app.models.department import Department
from app.models.user import User, UserRole
from app.models.pairing import Pairing, PairingStatus
from app.models.chapter import Chapter, ChapterComment, ChapterStatus
from app.models.meeting import Meeting, MeetingType
from app.models.message import Message
from app.models.repository import RepositoryProject, RepositoryDownloadLog, RepoStatus
from app.models.broadcast import BroadcastMessage
from app.models.certificate import Certificate
from app.models.certificate_application import CertificateApplication
from app.models.guideline import DepartmentGuideline

__all__ = [
    "Institution", "Department", "User", "UserRole",
    "Pairing", "PairingStatus",
    "Chapter", "ChapterComment", "ChapterStatus",
    "Meeting", "MeetingType",
    "Message",
    "RepositoryProject", "RepositoryDownloadLog", "RepoStatus",
    "BroadcastMessage",
    "Certificate", "CertificateApplication", "DepartmentGuideline",
]
