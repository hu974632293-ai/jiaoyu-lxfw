from pydantic import BaseModel


class KnowledgeChatRequest(BaseModel):
    question: str
    lead_id: int | None = None
    conversation_id: str | None = None
