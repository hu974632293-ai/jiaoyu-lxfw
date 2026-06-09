from pydantic import BaseModel


class ProfileAssessRequest(BaseModel):
    raw_input: str
    source_type: str = "text"
    lead_id: int | None = None


class ProfileAssessResult(BaseModel):
    extracted_profile: dict
    singapore_score: float
    germany_score: float
    matched_project: str
    reasons: list[str]
    missing_fields: list[str]
    suggested_actions: list[str]
