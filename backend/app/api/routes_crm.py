from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import fail, ok
from app.schemas.crm import CrmTaskComplete, CrmTaskCreate
from app.services.crm_service import complete_task, create_task, serialize_task

router = APIRouter(prefix="/api/crm", tags=["crm"])


@router.post("/tasks")
def add_task(payload: CrmTaskCreate, db: Session = Depends(get_db)):
    task = create_task(db, payload)
    if not task:
        return fail("客户不存在", 40401)
    return ok(serialize_task(task))


@router.patch("/tasks/{task_id}/complete")
def mark_task_complete(task_id: int, payload: CrmTaskComplete, db: Session = Depends(get_db)):
    task = complete_task(db, task_id, payload.operator_username)
    if not task:
        return fail("任务不存在", 40403)
    return ok(serialize_task(task))
