"""PARK — Broadcast Schemas"""

from pydantic import BaseModel, Field


class BroadcastMessageOut(BaseModel):
    id: str
    supervisor_id: str
    supervisor_name: str
    content: str
    created_at: str


class BroadcastCreateIn(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
