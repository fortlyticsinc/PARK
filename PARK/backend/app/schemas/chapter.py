"""PARK — Chapter Schemas (Pydantic v2)"""

from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Literal

ChapterStatusLiteral = Literal[
    "submitted", "under_review", "revision_requested",
    "resubmitted", "approved", "rejected",
]

REVIEW_TRANSITIONS: dict[str, set[str]] = {
    "submitted":  {"under_review", "revision_requested", "approved", "rejected"},
    "under_review": {"revision_requested", "approved", "rejected"},
    "resubmitted": {"under_review", "approved", "rejected"},
    "rejected": {"resubmitted"},
}

ALLOWED_MIME_TYPES = {
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


class ChapterCommentOut(BaseModel):
    id: str
    author_id: str
    author_role: str
    author_name: str | None
    content: str
    page_number: int | None
    line_number: int | None
    created_at: datetime

    class Config:
        from_attributes = True


class ChapterOut(BaseModel):
    id: str
    pairing_id: str
    chapter_number: int
    title: str | None
    status: ChapterStatusLiteral
    file_url: str
    file_size_bytes: int | None
    version: int
    supervisor_comment: str | None
    reviewed_at: datetime | None
    submitted_at: datetime
    updated_at: datetime
    student_name: str | None
    supervisor_name: str | None
    comments: list[ChapterCommentOut] = []

    class Config:
        from_attributes = True


class PaginatedChaptersOut(BaseModel):
    items: list[ChapterOut]
    total: int
    page: int
    limit: int
    pages: int


class UploadUrlOut(BaseModel):
    upload_url: str
    params: dict[str, str | int]


class ChapterSubmitIn(BaseModel):
    pairing_id: str
    chapter_number: int = Field(ge=1, le=5)
    title: str | None = None
    file_url: str
    file_public_id: str
    file_size: int = Field(gt=0, le=20 * 1024 * 1024)
    mime_type: str

    @field_validator("mime_type")
    @classmethod
    def validate_mime(cls, v: str) -> str:
        if v not in ALLOWED_MIME_TYPES:
            raise ValueError("Chapter files must be DOC or DOCX documents")
        return v

class ChapterResubmitIn(BaseModel):
    chapter_id: str
    title: str | None = None
    file_url: str
    file_public_id: str
    file_size: int = Field(gt=0, le=20 * 1024 * 1024)
    mime_type: str

    @field_validator("mime_type")
    @classmethod
    def validate_mime(cls, v: str) -> str:
        if v not in ALLOWED_MIME_TYPES:
            raise ValueError("Chapter files must be DOC or DOCX documents")
        return v


class ChapterReviewIn(BaseModel):
    status: ChapterStatusLiteral
    comment: str | None = None


class ChapterCommentIn(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    page_number: int | None = None
    line_number: int | None = None
