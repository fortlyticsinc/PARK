"""PARK — Pairing Schemas (Pydantic v2)"""

from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Literal
import re

PairingStatusLiteral = Literal["active", "completed", "suspended", "withdrawn"]
ACADEMIC_YEAR_PATTERN = re.compile(r"^\d{4}/\d{4}$")


class PairingOut(BaseModel):
    id: str
    student_name: str
    student_matric: str | None
    supervisor_name: str
    project_title: str | None
    status: PairingStatusLiteral
    academic_year: str
    chapter_count: int
    last_meeting_date: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class PaginatedPairingsOut(BaseModel):
    items: list[PairingOut]
    total: int
    page: int
    limit: int
    pages: int


class PairingDetailOut(PairingOut):
    student_id: str
    supervisor_id: str
    department_id: str
    institution_id: str
    student_email: str | None = None
    supervisor_email: str | None = None


class PairingCreate(BaseModel):
    student_id: str
    supervisor_id: str
    department_id: str
    institution_id: str
    academic_year: str
    project_title: str | None = None

    @field_validator("academic_year")
    @classmethod
    def validate_academic_year(cls, v: str) -> str:
        if not ACADEMIC_YEAR_PATTERN.match(v):
            raise ValueError("Academic year must be in format YYYY/YYYY, e.g. 2024/2025")
        return v


class PairingUpdate(BaseModel):
    project_title: str | None = None
    status: PairingStatusLiteral | None = None


class BulkImportResultOut(BaseModel):
    row_number: int
    success: bool
    pairing_id: str | None
    error_code: str | None
    error_message: str | None


class BulkImportSummaryOut(BaseModel):
    total_rows: int
    success_count: int
    failure_count: int
    results: list[BulkImportResultOut]
