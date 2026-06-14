from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import require_token_permission
from app.core.response import fail, ok
from app.models.crm import CrmTask
from app.models.user import SysUser
from app.schemas.crm import CrmTaskComplete, CrmTaskCreate
from app.services.crm_service import complete_task, create_task, serialize_task
from app.services.scope_service import DataScopeError, ensure_can_access_lead

router = APIRouter(prefix="/api/crm", tags=["crm"])


@router.post("/tasks")
def add_task(
    payload: CrmTaskCreate,
    current_user: SysUser = Depends(require_token_permission("crm:lead:write")),
    db: Session = Depends(get_db),
):
    if payload.lead_id is not None:
        try:
            ensure_can_access_lead(db, current_user, payload.lead_id)
        except DataScopeError:
            return JSONResponse(status_code=403, content=fail("无权操作该客户", 40301))
        except ValueError as exc:
            return fail(str(exc), 40401)
    payload.owner_username = current_user.username
    task = create_task(db, payload)
    if not task:
        return fail("客户不存在", 40401)
    return ok(serialize_task(task))


@router.patch("/tasks/{task_id}/complete")
def mark_task_complete(
    task_id: int,
    _payload: CrmTaskComplete,
    current_user: SysUser = Depends(require_token_permission("crm:lead:write")),
    db: Session = Depends(get_db),
):
    existing = db.query(CrmTask).filter_by(id=task_id).first()
    if not existing:
        return fail("任务不存在", 40403)
    if existing.lead_id is not None:
        try:
            ensure_can_access_lead(db, current_user, existing.lead_id)
        except DataScopeError:
            return JSONResponse(status_code=403, content=fail("无权操作该客户", 40301))
        except ValueError as exc:
            return fail(str(exc), 40401)
    task = complete_task(db, task_id, current_user.username)
    return ok(serialize_task(task))
