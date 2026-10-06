"""PARK — Certificate Schemas"""

from pydantic import BaseModel, field_validator
from datetime import datetime
from urllib.parse import urlsplit


class CertificateOut(BaseModel):
    """Full certificate detail — shown to pairing participants + dept staff."""
    id: str
    pairing_id: str
    certificate_number: str
    student_name: str
    student_matric: str | None
    supervisor_name: str
    department_name: str
    institution_name: str
    project_title: str
    academic_year: str
    issued_at: datetime

    class Config:
        from_attributes = True


class CertificateVerifyOut(BaseModel):
    """
    Public verification view — deliberately the SAME fields a printed
    certificate already shows, nothing extra. Anyone with the
    certificate number (printed on the document itself) can confirm
    it's real; this doesn't expose anything the paper doesn't already.
    """
    certificate_number: str
    student_name: str
    project_title: str
    department_name: str
    institution_name: str
    academic_year: str
    issued_at: datetime
    valid: bool


class CompletionChecklistItemOut(BaseModel):
    chapter_number: int
    submitted: bool
    approved: bool


class CompletionStatusOut(BaseModel):
    """
    Shown to a supervisor BEFORE they confirm completion, so they see
    exactly what's blocking issuance rather than guessing from a
    generic error after clicking a button.
    """
    ready: bool
    chapters: list[CompletionChecklistItemOut]
    already_certified: bool


class CertificateApplicationOut(BaseModel):
    id: str
    pairing_id: str
    final_copy_url: str
    status: str
    supervisor_comment: str | None
    applied_at: datetime | None
    reviewed_at: datetime | None


class CertificateApplicationCreateIn(BaseModel):
    final_copy_url: str

    @field_validator("final_copy_url")
    @classmethod
    def validate_pdf_url(cls, value: str) -> str:
        parsed = urlsplit(value)
        if parsed.scheme != "https" or not parsed.path.lower().endswith(".pdf"):
            raise ValueError("Final project copy must be an HTTPS PDF file")
        return value


class CertificateApplicationReviewIn(BaseModel):
    status: str
    comment: str | None = None
