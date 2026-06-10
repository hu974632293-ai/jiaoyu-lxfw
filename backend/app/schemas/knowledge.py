from pydantic import BaseModel


class KnowledgeChatRequest(BaseModel):
    question: str
    scene: str = "customer_service"
    lead_id: int | None = None
    conversation_id: str | None = None


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
