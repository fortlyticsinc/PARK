"""PARK — Repository Router (Module 5)"""

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.auth import AuthedUser, get_current_user
from backend.app.core.rbac import require_permission
from backend.app.schemas.repository import RepositoryStatusUpdateIn
from backend.app.services import repository_service

router = APIRouter(prefix="/v1/repository", tags=["Repository"])


@router.get("/academic-years")
async def list_academic_years(db: AsyncSession = Depends(get_db)):
    result = await repository_service.list_academic_years(db)
    return {"data": {"academic_years": result}}


@router.get("")
async def search_projects(
    q: str | None = None,
    academic_year: str | None = None,
    department_id: str | None = None,
    sort_by: str = Query(default="relevance"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    result = await repository_service.search_projects(
        db, q, academic_year, department_id, sort_by, page, limit
    )
    return {"data": result}


# Registered BEFORE "/{project_id}" so "download-file" is never mistaken
# for a project_id — a literal path segment always beats a dynamic one
# when it's declared first. No auth dependency on purpose: the token
# itself IS the credential (only ever handed to an authorized user
# moments earlier by the authenticated /download endpoint below), and
# window.open() on the frontend can't attach an Authorization header.
@router.get("/download-file/{token}")
async def download_file(token: str):
    real_url = await repository_service.redeem_download_token(token)
    return RedirectResponse(url=real_url, status_code=302)


@router.get("/{project_id}")
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await repository_service.get_project(db, project_id)
    return {"data": result}


@router.get("/{project_id}/download")
async def get_download_url(
    project_id: str,
    request: Request = None,
    db: AsyncSession = Depends(get_db),
    user: AuthedUser = Depends(get_current_user),
):
    ip = request.client.host if request and request.client else None
    ua = request.headers.get("user-agent") if request else None
    result = await repository_service.get_download_url(db, user, project_id, ip, ua)
    return {"data": result}


@router.patch("/{project_id}/status")
async def update_status(
    project_id: str,
    body: RepositoryStatusUpdateIn,
    db: AsyncSession = Depends(get_db),
    user: AuthedUser = Depends(require_permission("repository:manage")),
):
    result = await repository_service.update_status(db, user, project_id, body)
    return {"data": {"project": result}}