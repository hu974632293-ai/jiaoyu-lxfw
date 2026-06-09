from pydantic import BaseModel


class LeadCreate(BaseModel):
    customer_name: str
    contact_info: str | None = None
    background_info: str | None = None
    owner_id: int | None = None


class LeadStatusUpdate(BaseModel):
    status: str
