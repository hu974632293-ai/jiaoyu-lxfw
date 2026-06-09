from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    project_name: str
    country: str
    category: str = ""
    target_audience: str = ""
    description: str = ""
    selling_points: list[str] = Field(default_factory=list)
    cost_range: str = ""
    duration: str = ""
    admission_requirements: str = ""
    tags: list[str] = Field(default_factory=list)
    recommendation_rule: str = ""
    knowledge_source: str = ""
    status: str = "招生中"
    operator_username: str | None = None


class ProjectUpdate(BaseModel):
    project_name: str | None = None
    country: str | None = None
    category: str | None = None
    target_audience: str | None = None
    description: str | None = None
    selling_points: list[str] | None = None
    cost_range: str | None = None
    duration: str | None = None
    admission_requirements: str | None = None
    tags: list[str] | None = None
    recommendation_rule: str | None = None
    knowledge_source: str | None = None
    status: str | None = None
    operator_username: str | None = None
