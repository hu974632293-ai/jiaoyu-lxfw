from datetime import datetime

from pydantic import BaseModel


class CrmFollowUpCreate(BaseModel):
    follow_type: str = "电话"
    content: str
    next_action: str = ""
    operator_username: str | None = None


class CrmTaskCreate(BaseModel):
    lead_id: int | None = None
    title: str
    due_time: datetime | None = None
    owner_username: str | None = None


class CrmTaskComplete(BaseModel):
    operator_username: str | None = None
