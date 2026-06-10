import json
from typing import Any

from sqlalchemy.orm import Session

from app.models.assistant import KnowledgeSource, KnowledgeSyncJob
from app.models.knowledge import KnowledgeChatLog
from app.models.operation import AuditLog
from app.models.user import SysUser
from app.schemas.knowledge import KnowledgeSourceCreate, KnowledgeSourceUpdate, KnowledgeSyncJobCreate
from app.services.dify_client import DifyClient

SCENE_LABELS = {
    "customer_service": "客服咨询",
    "enterprise_guide": "企业新人指南",
    "student_life": "学生生活支持",
    "policy": "留学政策",
}


async def ask_knowledge(
    db: Session,
    question: str,
    scene: str = "customer_service",
    lead_id: int | None = None,
    conversation_id: str | None = None,
) -> dict[str, Any]:
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

    fallback_reason = _fallback_reason(result["status"])
    log = KnowledgeChatLog(
        lead_id=lead_id,
        scene=scene,
        question=question,
        answer=result["answer"],
        citations=json.dumps(result["citations"], ensure_ascii=False),
        dify_conversation_id=result["conversation_id"],
        status=result["status"],
        fallback_reason=fallback_reason,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {
        "id": log.id,
        "scene": log.scene,
        "scene_label": SCENE_LABELS.get(log.scene, log.scene),
        "answer": log.answer,
        "citations": result["citations"],
        "conversation_id": log.dify_conversation_id,
        "status": log.status,
        "fallback_reason": log.fallback_reason,
    }


def list_chat_logs(db: Session, scene: str | None = None) -> list[dict[str, Any]]:
    query = db.query(KnowledgeChatLog)
    if scene:
        query = query.filter_by(scene=scene)
    items = query.order_by(KnowledgeChatLog.id.desc()).limit(50).all()
    return [
        {
            "id": item.id,
            "scene": item.scene,
            "scene_label": SCENE_LABELS.get(item.scene, item.scene),
            "question": item.question,
            "status": item.status,
            "fallback_reason": item.fallback_reason,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in items
    ]


def get_chat_log(db: Session, log_id: int) -> KnowledgeChatLog | None:
    return db.query(KnowledgeChatLog).filter_by(id=log_id).first()


def list_sources(db: Session, scene: str | None = None) -> list[dict[str, Any]]:
    query = db.query(KnowledgeSource)
    if scene:
        query = query.filter_by(scene=scene)
    return [serialize_source(item) for item in query.order_by(KnowledgeSource.id.desc()).all()]


def create_source(db: Session, payload: KnowledgeSourceCreate) -> KnowledgeSource:
    source = KnowledgeSource(
        source_name=payload.source_name,
        source_type=payload.source_type,
        business_domain=SCENE_LABELS.get(payload.scene, payload.scene),
        scene=payload.scene,
        owner=payload.owner,
        description=payload.description,
        file_path=payload.file_path,
        dify_dataset_id=payload.dify_dataset_id,
        status=payload.status,
    )
    db.add(source)
    db.flush()
    _create_audit_log(
        db,
        payload.operator_username,
        "创建知识来源",
        "knowledge_source",
        str(source.id),
        {"source_name": source.source_name, "scene": source.scene, "status": source.status},
    )
    db.commit()
    db.refresh(source)
    return source


def update_source(db: Session, source_id: int, payload: KnowledgeSourceUpdate) -> KnowledgeSource | None:
    source = db.query(KnowledgeSource).filter_by(id=source_id).first()
    if not source:
        return None

    update_data = payload.model_dump(exclude_unset=True)
    operator_username = update_data.pop("operator_username", None)
    for field, value in update_data.items():
        if value is not None:
            setattr(source, field, value)
    if "scene" in update_data and update_data["scene"]:
        source.business_domain = SCENE_LABELS.get(source.scene, source.scene)

    db.flush()
    _create_audit_log(
        db,
        operator_username,
        "更新知识来源",
        "knowledge_source",
        str(source.id),
        {"source_name": source.source_name, "updated_fields": sorted(update_data.keys())},
    )
    db.commit()
    db.refresh(source)
    return source


def create_sync_job(db: Session, payload: KnowledgeSyncJobCreate) -> tuple[KnowledgeSyncJob | None, str | None]:
    source = db.query(KnowledgeSource).filter_by(id=payload.source_id).first() if payload.source_id else None
    if payload.source_id and not source:
        return None, "知识来源不存在"

    job = KnowledgeSyncJob(
        source_id=payload.source_id,
        job_type=payload.job_type,
        status="fallback_recorded",
        message="当前阶段未执行真实 Dify 同步，仅记录同步任务和 fallback 状态。",
    )
    db.add(job)
    db.flush()
    _create_audit_log(
        db,
        payload.triggered_by,
        "记录知识同步任务",
        "knowledge_sync_job",
        str(job.id),
        {"source_id": payload.source_id, "job_type": payload.job_type, "status": job.status},
    )
    db.commit()
    db.refresh(job)
    return job, None


def list_sync_jobs(db: Session) -> list[dict[str, Any]]:
    jobs = db.query(KnowledgeSyncJob).order_by(KnowledgeSyncJob.id.desc()).limit(50).all()
    return [serialize_sync_job(item) for item in jobs]


def serialize_source(item: KnowledgeSource) -> dict[str, Any]:
    return {
        "id": item.id,
        "source_name": item.source_name,
        "source_type": item.source_type,
        "business_domain": item.business_domain,
        "scene": item.scene,
        "scene_label": SCENE_LABELS.get(item.scene, item.scene),
        "owner": item.owner,
        "description": item.description,
        "file_path": item.file_path,
        "dify_dataset_id": item.dify_dataset_id,
        "status": item.status,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def serialize_sync_job(item: KnowledgeSyncJob) -> dict[str, Any]:
    return {
        "id": item.id,
        "source_id": item.source_id,
        "job_type": item.job_type,
        "status": item.status,
        "message": item.message,
        "finished_at": item.finished_at.isoformat() if item.finished_at else None,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def serialize_chat_detail(item: KnowledgeChatLog) -> dict[str, Any]:
    return {
        "id": item.id,
        "scene": item.scene,
        "scene_label": SCENE_LABELS.get(item.scene, item.scene),
        "question": item.question,
        "answer": item.answer,
        "citations": _parse_json_list(item.citations),
        "conversation_id": item.dify_conversation_id,
        "status": item.status,
        "fallback_reason": item.fallback_reason,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def _fallback_reason(status: str) -> str:
    if status == "fallback":
        return "Dify 未配置，已使用演示 fallback 答案，不阻断主业务。"
    if status == "error":
        return "Dify 调用异常，已记录错误状态。"
    return ""


def _parse_json_list(raw: str | None) -> list[Any]:
    if not raw:
        return []
    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        return []
    return value if isinstance(value, list) else []


def _create_audit_log(
    db: Session,
    actor_username: str | None,
    action: str,
    resource_type: str,
    resource_id: str,
    detail: dict[str, Any],
) -> None:
    actor = db.query(SysUser).filter_by(username=actor_username).first() if actor_username else None
    db.add(
        AuditLog(
            actor_user_id=actor.id if actor else None,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            detail=json.dumps(detail, ensure_ascii=False),
        )
    )
