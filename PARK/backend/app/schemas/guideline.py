from pydantic import BaseModel
from datetime import datetime


class GuidelineOut(BaseModel):
    id: str
    department_id: str
    file_url: str
    file_name: str
    mime_type: str
    file_size: str | None
    updated_at: datetime | None
