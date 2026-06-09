import json
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.crm import CrmFollowUp, CrmStageHistory, CrmTask
from app.models.event import EventLecture, EventRegistration
from app.models.knowledge import KnowledgeChatLog
from app.models.lead import CrmLead, LeadProfileAssessment
from app.models.operation import AuditLog
from app.models.user import SysUser
from app.schemas.crm import CrmFollowUpCreate, CrmTaskCreate


def get_operator(db: Session, username: str | None) -> SysUser | None:
    if not username:
        return None
    return db.query(SysUser).filter_by(username=username).first()


def create_follow_up(db: Session, lead_id: int, payload: CrmFollowUpCreate) -> CrmFollowUp | None:
    lead = db.query(CrmLead).filter_by(id=lead_id).first()
    if not lead:
        return None
    operator = get_operator(db, payload.operator_username)
    follow_up = CrmFollowUp(
        lead_id=lead_id,
        follow_type=payload.follow_type,
        content=payload.content,
        next_action=payload.next_action,
        operator_id=operator.id if operator else None,
    )
    db.add(follow_up)
    db.flush()
    _create_audit_log(
        db,
        operator,
        "新增CRM跟进",
        "crm_follow_up",
        str(follow_up.id),
        {"lead_id": lead_id, "customer_name": lead.customer_name, "next_action": payload.next_action},
    )
    db.commit()
    db.refresh(follow_up)
    return follow_up


def create_task(db: Session, payload: CrmTaskCreate) -> CrmTask | None:
    if payload.lead_id and not db.query(CrmLead).filter_by(id=payload.lead_id).first():
        return None
    owner = get_operator(db, payload.owner_username)
    task = CrmTask(
        lead_id=payload.lead_id,
        title=payload.title,
        due_time=payload.due_time,
        owner_id=owner.id if owner else None,
    )
    db.add(task)
    db.flush()
    _create_audit_log(
        db,
        owner,
        "创建CRM任务",
        "crm_task",
        str(task.id),
        {"lead_id": payload.lead_id, "title": payload.title},
    )
    db.commit()
    db.refresh(task)
    return task


def complete_task(db: Session, task_id: int, operator_username: str | None = None) -> CrmTask | None:
    task = db.query(CrmTask).filter_by(id=task_id).first()
    if not task:
        return None
    operator = get_operator(db, operator_username)
    task.status = "已完成"
    task.completed_at = datetime.utcnow()
    _create_audit_log(
        db,
        operator,
        "完成CRM任务",
        "crm_task",
        str(task.id),
        {"lead_id": task.lead_id, "title": task.title},
    )
    db.commit()
    db.refresh(task)
    return task


def create_stage_history(
    db: Session,
    lead: CrmLead,
    from_status: str,
    to_status: str,
    reason: str = "",
    operator_username: str | None = None,
) -> CrmStageHistory:
    operator = get_operator(db, operator_username)
    history = CrmStageHistory(
        lead_id=lead.id,
        from_status=from_status,
        to_status=to_status,
        reason=reason,
        operator_id=operator.id if operator else None,
    )
    db.add(history)
    db.flush()
    _create_audit_log(
        db,
        operator,
        "更新CRM阶段",
        "crm_lead",
        str(lead.id),
        {"from_status": from_status, "to_status": to_status, "reason": reason},
    )
    return history


def list_lead_timeline(db: Session, lead_id: int) -> list[dict[str, Any]] | None:
    lead = db.query(CrmLead).filter_by(id=lead_id).first()
    if not lead:
        return None

    items: list[dict[str, Any]] = [
        _timeline_item(
            "lead_created",
            "创建线索",
            lead.created_at,
            f"{lead.customer_name} 进入 CRM，当前阶段：{lead.status}",
            {"lead_id": lead.id, "status": lead.status},
        )
    ]
    items.extend(_profile_items(db, lead_id))
    items.extend(_knowledge_items(db, lead_id))
    items.extend(_follow_up_items(db, lead_id))
    items.extend(_task_items(db, lead_id))
    items.extend(_stage_history_items(db, lead_id))
    items.extend(_event_items(db, lead_id))
    return sorted(items, key=_timeline_sort_key, reverse=True)


