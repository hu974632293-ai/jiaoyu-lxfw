import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import fail, ok
from app.models.knowledge import KnowledgeChatLog
from app.schemas.knowledge import KnowledgeChatRequest
from app.services.knowledge_service import ask_knowledge

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


@router.post("/chat")
async def chat(payload: KnowledgeChatRequest, db: Session = Depends(get_db)):
    result = await ask_knowledge(db, payload.question, payload.lead_id, payload.conversation_id)
    return ok(result)


@router.get("/logs")
def logs(db: Session = Depends(get_db)):
    items = db.query(KnowledgeChatLog).order_by(KnowledgeChatLog.id.desc()).limit(30).all()
    return ok([{"id": item.id, "question": item.question, "status": item.status} for item in items])


@router.get("/logs/{log_id}")
def detail(log_id: int, db: Session = Depends(get_db)):
    item = db.query(KnowledgeChatLog).filter(KnowledgeChatLog.id == log_id).first()
    if not item:
        return fail("问答记录不存在", 40404)
    return ok(
        {
            "id": item.id,
            "question": item.question,
            "answer": item.answer,
            "citations": json.loads(item.citations),
            "status": item.status,
        }
    )
