from typing import Any, Literal

from pydantic import BaseModel, Field


class ConsultantAgentChatRequest(BaseModel):
    lead_id: int
    message: str = Field(min_length=1)


class ConsultantPendingAction(BaseModel):
    action_type: Literal["create_follow_up", "create_task", "update_lead_status"]
    label: str
    draft: dict[str, Any] = Field(default_factory=dict)


class ConsultantAgentConfirmRequest(BaseModel):
    lead_id: int
    idempotency_key: str = Field(min_length=1)
    pending_actions: list[ConsultantPendingAction] = Field(min_length=1)
