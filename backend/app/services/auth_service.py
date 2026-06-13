"""认证服务：登录校验、session管理、用户序列化"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.auth import AuthSession
from app.models.user import SysUser


def login(db: Session, username: str, password: str) -> dict:
    """用户登录：校验密码、创建session、返回token和用户信息"""
    user = db.query(SysUser).filter_by(username=username).first()
    if not user or user.status not in {"正常", "启用"}:
        raise ValueError("账号或密码不正确，请检查后再登录。")

    if not verify_password(password, user.password_hash):
        raise ValueError("账号或密码不正确，请检查后再登录。")

    # 如果密码是旧格式（无），自动升级为PBKDF2哈希
    if "$" not in user.password_hash:
        user.password_hash = hash_password(password)
        db.commit()

    token, jti = create_access_token(user.username, user.id, user.role)
    now = datetime.now(timezone.utc)
    session = AuthSession(
        jti=jti,
        user_id=user.id,
        token_type="access",
        expires_at=(now + timedelta(minutes=settings.access_token_expire_minutes)).replace(tzinfo=None),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "access_token": token,
        "token_type": "bearer",
        "session_id": session.jti,
        "user": serialize_auth_user(user),
    }


def is_session_active(db: Session, jti: str, user_id: int) -> bool:
    session = db.query(AuthSession).filter_by(jti=jti, user_id=user_id).first()
    if not session or session.revoked_at is not None:
        return False
    return session.expires_at > datetime.now(timezone.utc).replace(tzinfo=None)


def revoke_session(db: Session, jti: str, user_id: int, reason: str = "") -> None:
    session = db.query(AuthSession).filter_by(jti=jti, user_id=user_id).first()
    if not session:
        return
    session.revoked_at = datetime.now(timezone.utc).replace(tzinfo=None)
    session.revoke_reason = reason[:200]
    db.commit()


def serialize_auth_user(user: SysUser) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "real_name": user.real_name,
        "role": user.role,
        "user_type": user.user_type,
        "status": user.status,
    }