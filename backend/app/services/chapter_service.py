"""PARK — Chapter Service (Module 2)"""

import time
import hashlib
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from urllib.parse import unquote, urlsplit
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased
from sqlalchemy.exc import IntegrityError

from backend.app.core.config import settings
from backend.app.core.auth import AuthedUser
from backend.app.core.permissions import Role
from backend.app.core.error_handler import NotFoundError, ConflictError, PermissionError_, ValidationAppError
from backend.app.models.chapter import Chapter, ChapterComment, ChapterStatus
from backend.app.models.pairing import Pairing
from backend.app.models.user import User
from backend.app.schemas.chapter import (
    ChapterOut, ChapterCommentOut, PaginatedChaptersOut, UploadUrlOut,
    ChapterSubmitIn, ChapterResubmitIn, ChapterReviewIn, ChapterCommentIn,
    REVIEW_TRANSITIONS,
)


UploadPurpose = Literal["chapter", "final_copy"]
CHAPTER_UPLOAD_TYPES = {
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
FINAL_COPY_UPLOAD_TYPES = {".pdf": "application/pdf"}


def _validate_document(filename: str, mime_type: str, purpose: UploadPurpose) -> str:
    extension = Path(filename).suffix.lower()
    allowed_types = FINAL_COPY_UPLOAD_TYPES if purpose == "final_copy" else CHAPTER_UPLOAD_TYPES
    expected_mime = allowed_types.get(extension)
    if expected_mime is None:
        formats = "PDF" if purpose == "final_copy" else "DOC or DOCX"
        raise ValidationAppError(f"{purpose.replace('_', ' ').title()} must be a {formats} file", field="file")
    if mime_type and mime_type not in {expected_mime, "application/octet-stream"}:
        raise ValidationAppError("File type does not match its filename", field="file")
    return expected_mime


def validate_cloudinary_asset(
    user_id: str,
    file_url: str,
    mime_type: str,
    purpose: UploadPurpose,
    file_public_id: str | None = None,
) -> None:
    """Require an owned raw Cloudinary URL matching the declared document."""
    parsed = urlsplit(file_url)
    if parsed.scheme != "https" or parsed.hostname != "res.cloudinary.com" or parsed.query or parsed.fragment:
        raise ValidationAppError("Uploaded file must be an HTTPS Cloudinary document URL", field="file_url")

    path_parts = [unquote(part) for part in parsed.path.strip("/").split("/")]
    if len(path_parts) < 7 or path_parts[0] != settings.CLOUDINARY_CLOUD_NAME:
        raise ValidationAppError("Uploaded file does not belong to this Cloudinary account", field="file_url")
    if path_parts[1:3] != ["raw", "upload"]:
        raise ValidationAppError("Uploaded document must use Cloudinary raw delivery", field="file_url")

    asset_parts = path_parts[3:]
    if asset_parts and asset_parts[0].startswith("v") and asset_parts[0][1:].isdigit():
        asset_parts = asset_parts[1:]
    asset_public_id = "/".join(asset_parts)
    expected_folder = "p-ark/final-copies" if purpose == "final_copy" else "p-ark/chapters"
    expected_prefix = f"{expected_folder}/{user_id}/"
    if not asset_public_id.startswith(expected_prefix):
        raise ValidationAppError("Uploaded file is not owned by this account", field="file_url")
    if file_public_id is not None and unquote(file_public_id) != asset_public_id:
        raise ValidationAppError("Uploaded file URL and file identifier do not match", field="file_public_id")

    _validate_document(Path(asset_public_id).name, mime_type, purpose)


def get_upload_url(user: AuthedUser, filename: str, mime_type: str, purpose: UploadPurpose = "chapter") -> UploadUrlOut:
    canonical_mime_type = _validate_document(filename, mime_type, purpose)
    timestamp = int(time.time())
    folder = "p-ark/final-copies" if purpose == "final_copy" else "p-ark/chapters"
    extension = Path(filename).suffix.lower()
    public_id = f"{user.id}/{uuid.uuid4().hex}{extension}"
    signed_params = {"folder": folder, "public_id": public_id, "timestamp": timestamp}
    signature_source = "&".join(f"{key}={value}" for key, value in sorted(signed_params.items()))
    signature = hashlib.sha1(f"{signature_source}{settings.CLOUDINARY_API_SECRET}".encode()).hexdigest()
    return UploadUrlOut(
        upload_url=f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/raw/upload",
        params={
            **signed_params, "api_key": settings.CLOUDINARY_API_KEY,
            "signature": signature,
        },
    )


async def _to_chapter_out(db: AsyncSession, chapter: Chapter) -> ChapterOut:
    return (await _to_chapter_outs(db, [chapter]))[0]


async def _to_chapter_outs(db: AsyncSession, chapters: list[Chapter]) -> list[ChapterOut]:
    if not chapters:
        return []

    chapter_ids = [chapter.id for chapter in chapters]
    student = aliased(User)
    supervisor = aliased(User)
    owner_rows = (await db.execute(
        select(Chapter.id, student.full_name.label("student_name"), supervisor.full_name.label("supervisor_name"))
        .join(student, Chapter.student_id == student.id, isouter=True)
        .join(supervisor, Chapter.supervisor_id == supervisor.id, isouter=True)
        .where(Chapter.id.in_(chapter_ids))
    )).all()
    owners = {row.id: (row.student_name, row.supervisor_name) for row in owner_rows}

    comment_rows = (await db.execute(
        select(ChapterComment, User.full_name.label("author_name"))
        .join(User, ChapterComment.author_id == User.id)
        .where(ChapterComment.chapter_id.in_(chapter_ids))
        .order_by(ChapterComment.created_at.asc())
    )).all()
    comments_by_chapter: dict[object, list[ChapterCommentOut]] = defaultdict(list)
    for row in comment_rows:
        comment = row.ChapterComment
        comments_by_chapter[comment.chapter_id].append(ChapterCommentOut(
            id=str(comment.id), author_id=str(comment.author_id), author_role=comment.author_role,
            author_name=row.author_name, content=comment.content, page_number=comment.page_number,
            line_number=comment.line_number, created_at=comment.created_at,
        ))

    outputs = []
    for chapter in chapters:
        student_name, supervisor_name = owners.get(chapter.id, (None, None))
        outputs.append(ChapterOut(
            id=str(chapter.id), pairing_id=str(chapter.pairing_id), chapter_number=chapter.chapter_number,
            title=chapter.title, status=chapter.status.value, file_url=chapter.file_url,
            file_size_bytes=chapter.file_size_bytes, version=chapter.version,
            supervisor_comment=chapter.supervisor_comment, reviewed_at=chapter.reviewed_at,
            submitted_at=chapter.submitted_at, updated_at=chapter.updated_at,
            student_name=student_name, supervisor_name=supervisor_name,
            comments=comments_by_chapter[chapter.id],
        ))
    return outputs


async def _assert_chapter_access(db: AsyncSession, user: AuthedUser, chapter: Chapter, *, write: bool = False):
    is_student_owner = user.id == str(chapter.student_id)
    is_supervisor_owner = user.id == str(chapter.supervisor_id)
    if user.role == Role.COORDINATOR and not write:
        pairing = (await db.execute(
            select(Pairing).where(Pairing.id == chapter.pairing_id)
        )).scalar_one_or_none()
        if pairing and str(pairing.department_id) == user.department_id:
            return

    if write:
        if not (is_supervisor_owner or user.role == Role.ADMIN or is_student_owner):
            raise PermissionError_("You don't have access to this chapter")
    else:
        if not (is_student_owner or is_supervisor_owner or user.role == Role.ADMIN):
            raise PermissionError_("You don't have access to this chapter")


async def list_chapters(
    db: AsyncSession, user: AuthedUser, pairing_id: str | None = None,
    page: int = 1, limit: int = 20, status: str | None = None,
) -> PaginatedChaptersOut:
    query = select(Chapter)

    if user.role == Role.STUDENT:
        query = query.where(Chapter.student_id == user.id)
    elif user.role == Role.SUPERVISOR:
        query = query.where(Chapter.supervisor_id == user.id)
    elif user.role == Role.COORDINATOR:
        query = query.join(Pairing, Chapter.pairing_id == Pairing.id).where(
            Pairing.department_id == user.department_id,
        )

    if pairing_id:
        if user.role == Role.COORDINATOR:
            pairing = (await db.execute(
                select(Pairing).where(Pairing.id == pairing_id)
            )).scalar_one_or_none()
            if pairing is None:
                raise NotFoundError("Pairing not found")
            if str(pairing.department_id) != user.department_id:
                raise PermissionError_("You don't have access to chapters for this pairing")
        query = query.where(Chapter.pairing_id == pairing_id)
    elif user.role in (Role.COORDINATOR, Role.ADMIN):
        raise ValidationAppError("pairing_id is required for this view", field="pairing_id")

    if status:
        query = query.where(Chapter.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * limit
    rows = (await db.execute(
        query.order_by(Chapter.chapter_number.asc(), Chapter.version.desc()).offset(offset).limit(limit)
    )).scalars().all()

    items = await _to_chapter_outs(db, rows)
    pages = (total + limit - 1) // limit if total > 0 else 1

    return PaginatedChaptersOut(items=items, total=total, page=page, limit=limit, pages=pages)


async def get_chapter(db: AsyncSession, user: AuthedUser, chapter_id: str) -> ChapterOut:
    chapter = (await db.execute(select(Chapter).where(Chapter.id == chapter_id))).scalar_one_or_none()
    if chapter is None:
        raise NotFoundError("Chapter not found")
    await _assert_chapter_access(db, user, chapter)
    return await _to_chapter_out(db, chapter)


async def submit_chapter(db: AsyncSession, user: AuthedUser, data: ChapterSubmitIn) -> ChapterOut:
    pairing = (await db.execute(select(Pairing).where(Pairing.id == data.pairing_id))).scalar_one_or_none()
    if pairing is None:
        raise NotFoundError("Pairing not found")

    if user.id != str(pairing.student_id):
        raise PermissionError_("You can only submit chapters for your own pairing")

    validate_cloudinary_asset(user.id, data.file_url, data.mime_type, "chapter", data.file_public_id)

    existing = (await db.execute(
        select(Chapter).where(Chapter.pairing_id == data.pairing_id, Chapter.chapter_number == data.chapter_number)
        .order_by(Chapter.version.desc())
    )).scalars().first()

    if existing and existing.status not in (ChapterStatus.rejected,):
        raise ConflictError(f"Chapter {data.chapter_number} already has a submission in progress — use resubmit instead")

    chapter = Chapter(
        pairing_id=data.pairing_id, student_id=pairing.student_id, supervisor_id=pairing.supervisor_id,
        chapter_number=data.chapter_number, title=data.title, file_url=data.file_url,
        file_public_id=data.file_public_id, file_size_bytes=data.file_size, mime_type=data.mime_type,
        status=ChapterStatus.submitted, version=1, supervisor_notified="pending",
    )
    db.add(chapter)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise ConflictError("A chapter with this number and version already exists")

    await db.refresh(chapter)
    await _resync_pairing_chapter_count(db, data.pairing_id)

    return await _to_chapter_out(db, chapter)


async def resubmit_chapter(db: AsyncSession, user: AuthedUser, data: ChapterResubmitIn) -> ChapterOut:
    previous = (await db.execute(select(Chapter).where(Chapter.id == data.chapter_id))).scalar_one_or_none()
    if previous is None:
        raise NotFoundError("Chapter not found")

    if user.id != str(previous.student_id):
        raise PermissionError_("You can only resubmit your own chapters")

    validate_cloudinary_asset(user.id, data.file_url, data.mime_type, "chapter", data.file_public_id)

    if previous.status not in {ChapterStatus.revision_requested, ChapterStatus.rejected}:
        raise ConflictError("Only chapters marked for revision or rejected can be resubmitted")

    new_chapter = Chapter(
        pairing_id=previous.pairing_id, student_id=previous.student_id, supervisor_id=previous.supervisor_id,
        chapter_number=previous.chapter_number, title=data.title or previous.title, file_url=data.file_url,
        file_public_id=data.file_public_id, file_size_bytes=data.file_size, mime_type=data.mime_type,
        status=ChapterStatus.resubmitted, version=previous.version + 1, previous_version_id=previous.id,
        supervisor_notified="pending",
    )
    db.add(new_chapter)
    await db.commit()
    await db.refresh(new_chapter)

    return await _to_chapter_out(db, new_chapter)


async def review_chapter(db: AsyncSession, user: AuthedUser, chapter_id: str, data: ChapterReviewIn) -> ChapterOut:
    chapter = (await db.execute(select(Chapter).where(Chapter.id == chapter_id))).scalar_one_or_none()
    if chapter is None:
        raise NotFoundError("Chapter not found")

    if user.id != str(chapter.supervisor_id) and user.role != Role.ADMIN:
        raise PermissionError_("Only the assigned supervisor can review this chapter")

    current = chapter.status.value
    allowed_targets = REVIEW_TRANSITIONS.get(current, set())
    if data.status not in allowed_targets:
        raise ConflictError(
            f"Cannot move chapter from '{current}' to '{data.status}'. "
            f"Allowed: {', '.join(sorted(allowed_targets)) or 'none — this status is terminal'}"
        )

    chapter.status = ChapterStatus(data.status)
    if data.comment:
        chapter.supervisor_comment = data.comment
    chapter.reviewed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(chapter)

    await _resync_pairing_chapter_count(db, str(chapter.pairing_id))

    if chapter.status == ChapterStatus.approved:
        # Fires on ANY chapter reaching approved — not just chapter 5 —
        # since chapters can be approved out of order. The function
        # itself checks whether all 5 are done and no-ops otherwise.
        from backend.app.services import repository_service
        await repository_service.auto_create_from_pairing(db, str(chapter.pairing_id))

    return await _to_chapter_out(db, chapter)


async def add_comment(db: AsyncSession, user: AuthedUser, chapter_id: str, data: ChapterCommentIn) -> ChapterCommentOut:
    chapter = (await db.execute(select(Chapter).where(Chapter.id == chapter_id))).scalar_one_or_none()
    if chapter is None:
        raise NotFoundError("Chapter not found")

    if user.id != str(chapter.supervisor_id) and user.role != Role.ADMIN:
        raise PermissionError_("Only the assigned supervisor can comment on this chapter")

    comment = ChapterComment(
        chapter_id=chapter.id, author_id=user.id, author_role=user.role.value,
        content=data.content, page_number=data.page_number, line_number=data.line_number,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    return ChapterCommentOut(
        id=str(comment.id), author_id=str(comment.author_id), author_role=comment.author_role,
        author_name=user.full_name, content=comment.content, page_number=comment.page_number,
        line_number=comment.line_number, created_at=comment.created_at,
    )


async def _resync_pairing_chapter_count(db: AsyncSession, pairing_id: str) -> None:
    count = (await db.execute(
        select(func.count()).select_from(Chapter).where(
            Chapter.pairing_id == pairing_id, Chapter.status.notin_([ChapterStatus.rejected]),
        )
    )).scalar_one()

    pairing = (await db.execute(select(Pairing).where(Pairing.id == pairing_id))).scalar_one_or_none()
    if pairing:
        pairing.chapter_count = count
        await db.commit()
