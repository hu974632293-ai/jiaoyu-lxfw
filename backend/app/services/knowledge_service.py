import json

from sqlalchemy.orm import Session

from app.models.knowledge import KnowledgeChatLog
from app.services.dify_client import DifyClient


async def ask_knowledge(db: Session, question: str, lead_id: int | None = None, conversation_id: str | None = None):
    client = DifyClient()
    try:
        result = await client.chat(question, conversation_id=conversation_id)
    except Exception as exc:
        result = {
            "answer": f"Dify 调用失败：{exc}",
            "citations": [],
            "conversation_id": conversation_id or "",
            "status": "error",
        }

    log = KnowledgeChatLog(
        lead_id=lead_id,
        question=question,
        answer=result["answer"],
        citations=json.dumps(result["citations"], ensure_ascii=False),
        dify_conversation_id=result["conversation_id"],
        status=result["status"],
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {
        "id": log.id,
        "answer": log.answer,
        "citations": result["citations"],
        "conversation_id": log.dify_conversation_id,
        "status": log.status,
    }
