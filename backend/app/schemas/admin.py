from typing import Any

from pydantic import BaseModel, Field


class RoleCreate(BaseModel):
    role_code: str
    role_name: str
    description: str = ""
    permission_codes: list[str] = Field(default_factory=list)


class RolePermissionUpdate(BaseModel):
    permission_codes: list[str] = Field(default_factory=list)


class AuditLogCreate(BaseModel):
    actor_username: str | None = None
    action: str
    resource_type: str = ""
    resource_id: str = ""
    detail: dict[str, Any] = Field(default_factory=dict)
