"""
PARK — Model Registry
==========================
Every model must be imported here so Alembic's autogenerate (and
Base.metadata.create_all in tests) can discover it.
"""

from backend.app.models.institution import Institution
from backend.app.models.department import Department
from backend.app.models.user import User, UserRole
from backend.app.models.pairing import Pairing, PairingStatus
from backend.app.models.chapter import Chapter, ChapterComment, ChapterStatus
from backend.app.models.meeting import Meeting, MeetingType
from backend.app.models.message import Message
from backend.app.models.repository import RepositoryProject, RepositoryDownloadLog, RepoStatus
from backend.app.models.broadcast import BroadcastMessage
from backend.app.models.certificate import Certificate
from backend.app.models.certificate_application import CertificateApplication
from backend.app.models.guideline import DepartmentGuideline

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
