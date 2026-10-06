import hashlib
import time
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import jwt
import pytest
from sqlalchemy.dialects import postgresql

from app.core.auth import AuthedUser, _verify_supabase_jwt
from app.core.config import settings
from app.core.error_handler import AuthError
from app.core.permissions import Role
from app.models.chapter import ChapterStatus
from app.models.repository import RepoStatus
from app.services import chapter_service, dashboard_service, repository_service


class _RowsResult:
    def __init__(self, rows):
        self.rows = rows

    def all(self):
        return self.rows


class _ChapterBatchDb:
    def __init__(self, owner_rows):
        self.owner_rows = owner_rows
        self.statements = []

    async def execute(self, statement):
        self.statements.append(statement)
        return _RowsResult(self.owner_rows if len(self.statements) == 1 else [])


class _ProjectResult:
    def __init__(self, project):
        self.project = project

    def scalar_one_or_none(self):
        return self.project


class _ProjectDb:
    def __init__(self, project):
        self.project = project
        self.commit_count = 0

    async def execute(self, _statement):
        return _ProjectResult(self.project)

    async def commit(self):
        self.commit_count += 1


class _DashboardDb:
    def __init__(self):
        self.statements = []

    async def execute(self, statement):
        self.statements.append(statement)
        return _RowsResult([])


@pytest.mark.asyncio
async def test_local_supabase_jwt_verification_checks_signature_and_claims(monkeypatch):
    secret = "local-test-secret-for-supabase-jwt"
    monkeypatch.setattr(settings, "JWT_SECRET", secret)
    now = int(time.time())
    claims = {
        "sub": str(uuid4()), "email": "user@example.edu", "aud": "authenticated",
        "iss": f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1", "iat": now, "exp": now + 60,
    }
    token = jwt.encode(claims, secret, algorithm="HS256")

    verified = await _verify_supabase_jwt(token)
    assert verified["sub"] == claims["sub"]

    with pytest.raises(AuthError):
        await _verify_supabase_jwt(jwt.encode(claims, "wrong-secret", algorithm="HS256"))


@pytest.mark.asyncio
async def test_chapter_serialization_batches_owners_and_comments():
    chapter_id = uuid4()
    timestamp = datetime.now(timezone.utc)
    chapter = SimpleNamespace(
        id=chapter_id, pairing_id=uuid4(), chapter_number=1, title="Chapter 1",
        status=ChapterStatus.submitted, file_url="https://example.test/chapter.docx",
        file_size_bytes=120, version=1, supervisor_comment=None, reviewed_at=None,
        submitted_at=timestamp, updated_at=timestamp,
    )
    db = _ChapterBatchDb([SimpleNamespace(id=chapter_id, student_name="Student", supervisor_name="Supervisor")])

    result = await chapter_service._to_chapter_outs(db, [chapter])

    assert len(db.statements) == 2
    assert result[0].student_name == "Student"
    assert result[0].supervisor_name == "Supervisor"
    assert result[0].comments == []


@pytest.mark.asyncio
async def test_dashboard_risk_and_workload_use_single_aggregated_query_each():
    user = AuthedUser(
        id=str(uuid4()), supabase_uid=str(uuid4()), email="admin@example.edu", full_name="Admin",
        role=Role.ADMIN, department_id=None, institution_id=None,
    )

    at_risk_db = _DashboardDb()
    await dashboard_service.get_at_risk(at_risk_db, user)
    assert len(at_risk_db.statements) == 1
    at_risk_sql = str(at_risk_db.statements[0].compile(dialect=postgresql.dialect()))
    assert "row_number() OVER" in at_risk_sql

    workload_db = _DashboardDb()
    await dashboard_service.get_supervisor_workload(workload_db, user)
    assert len(workload_db.statements) == 1
    workload_sql = str(workload_db.statements[0].compile(dialect=postgresql.dialect()))
    assert "GROUP BY" in workload_sql


def test_signed_cloudinary_upload_is_user_scoped(monkeypatch):
    monkeypatch.setattr(settings, "CLOUDINARY_CLOUD_NAME", "test-cloud")
    monkeypatch.setattr(settings, "CLOUDINARY_API_KEY", "test-api-key")
    monkeypatch.setattr(settings, "CLOUDINARY_API_SECRET", "test-api-secret")
    user = AuthedUser(
        id=str(uuid4()), supabase_uid=str(uuid4()), email="student@example.edu", full_name="Student",
        role=Role.STUDENT, department_id=None, institution_id=None,
    )

    upload = chapter_service.get_upload_url(
        user, "chapter.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )

    assert upload.upload_url == "https://api.cloudinary.com/v1_1/test-cloud/raw/upload"
    assert upload.params["folder"] == "p-ark/chapters"
    assert str(upload.params["public_id"]).startswith(f"{user.id}/")
    signed = {key: upload.params[key] for key in ("folder", "public_id", "timestamp")}
    source = "&".join(f"{key}={value}" for key, value in sorted(signed.items()))
    expected = hashlib.sha1(f"{source}test-api-secret".encode()).hexdigest()
    assert upload.params["signature"] == expected


@pytest.mark.asyncio
async def test_public_project_view_uses_redis_without_committing_project(monkeypatch):
    project = SimpleNamespace(
        id=uuid4(), status=RepoStatus.published, view_count=4, download_count=1,
        title="Project", student_name="Student", student_matric="MAT-1",
        supervisor_name="Supervisor", academic_year="2025/2026", abstract=None,
        keywords=[], department_id=uuid4(), chapter_files=[], full_thesis_url=None,
    )
    db = _ProjectDb(project)

    async def increment(_key, _field, _initial_value):
        return 7

    monkeypatch.setattr(repository_service, "cache_hash_increment_from", increment)
    result = await repository_service.get_project(db, str(project.id))

    assert result.view_count == 7
    assert db.commit_count == 0