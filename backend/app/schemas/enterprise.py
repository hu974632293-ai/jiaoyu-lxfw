from typing import Any, Literal

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


class AgentActionConfirmRequest(BaseModel):
    action_type: Literal["submit_daily_report", "create_lead", "update_lead_status"]
    idempotency_key: str = Field(min_length=1)
    draft: dict[str, Any] = Field(default_factory=dict)
    actor_username: str | None = None
    session_id: int | None = None