def serialize_follow_up(item: CrmFollowUp) -> dict[str, Any]:
    return {
        "id": item.id,
        "lead_id": item.lead_id,
        "follow_type": item.follow_type,
        "content": item.content,
        "next_action": item.next_action,
        "operator_id": item.operator_id,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def serialize_task(item: CrmTask) -> dict[str, Any]:
    return {
        "id": item.id,
        "lead_id": item.lead_id,
        "title": item.title,
        "due_time": item.due_time.isoformat() if item.due_time else None,
        "status": item.status,
        "owner_id": item.owner_id,
        "completed_at": item.completed_at.isoformat() if item.completed_at else None,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def _profile_items(db: Session, lead_id: int) -> list[dict[str, Any]]:
    records = db.query(LeadProfileAssessment).filter_by(lead_id=lead_id).all()
    return [
        _timeline_item(
            "profile_assessment",
            "画像研判",
            item.created_at,
            f"推荐项目：{item.matched_project or '暂无'}，新加坡评分：{item.singapore_score}",
            {"assessment_id": item.id, "matched_project": item.matched_project},
        )
        for item in records
    ]


def _knowledge_items(db: Session, lead_id: int) -> list[dict[str, Any]]:
    records = db.query(KnowledgeChatLog).filter_by(lead_id=lead_id).all()
    return [
        _timeline_item(
            "knowledge_chat",
            "知识库问答",
            item.created_at,
            item.question,
            {"chat_id": item.id, "status": item.status},
        )
        for item in records
    ]


def _follow_up_items(db: Session, lead_id: int) -> list[dict[str, Any]]:
    records = db.query(CrmFollowUp).filter_by(lead_id=lead_id).all()
    return [
        _timeline_item(
            "follow_up",
            "新增跟进",
            item.created_at,
            item.content,
            {"follow_up_id": item.id, "follow_type": item.follow_type, "next_action": item.next_action},
        )
        for item in records
    ]


def _task_items(db: Session, lead_id: int) -> list[dict[str, Any]]:
    records = db.query(CrmTask).filter_by(lead_id=lead_id).all()
    items = [
        _timeline_item(
            "task",
            "创建任务",
            item.created_at,
            item.title,
            {"task_id": item.id, "status": item.status},
        )
        for item in records
    ]
    items.extend(
        _timeline_item(
            "task",
            "完成任务",
            item.completed_at,
            item.title,
            {"task_id": item.id, "status": item.status},
        )
        for item in records
        if item.completed_at
    )
    return items


def _stage_history_items(db: Session, lead_id: int) -> list[dict[str, Any]]:
    records = db.query(CrmStageHistory).filter_by(lead_id=lead_id).all()
    return [
        _timeline_item(
            "stage_history",
            "阶段流转",
            item.created_at,
            f"{item.from_status or '未设置'} -> {item.to_status}",
            {
                "history_id": item.id,
                "from_status": item.from_status,
                "to_status": item.to_status,
                "reason": item.reason,
            },
        )
        for item in records
    ]


def _event_items(db: Session, lead_id: int) -> list[dict[str, Any]]:
    records = (
        db.query(EventRegistration, EventLecture)
        .join(EventLecture, EventRegistration.event_id == EventLecture.id)
        .filter(EventRegistration.lead_id == lead_id)
        .all()
    )
    return [
        _timeline_item(
            "event_registration",
            "活动报名",
            registration.created_at,
            event.event_name,
            {"registration_id": registration.id, "event_id": event.id, "status": registration.status},
        )
        for registration, event in records
    ]


def _timeline_item(item_type: str, title: str, created_at: datetime | None, content: str, meta: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": item_type,
        "title": title,
        "content": content,
        "created_at": created_at.isoformat() if created_at else None,
        "meta": meta,
    }


def _timeline_sort_key(item: dict[str, Any]) -> str:
    return item["created_at"] or ""


def _create_audit_log(
    db: Session,
    actor: SysUser | None,
    action: str,
    resource_type: str,
    resource_id: str,
    detail: dict[str, Any],
) -> None:
    db.add(
        AuditLog(
            actor_user_id=actor.id if actor else None,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            detail=json.dumps(detail, ensure_ascii=False),
        )
    )


