from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import require_token_permission
from app.core.response import ok
from app.schemas.admin import AuditLogCreate
from app.services.admin_service import create_audit_log, ensure_default_admin_data, list_audit_logs

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("/logs")
def list_logs(_permission: None = Depends(require_token_permission("system:audit:read")), db: Session = Depends(get_db)):
    ensure_default_admin_data(db)
    return ok(list_audit_logs(db))


@router.post("/logs")
def create(
    payload: AuditLogCreate,
    _permission: None = Depends(require_token_permission("system:audit:read")),
    db: Session = Depends(get_db),
):
    ensure_default_admin_data(db)
    log = create_audit_log(db, payload)
    return ok({"id": log.id})
