from pydantic import BaseModel


class EnterpriseChatRequest(BaseModel):
    message: str
    actor_username: str | None = None


class DailyReportCreate(BaseModel):
    content: str
    actor_username: str | None = None


class Nl2SqlQueryRequest(BaseModel):
    question: str
    actor_username: str | None = None
