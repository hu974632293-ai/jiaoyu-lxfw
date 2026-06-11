from pydantic import BaseModel


class LeadCreate(BaseModel):
    customer_name: str
    contact_info: str | None = None
    background_info: str | None = None
    source_channel: str = ""
    owner_id: int | None = None


class LeadStatusUpdate(BaseModel):
    status: str
    reason: str = ""
    operator_username: str | None = None
