"""当前用户依赖：从JWT token解析并校验用户身份，支持legacy header兼容"""
from __future__ import annotations

from fastapi import Depends, Header
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import SysUser
from app.services.auth_service import is_session_active


class AuthenticationError(Exception):
    """认证失败异常"""
    pass


def get_current_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_actor_username: str | None = Header(default=None, alias="X-Actor-Username"),
    db: Session = Depends(get_db),
) -> SysUser:
    """FastAPI依赖：从Bearer token解析当前用户。支持legacy X-Actor-Username兼容"""
    # 优先使用JWT token
    if authorization and authorization.lower().startswith("bearer "):
        return _resolve_bearer_user(authorization, db)

    # Legacy兼容：X-Actor-Username header（仅开发/测试环境）
    if settings.allow_legacy_actor_header and x_actor_username:
        user = db.query(SysUser).filter_by(username=x_actor_username).first()
        if user and user.status in {"正常", "启用"}:
            return user
    
    raise AuthenticationError()


def get_current_token_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> SysUser:
    """FastAPI依赖：只接受Bearer token，不接受legacy actor header"""
    return _resolve_bearer_user(authorization, db)


def _resolve_bearer_user(authorization: str | None, db: Session) -> SysUser:
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
