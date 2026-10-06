"""Supervisor workload response models."""

from pydantic import BaseModel


class SupervisorWorkloadOut(BaseModel):
    supervisor_id: str
    supervisor_name: str
    supervisor_email: str
    department_id: str | None
    active_pairings: int
    pending_chapters: int
    approved_chapters: int
    upcoming_meetings: int
    last_activity_at: str | None


class SupervisorWorkloadListOut(BaseModel):
    items: list[SupervisorWorkloadOut]
    total: int