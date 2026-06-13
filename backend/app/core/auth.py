"""当前用户依赖：从JWT token解析并校验用户身份"""
from __future__ import annotations

from fastapi import Depends, Header
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import SysUser
from app.services.auth_service import is_session_active


class AuthenticationError(Exception):
    """认证失败异常"""
    pass


def get_current_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> SysUser:
    """FastAPI依赖：从Bearer token解析当前用户"""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AuthenticationError()
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_access_token(token)
    except InvalidTokenError:
        raise AuthenticationError()
    username = str(payload.get("sub") or "")
    user_id = int(payload.get("user_id") or 0)
    jti = str(payload.get("jti") or "")
    user = db.query(SysUser).filter_by(username=username).first()
    if not user or user.id != user_id or user.status not in {"正常", "启用"}:
        raise AuthenticationError()
    if not jti or not is_session_active(db, jti, user.id):
        raise AuthenticationError()
    return user
