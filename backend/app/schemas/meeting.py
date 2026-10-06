"""PARK — Meeting Schemas"""

from pydantic import BaseModel, Field, field_validator
from datetime import datetime, timezone, timedelta
from typing import Literal

MeetingTypeLiteral = Literal["physical", "virtual", "phone"]

MIN_NOTICE_HOURS = 24  # kept in sync with settings.MEETING_MIN_NOTICE_HOURS


def _ensure_min_notice(value: datetime) -> datetime:
    """Shared 24-hour-notice check used by both create and update."""
    # Treat naive datetimes as UTC rather than rejecting them outright —
    # friendlier for a frontend <input type="datetime-local"> which
    # doesn't send timezone info.
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)

    now = datetime.now(timezone.utc)
    if value < now + timedelta(hours=MIN_NOTICE_HOURS):
        raise ValueError(
            f"Meetings must be scheduled at least {MIN_NOTICE_HOURS} hours in advance "
            "so students get proper notice"
        )
    return value


class MeetingOut(BaseModel):
    id: str
    supervisor_id: str
    supervisor_name: str
    pairing_id: str | None
    student_name: str | None  # only set when pairing_id targets a single student
    scheduled_at: datetime
    venue: str
    agenda: str
    meeting_type: MeetingTypeLiteral
    duration_minutes: int | None
    is_upcoming: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PaginatedMeetingsOut(BaseModel):
    items: list[MeetingOut]
    total: int
    page: int
    limit: int
    pages: int


class MeetingCreateIn(BaseModel):
    scheduled_at: datetime
    venue: str = Field(min_length=1, max_length=255)
    agenda: str = Field(min_length=1, max_length=2000)
    meeting_type: MeetingTypeLiteral = "physical"
    duration_minutes: int | None = None
    # Leave unset/None to broadcast to the supervisor's whole cohort.
    pairing_id: str | None = None

    @field_validator("scheduled_at")
    @classmethod
    def check_min_notice(cls, v: datetime) -> datetime:
        return _ensure_min_notice(v)


class MeetingUpdateIn(BaseModel):
    venue: str | None = None
    agenda: str | None = None
    duration_minutes: int | None = None
    scheduled_at: datetime | None = None  # rescheduling still needs 24h notice from NOW

    @field_validator("scheduled_at")
    @classmethod
    def check_min_notice(cls, v: datetime | None) -> datetime | None:
        if v is None:
            return v
        return _ensure_min_notice(v)


class InactivityFlagOut(BaseModel):
    pairing_id: str
    student_id: str
    supervisor_id: str
    days_since_meeting: int | None
    last_meeting_date: datetime | None
