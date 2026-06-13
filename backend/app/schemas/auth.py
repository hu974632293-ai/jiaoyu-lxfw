"""认证相关请求和响应 Schema"""
from __future__ import annotations

from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class LogoutRequest(BaseModel):
    session_id: str | None = None
    reason: str | None = None
