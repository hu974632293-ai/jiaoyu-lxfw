from typing import Literal

from pydantic import BaseModel, Field


class EnterpriseChatRequest(BaseModel):
    message: str
    actor_username: str | None = None


class DailyReportCreate(BaseModel):
    content: str
    actor_username: str | None = None


class VoiceDraftRequest(BaseModel):
    target_type: Literal["lead", "daily_report"]
    transcript: str = Field(min_length=1)
    actor_username: str | None = None


class Nl2SqlQueryRequest(BaseModel):
    question: str
    actor_username: str | None = None
