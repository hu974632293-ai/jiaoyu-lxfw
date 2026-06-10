from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import fail, ok
from app.schemas.knowledge import KnowledgeChatRequest, KnowledgeSourceCreate, KnowledgeSourceUpdate, KnowledgeSyncJobCreate
from app.services.knowledge_service import (
    ask_knowledge,
    create_source,
    create_sync_job,
    get_chat_log,
    list_chat_logs,
    list_sources,
    list_sync_jobs,
    serialize_chat_detail,
    serialize_source,
    serialize_sync_job,
    update_source,
)

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


@router.post("/chat")
async def chat(payload: KnowledgeChatRequest, db: Session = Depends(get_db)):
    result = await ask_knowledge(db, payload.question, payload.scene, payload.lead_id, payload.conversation_id)
    return ok(result)


@router.get("/logs")
def logs(scene: str | None = None, db: Session = Depends(get_db)):
    return ok(list_chat_logs(db, scene))


@router.get("/logs/{log_id}")
def detail(log_id: int, db: Session = Depends(get_db)):
    item = get_chat_log(db, log_id)
    if not item:
        return fail("问答记录不存在", 40404)
    return ok(serialize_chat_detail(item))


@router.get("/sources")
def sources(scene: str | None = None, db: Session = Depends(get_db)):
    return ok(list_sources(db, scene))


@router.post("/sources")
def create_knowledge_source(payload: KnowledgeSourceCreate, db: Session = Depends(get_db)):
    source = create_source(db, payload)
    return ok(serialize_source(source))


@router.patch("/sources/{source_id}")
def update_knowledge_source(source_id: int, payload: KnowledgeSourceUpdate, db: Session = Depends(get_db)):
    source = update_source(db, source_id, payload)
    if not source:
        return fail("知识来源不存在", 40406)
    return ok(serialize_source(source))


@router.get("/sync-jobs")
def sync_jobs(db: Session = Depends(get_db)):
    return ok(list_sync_jobs(db))


@router.post("/sync-jobs")
def create_knowledge_sync_job(payload: KnowledgeSyncJobCreate, db: Session = Depends(get_db)):
    job, error = create_sync_job(db, payload)
    if not job:
        return fail(error or "知识同步任务创建失败", 40406)
    return ok(serialize_sync_job(job))
