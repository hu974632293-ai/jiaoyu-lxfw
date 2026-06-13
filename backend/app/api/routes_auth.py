"""认证路由：登录、当前用户、退出"""
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.response import fail, ok
from app.models.user import SysUser
from app.schemas.auth import LoginRequest, LogoutRequest
from app.services.auth_service import login, revoke_session, serialize_auth_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
def login_route(payload: LoginRequest, db: Session = Depends(get_db)):
    try:
        return ok(login(db, payload.username, payload.password))
    except ValueError as exc:
        return JSONResponse(status_code=401, content=fail(str(exc), 40101))


@router.get("/me")
def me(current_user: SysUser = Depends(get_current_user)):
    return ok(serialize_auth_user(current_user))


@router.post("/logout")
def logout(payload: LogoutRequest, current_user: SysUser = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.session_id:
        revoke_session(db, payload.session_id, current_user.id, payload.reason or "用户退出")
    return ok({"status": "logged_out"})