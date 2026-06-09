from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import ok
from app.services.admin_service import ensure_default_admin_data, list_notifications

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def list_all(db: Session = Depends(get_db)):
    ensure_default_admin_data(db)
    return ok(list_notifications(db))
