"""PARK — Dashboard Schemas"""

from pydantic import BaseModel


class DashboardOverviewOut(BaseModel):
    total_pairings: int
    active_pairings: int
    at_risk_pairings: int
    completed_pairings: int
    total_students: int
    total_supervisors: int
    chapters_submitted_this_week: int
    chapters_approved_this_week: int
    pending_reviews: int
    meetings_logged_this_week: int
    messages_sent_this_week: int
    last_updated: str


class AtRiskPairingOut(BaseModel):
    pairing_id: str
    student_name: str
    student_email: str
    student_phone: str | None
    supervisor_name: str
    supervisor_email: str
    supervisor_phone: str | None
    days_since_last_meeting: int
    last_meeting_date: str | None
    current_chapter: int
    chapter_status: str


class AtRiskListOut(BaseModel):
    items: list[AtRiskPairingOut]
    total: int
