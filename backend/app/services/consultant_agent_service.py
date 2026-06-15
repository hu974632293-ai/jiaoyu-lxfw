import json
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.models.assistant import AgentActionLog
from app.models.user import SysUser
from app.schemas.consultant_agent import ConsultantAgentChatRequest, ConsultantAgentConfirmRequest, ConsultantPendingAction
from app.schemas.crm import CrmFollowUpCreate, CrmTaskCreate
from app.services.crm_service import create_follow_up, create_task, list_lead_timeline
from app.services.lead_service import get_lead, update_lead_status
from app.services.scope_service import ensure_can_access_lead


def build_consultant_agent_draft(db: Session, payload: ConsultantAgentChatRequest, actor: SysUser) -> dict[str, Any]:
    ensure_can_access_lead(db, actor, payload.lead_id)
    lead = get_lead(db, payload.lead_id)
    if not lead:
        raise ValueError("客户不存在")

    timeline = list_lead_timeline(db, lead.id) or []
    recent_items = [item["title"] for item in timeline[:3]]
    now = datetime.now(UTC).replace(tzinfo=None)
    due_time = now + timedelta(days=3)
    follow_content = (
        f"围绕{lead.customer_name}完成本次跟进：确认目标专业、申请时间和家长关注点；"
        f"当前阶段为{lead.status}，来源为{lead.source_channel or '客户增长'}。"
    )
    next_action = "三天后回访家长，确认专业方向、申请节奏和预算边界。"
    task_title = f"回访{lead.customer_name}：确认专业方向和申请节奏"

    pending_actions = [
        ConsultantPendingAction(
            action_type="create_follow_up",
            label="新增跟进",
            draft={"follow_type": "电话", "content": follow_content, "next_action": next_action},
        ),
        ConsultantPendingAction(
            action_type="create_task",
            label="创建任务",
            draft={"title": task_title, "due_time": due_time.isoformat()},
        ),
        ConsultantPendingAction(
            action_type="update_lead_status",
            label="阶段更新",
            draft={"status": "已初步研判", "reason": "顾问确认客户资料已完成初步研判"},
        ),
    ]

    return {
        "intent": "consultant_followup",
        "idempotency_key": f"consultant-agent-{lead.id}-{int(now.timestamp() * 1000)}",
        "requires_confirmation": True,
        "confirmation_endpoint": "/api/consultant-agent/actions/confirm",
        "answer": (
            f"已基于{lead.customer_name}的客户资料生成跟进、任务和阶段建议。"
            "请先确认草稿，再写入CRM记录。"
        ),
        "lead_context": {
            "id": lead.id,
            "customer_name": lead.customer_name,
            "status": lead.status,
            "source_channel": lead.source_channel,
            "background_info": lead.background_info,
            "recent_timeline": recent_items,
        },
        "pending_actions": [item.model_dump() for item in pending_actions],
    }


def confirm_consultant_agent_actions(db: Session, payload: ConsultantAgentConfirmRequest, actor: SysUser) -> dict[str, Any]:
    ensure_can_access_lead(db, actor, payload.lead_id)
    existing = _find_confirmed_action(db, actor.id, payload.idempotency_key)
    if existing:
        stored = _parse_json(existing.payload_json, {})
        return {
            "lead_id": payload.lead_id,
            "results": stored.get("results", []),
            "action_log_id": existing.id,
            "idempotent": True,
        }

    results: list[dict[str, Any]] = []
    for action in payload.pending_actions:
        results.append(_apply_consultant_action(db, payload.lead_id, action, actor))

    action_log = AgentActionLog(
        user_id=actor.id,
        assistant_type="consultant_agent",
        action_type="consultant_golden_path",
        target_type="crm_lead",
        target_id=payload.lead_id,
        payload_json=json.dumps(
            {
                "idempotency_key": payload.idempotency_key,
                "lead_id": payload.lead_id,
                "results": results,
            },
            ensure_ascii=False,
        ),
        status="success",
    )
    db.add(action_log)
    db.commit()
    db.refresh(action_log)
    return {
        "lead_id": payload.lead_id,
        "results": results,
        "action_log_id": action_log.id,
        "idempotent": False,
    }


def _apply_consultant_action(db: Session, lead_id: int, action: ConsultantPendingAction, actor: SysUser) -> dict[str, Any]:
    if action.action_type == "create_follow_up":
        follow_up = create_follow_up(
            db,
            lead_id,
            CrmFollowUpCreate(
                follow_type=str(action.draft.get("follow_type") or "电话"),
                content=str(action.draft.get("content") or "").strip(),
                next_action=str(action.draft.get("next_action") or "").strip(),
                operator_username=actor.username,
            ),
        )
        if not follow_up:
            raise ValueError("客户不存在")
        return {"action_type": action.action_type, "target_type": "crm_follow_up", "target_id": follow_up.id}

    if action.action_type == "create_task":
        task = create_task(
            db,
            CrmTaskCreate(
                lead_id=lead_id,
                title=str(action.draft.get("title") or "客户回访任务").strip(),
                due_time=_parse_due_time(action.draft.get("due_time")),
                owner_username=actor.username,
            ),
        )
        if not task:
            raise ValueError("客户不存在")
        return {"action_type": action.action_type, "target_type": "crm_task", "target_id": task.id}

    if action.action_type == "update_lead_status":
        status = str(action.draft.get("status") or "").strip()
        if not status:
            raise ValueError("缺少目标阶段")
        lead = update_lead_status(
            db,
            lead_id,
            status,
            str(action.draft.get("reason") or "顾问确认阶段更新").strip(),
            actor.username,
        )
        if not lead:
            raise ValueError("客户不存在")
        return {"action_type": action.action_type, "target_type": "crm_lead", "target_id": lead.id}

    raise ValueError("不支持的顾问动作")


def _find_confirmed_action(db: Session, user_id: int, idempotency_key: str) -> AgentActionLog | None:
    records = (
        db.query(AgentActionLog)
        .filter(
            AgentActionLog.user_id == user_id,
            AgentActionLog.assistant_type == "consultant_agent",
            AgentActionLog.action_type == "consultant_golden_path",
            AgentActionLog.status == "success",
        )
        .order_by(AgentActionLog.id.desc())
        .limit(50)
        .all()
    )
    for item in records:
        payload = _parse_json(item.payload_json, {})
        if payload.get("idempotency_key") == idempotency_key:
            return item
    return None


def _parse_due_time(raw_value: Any) -> datetime | None:
    if raw_value is None or isinstance(raw_value, datetime):
        return raw_value
    try:
        return datetime.fromisoformat(str(raw_value))
    except ValueError:
        return None


def _parse_json(raw_value: str | None, default: Any) -> Any:
    if not raw_value:
        return default
    try:
        return json.loads(raw_value)
    except json.JSONDecodeError:
        return default
