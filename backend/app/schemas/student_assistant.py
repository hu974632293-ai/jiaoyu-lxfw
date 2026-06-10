from datetime import datetime

from pydantic import BaseModel


class StudentChatRequest(BaseModel):
    student_id: int
    message: str
    actor_username: str | None = None


class LeaveApprovalRequest(BaseModel):
    status: str
    resolution: str = ""
    actor_username: str | None = None


class FeedbackTicketCreate(BaseModel):
    student_id: int
    category: str = "建议"
    content: str
    actor_username: str | None = None


class FeedbackHandleRequest(BaseModel):
    resolution: str
    actor_username: str | None = None


class LeaveCreate(BaseModel):
    student_id: int
    reason: str
    start_time: datetime
    end_time: datetime
    actor_username: str | None = None
