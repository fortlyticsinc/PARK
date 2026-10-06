"""PARK — Chapters Router (Module 2)"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.auth import AuthedUser
from backend.app.core.rbac import require_permission
from backend.app.schemas.chapter import ChapterSubmitIn, ChapterResubmitIn, ChapterReviewIn, ChapterCommentIn
from backend.app.services import chapter_service

router = APIRouter(prefix="/v1/chapters", tags=["Chapters"])


@router.get("")
async def list_chapters(
    pairing_id: str | None = None, page: int = Query(default=1, ge=1), limit: int = Query(default=20, ge=1, le=100),
    status: str | None = None, db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("chapter:view")),
):
    result = await chapter_service.list_chapters(db, user, pairing_id=pairing_id, page=page, limit=limit, status=status)
    return {"data": result}


@router.get("/upload-url")
async def get_upload_url(
    filename: str,
    mime_type: str,
    purpose: str = Query(default="chapter", pattern="^(chapter|final_copy)$"),
    user: AuthedUser = Depends(require_permission("chapter:submit")),
):
    result = chapter_service.get_upload_url(user, filename, mime_type, purpose)
    return {"data": result}


@router.post("/resubmit")
async def resubmit_chapter(body: ChapterResubmitIn, db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("chapter:submit"))):
    result = await chapter_service.resubmit_chapter(db, user, body)
    return {"data": {"chapter": result}}


@router.get("/{chapter_id}")
async def get_chapter(chapter_id: str, db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("chapter:view"))):
    result = await chapter_service.get_chapter(db, user, chapter_id)
    return {"data": {"chapter": result}}


@router.post("", status_code=201)
async def submit_chapter(body: ChapterSubmitIn, db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("chapter:submit"))):
    result = await chapter_service.submit_chapter(db, user, body)
    return {"data": {"chapter": result}}


@router.patch("/{chapter_id}/review")
async def review_chapter(chapter_id: str, body: ChapterReviewIn, db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("chapter:approve"))):
    result = await chapter_service.review_chapter(db, user, chapter_id, body)
    return {"data": {"chapter": result}}


@router.post("/{chapter_id}/comments")
async def add_comment(chapter_id: str, body: ChapterCommentIn, db: AsyncSession = Depends(get_db), user: AuthedUser = Depends(require_permission("chapter:comment"))):
    result = await chapter_service.add_comment(db, user, chapter_id, body)
    return {"data": {"comment": result}}
