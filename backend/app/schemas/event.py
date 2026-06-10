from datetime import datetime

from pydantic import BaseModel, Field


class EventRegisterRequest(BaseModel):
    lead_id: int | None = None
    subject_type: str = Field(default="lead", pattern="^(lead|student)$")
    subject_id: int | None = None
    subject_name: str = ""
    contact_info: str = ""
    source_channel: str = ""
    operator_username: str | None = None


class EventCreate(BaseModel):
    event_name: str
    event_type: str = "线上"
    start_time: datetime
    location: str = ""
    max_participants: int = 100
    target_audience: str = ""
    speaker: str = ""
    status: str = "草稿"
    description: str = ""
    operator_username: str | None = None


class EventUpdate(BaseModel):
    event_name: str | None = None
    event_type: str | None = None
    start_time: datetime | None = None
    location: str | None = None
    max_participants: int | None = None
    target_audience: str | None = None
    speaker: str | None = None
    status: str | None = None
    description: str | None = None
    operator_username: str | None = None


class EventCheckInRequest(BaseModel):
    registration_id: int
    operator_username: str | None = None
