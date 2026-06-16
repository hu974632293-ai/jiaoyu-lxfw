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
    action_types = _resolve_consultant_action_types(payload.message)
    due_time = _resolve_task_due_time(payload.message, now)
    follow_content = (
        f"围绕{lead.customer_name}完成本次跟进：确认目标专业、申请时间和家长关注点；"
        f"当前阶段为{lead.status}，来源为{lead.source_channel or '客户增长'}。"
    )
    next_action = "三天后回访家长，确认专业方向、申请节奏和预算边界。"
    task_title = f"回访{lead.customer_name}：确认专业方向和申请节奏"

    actions_by_type = {
        "create_follow_up": ConsultantPendingAction(
            action_type="create_follow_up",
            label="新增跟进",
            draft={"follow_type": "电话", "content": follow_content, "next_action": next_action},
        ),
        "create_task": ConsultantPendingAction(
            action_type="create_task",
            label="创建任务",
            draft={"title": task_title, "due_time": due_time.isoformat()},
        ),
        "update_lead_status": ConsultantPendingAction(
            action_type="update_lead_status",
            label="阶段更新",
            draft={"status": "已初步研判", "reason": "顾问确认客户资料已完成初步研判"},
        ),
    }
    pending_actions = [actions_by_type[action_type] for action_type in action_types]
    action_labels = "、".join(item.label for item in pending_actions)

    return {
        "intent": "consultant_followup",
        "idempotency_key": f"consultant-agent-{lead.id}-{int(now.timestamp() * 1000)}",
        "requires_confirmation": True,
        "confirmation_endpoint": "/api/consultant-agent/actions/confirm",
        "answer": (
            f"已基于{lead.customer_name}的客户资料生成{action_labels}草稿。"
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


def _resolve_consultant_action_types(message: str) -> list[str]:
    text = (message or "").strip()
    default_actions = ["create_follow_up", "create_task", "update_lead_status"]

    requested: list[str] = []
    if _contains_any(text, ["跟进", "沟通记录", "电话记录", "电话跟"]):
        requested.append("create_follow_up")
    if _contains_any(text, ["任务", "待办", "回访任务"]):
        requested.append("create_task")
    if _contains_any(text, ["阶段", "状态", "推进"]):
        requested.append("update_lead_status")

    only_mode = _contains_any(text, ["只", "仅", "单独"])
    action_types = requested if only_mode and requested else default_actions.copy()

    if _contains_any(text, ["不要写跟进", "不要生成跟进", "不写跟进", "无需跟进记录", "先不要写跟进"]):
        action_types = [item for item in action_types if item != "create_follow_up"]
    if _contains_any(text, ["不要创建任务", "不要建任务", "不创建任务", "无需创建任务", "先不要创建任务"]):
        action_types = [item for item in action_types if item != "create_task"]
    if _contains_any(text, ["不要更新阶段", "不要改阶段", "不更新阶段", "不变更阶段", "先不要更新阶段"]):
        action_types = [item for item in action_types if item != "update_lead_status"]

    return action_types or default_actions


def _resolve_task_due_time(message: str, now: datetime) -> datetime:
    text = (message or "").strip()
    days = 3
    if "今天" in text:
        days = 0
    elif "明天" in text:
        days = 1
    elif "后天" in text:
        days = 2
    elif _contains_any(text, ["三天", "3天"]):
        days = 3

    due_time = now + timedelta(days=days)
    if "上午" in text:
        return due_time.replace(hour=10, minute=0, second=0, microsecond=0)
    if "下午" in text:
        return due_time.replace(hour=15, minute=0, second=0, microsecond=0)
    if "晚上" in text:
        return due_time.replace(hour=19, minute=0, second=0, microsecond=0)
    return due_time


def _contains_any(text: str, patterns: list[str]) -> bool:
    return any(item in text for item in patterns)


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
                "confirmed_actions": [action.model_dump() for action in payload.pending_actions],
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
