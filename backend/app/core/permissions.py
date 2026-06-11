from collections.abc import Callable

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.admin_service import ensure_default_admin_data, user_has_permission


class PermissionDeniedError(Exception):
    def __init__(self, permission_code: str):
        self.permission_code = permission_code


def require_permission(permission_code: str) -> Callable[..., None]:
    def dependency(
        actor_username: str = Header(default="admin", alias="X-Actor-Username"),
        db: Session = Depends(get_db),
    ) -> None:
        ensure_default_admin_data(db)
        if not user_has_permission(db, actor_username, permission_code):
            raise PermissionDeniedError(permission_code)

    return dependency
