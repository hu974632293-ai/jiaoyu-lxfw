"""知识库相关 Schema"""
from typing import Any, Literal

from pydantic import BaseModel, Field


class KnowledgeChatRequest(BaseModel):
    question: str
    scene: str = "customer_service"
    role: str = "public"
    actor_username: str | None = None
    lead_id: int | None = None
    student_id: int | None = None
    conversation_id: str | None = None
    business_context: dict[str, Any] = Field(default_factory=dict)
    action_mode: Literal["answer", "draft", "confirm"] = "answer"


class KnowledgeSourceCreate(BaseModel):
    source_name: str
    source_type: str = "document"
    scene: str = "customer_service"
    owner: str = ""
    description: str = ""
    file_path: str = ""
    dify_dataset_id: str = ""
    status: str = "待同步"
    operator_username: str | None = None


class KnowledgeSourceUpdate(BaseModel):
    source_name: str | None = None
    source_type: str | None = None
    scene: str | None = None
    owner: str | None = None
    description: str | None = None
    file_path: str | None = None
    dify_dataset_id: str | None = None
    status: str | None = None
    operator_username: str | None = None


class KnowledgeSyncJobCreate(BaseModel):
    source_id: int | None = None
    job_type: str = "manual_record"
    triggered_by: str = "system"
