from pydantic import BaseModel


class EventRegisterRequest(BaseModel):
    lead_id: int
