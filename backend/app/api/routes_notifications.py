from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import require_token_permission
from app.core.response import fail, ok
from app.services.admin_service import ensure_default_admin_data, handle_notification, list_notifications, mark_notification_read

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def list_all(db: Session = Depends(get_db)):
    ensure_default_admin_data(db)
    return ok(list_notifications(db))


@router.post("/{notification_id}/read")
def mark_read(notification_id: int, _permission: None = Depends(require_token_permission("dashboard:read")), db: Session = Depends(get_db)):
    try:
        return ok(mark_notification_read(db, notification_id))
    except ValueError as exc:
        return fail(str(exc), code=40400)


@router.post("/{notification_id}/handle")
def handle(notification_id: int, _permission: None = Depends(require_token_permission("dashboard:read")), db: Session = Depends(get_db)):
    try:
        return ok(handle_notification(db, notification_id))
    except ValueError as exc:
        return fail(str(exc), code=40400)
