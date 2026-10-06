"""
PARK — Message Schemas
=============================
NOTE: bulk SMS schemas removed as part of the SMS -> weekly-email
pivot. Messaging itself (send/read/conversations) is unaffected.
"""

from pydantic import BaseModel, Field


class MessageOut(BaseModel):
    id: str
    pairing_id: str
    sender_id: str
    sender_role: str
    sender_name: str | None
    content: str
    read: bool
    created_at: str


class PaginatedMessagesOut(BaseModel):
    items: list[MessageOut]
    total: int
    page: int
    limit: int
    pages: int


class ConversationSummaryOut(BaseModel):
    pairing_id: str
    student_name: str | None
    supervisor_name: str | None
    last_message: str | None
    last_message_at: str | None
    unread_count: int


class MessageCreateIn(BaseModel):
    pairing_id: str
    content: str = Field(min_length=1, max_length=5000)
