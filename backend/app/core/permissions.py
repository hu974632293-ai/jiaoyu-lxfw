from collections.abc import Callable

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.user import SysUser
from app.services.admin_service import ensure_default_admin_data, user_has_permission


class PermissionDeniedError(Exception):
    def __init__(self, permission_code: str):
        self.permission_code = permission_code


def require_permission(permission_code: str) -> Callable[..., SysUser]:
    def dependency(
        current_user: SysUser = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> SysUser:
        ensure_default_admin_data(db)
        if not user_has_permission(db, current_user.username, permission_code):
            raise PermissionDeniedError(permission_code)
        return current_user

    return dependency