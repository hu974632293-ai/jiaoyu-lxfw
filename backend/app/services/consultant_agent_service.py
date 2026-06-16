import json
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.models.assistant import AgentActionLog
from app.models.crm import CrmTask
from app.models.lead import CrmLead
from app.models.user import SysUser
from app.schemas.consultant_agent import ConsultantAgentChatRequest, ConsultantAgentConfirmRequest, ConsultantPendingAction
from app.schemas.crm import CrmFollowUpCreate, CrmTaskCreate
from app.services.crm_service import create_follow_up, create_task, list_lead_timeline
from app.services.lead_service import get_lead, list_leads, update_lead_status
from app.services.scope_service import ensure_can_access_lead


def build_consultant_agent_draft(db: Session, payload: ConsultantAgentChatRequest, actor: SysUser) -> dict[str, Any]:
    if payload.lead_id is None:
        return _build_consultant_object_discovery(db, payload, actor)

    ensure_can_access_lead(db, actor, payload.lead_id)
    lead = get_lead(db, payload.lead_id)
    if not lead:
        raise ValueError("客户不存在")

    timeline = list_lead_timeline(db, lead.id) or []
    recent_items = [item["title"] for item in timeline[:3]]
    now = datetime.now(UTC).replace(tzinfo=None)
    conversation_context = _normalize_conversation_context(payload.conversation_context)
    context_sources = ["crm_lead", "crm_timeline", "conversation_context"]
    if _is_context_query(payload.message):
        return {
            "intent": "consultant_context_query",
            "idempotency_key": f"consultant-agent-query-{lead.id}-{int(now.timestamp() * 1000)}",
            "requires_confirmation": False,
            "requires_more_info": False,
            "confirmation_endpoint": "/api/consultant-agent/actions/confirm",
            "answer": _build_context_query_answer(lead, timeline),
            "follow_up_questions": [],
            "lead_context": {
                "id": lead.id,
                "customer_name": lead.customer_name,
                "status": lead.status,
                "source_channel": lead.source_channel,
                "background_info": lead.background_info,
                "recent_timeline": recent_items,
                "conversation_context": conversation_context,
            },
            "orchestration": _build_orchestration_contract(
                lead_id=lead.id,
                intent="consultant_context_query",
                mode="read_context",
                requires_confirmation=False,
                context_sources=context_sources,
                action_types=[],
                next_step="suggest_followup_or_task_if_needed",
            ),
            "pending_actions": [],
        }

    if _should_ask_for_more_info(payload.message, lead.background_info or "", conversation_context):
        follow_up_questions = _build_follow_up_questions(payload.message, lead.background_info or "", conversation_context)
        return {
            "intent": "consultant_followup",
            "idempotency_key": f"consultant-agent-{lead.id}-{int(now.timestamp() * 1000)}",
            "requires_confirmation": False,
            "requires_more_info": True,
            "confirmation_endpoint": "/api/consultant-agent/actions/confirm",
            "answer": f"{lead.customer_name}当前资料还不足以判断项目匹配，请先补充关键信息。",
            "follow_up_questions": follow_up_questions,
            "lead_context": {
                "id": lead.id,
                "customer_name": lead.customer_name,
                "status": lead.status,
                "source_channel": lead.source_channel,
                "background_info": lead.background_info,
                "recent_timeline": recent_items,
                "conversation_context": conversation_context,
            },
            "orchestration": _build_orchestration_contract(
                lead_id=lead.id,
                intent="consultant_followup",
                mode="ask_more_info",
                requires_confirmation=False,
                context_sources=context_sources,
                action_types=[],
                next_step="collect_missing_customer_context",
            ),
            "pending_actions": [],
        }

    action_types = _resolve_consultant_action_types(payload.message)
    due_time = _resolve_task_due_time(payload.message, now)
    supplemental_context = _extract_supplemental_context(payload.message)
    follow_content = (
        f"围绕{lead.customer_name}完成本次跟进：确认目标专业、申请时间和家长关注点；"
        f"当前阶段为{lead.status}，来源为{lead.source_channel or '客户增长'}。"
    )
    if supplemental_context:
        follow_content = f"{follow_content} 本轮补充：{supplemental_context}。"
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
        "requires_more_info": False,
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
            "conversation_context": conversation_context,
        },
        "follow_up_questions": [],
        "orchestration": _build_orchestration_contract(
            lead_id=lead.id,
            intent="consultant_followup",
            mode="draft_then_confirm",
            requires_confirmation=True,
            context_sources=context_sources,
            action_types=action_types,
            next_step="confirm_selected_business_actions",
        ),
        "pending_actions": [item.model_dump() for item in pending_actions],
    }


def _build_consultant_object_discovery(
    db: Session, payload: ConsultantAgentChatRequest, actor: SysUser
) -> dict[str, Any]:
    now = datetime.now(UTC).replace(tzinfo=None)
    candidates = _discover_consultant_leads(db, payload.message, actor)
    candidate_cards = [_serialize_candidate_lead(db, item) for item in candidates[:5]]
    answer = _build_discovery_answer(payload.message, candidate_cards)
    return {
        "intent": "consultant_object_discovery",
        "idempotency_key": f"consultant-agent-discovery-{actor.id}-{int(now.timestamp() * 1000)}",
        "requires_confirmation": False,
        "requires_more_info": False,
        "confirmation_endpoint": "/api/consultant-agent/actions/confirm",
        "answer": answer,
        "lead_context": None,
        "candidate_leads": candidate_cards,
        "follow_up_questions": [],
        "orchestration": _build_orchestration_contract(
            lead_id=None,
            target_type="crm_lead_queue",
            intent="consultant_object_discovery",
            mode="object_discovery",
            requires_confirmation=False,
            context_sources=["crm_lead_queue", "crm_task"],
            action_types=[],
            next_step="select_customer_or_refine_query",
        ),
        "pending_actions": [],
    }


def _build_orchestration_contract(
    *,
    lead_id: int | None,
    intent: str,
    mode: str,
    requires_confirmation: bool,
    context_sources: list[str],
    action_types: list[str],
    next_step: str,
    target_type: str = "crm_lead",
) -> dict[str, Any]:
    return {
        "mode": mode,
        "role": "consultant",
        "intent": intent,
        "target": {"type": target_type, "id": lead_id},
        "context_sources": context_sources,
        "requires_confirmation": requires_confirmation,
        "business_tools": [
            {"tool": action_type, "execution": "after_user_confirmation"} for action_type in action_types
        ],
        "next_step": next_step,
    }


def _discover_consultant_leads(db: Session, message: str, actor: SysUser) -> list[CrmLead]:
    text = (message or "").strip()
    if _contains_any(text, ["官网", "咨询", "新线索", "来的线索"]):
        return list_leads(db, owner_id=actor.id, source_channel="官网咨询")[:5]

    if _contains_any(text, ["待办", "任务", "优先处理", "今天"]):
        return _discover_consultant_task_leads(db, actor)

    keyword = _extract_customer_keyword(text)
    if keyword:
        return list_leads(db, keyword=keyword, owner_id=actor.id)[:5]

    return list_leads(db, owner_id=actor.id)[:5]


def _discover_consultant_task_leads(db: Session, actor: SysUser) -> list[CrmLead]:
    tasks = (
        db.query(CrmTask)
        .filter(
            CrmTask.owner_id == actor.id,
            CrmTask.status != "已完成",
            CrmTask.lead_id.isnot(None),
        )
        .order_by(CrmTask.due_time.is_(None), CrmTask.due_time.asc(), CrmTask.id.desc())
        .limit(10)
        .all()
    )
    lead_ids: list[int] = []
    for task in tasks:
        if task.lead_id and task.lead_id not in lead_ids:
            lead_ids.append(task.lead_id)
    if not lead_ids:
        return []
    leads = db.query(CrmLead).filter(CrmLead.id.in_(lead_ids), CrmLead.owner_id == actor.id).all()
    leads_by_id = {lead.id: lead for lead in leads}
    return [leads_by_id[lead_id] for lead_id in lead_ids if lead_id in leads_by_id][:5]


def _serialize_candidate_lead(db: Session, lead: CrmLead) -> dict[str, Any]:
    timeline = list_lead_timeline(db, lead.id) or []
    open_task_count = (
        db.query(CrmTask)
        .filter(
            CrmTask.lead_id == lead.id,
            CrmTask.status != "已完成",
        )
        .count()
    )
    return {
        "id": lead.id,
        "customer_name": lead.customer_name,
        "contact_info": lead.contact_info,
        "status": lead.status,
        "source_channel": lead.source_channel,
        "recent_timeline": [item["title"] for item in timeline[:3]],
        "open_task_count": open_task_count,
        "customer360_target": {"page": "consultantCustomer360", "lead_id": lead.id},
    }


def _build_discovery_answer(message: str, candidate_cards: list[dict[str, Any]]) -> str:
    if not candidate_cards:
        return "当前没有找到符合条件的客户或线索。你可以换一个姓名、手机号、来源或时间范围继续查。"
    if len(candidate_cards) == 1:
        lead = candidate_cards[0]
        if _is_todo_queue_question(message):
            return (
                f"找到1个有待办的客户：{lead['customer_name']}，当前还有{lead.get('open_task_count') or 0}项待办。"
                "可以选择它继续查看最近跟进、待办或卡点。"
            )
        return (
            f"找到1条可处理线索：{lead['customer_name']}，来源{lead['source_channel'] or '客户增长'}，"
            f"当前阶段{lead['status']}。可以选择它继续查看最近跟进、待办或卡点。"
        )
    if _is_todo_queue_question(message):
        return f"找到{len(candidate_cards)}个有待办的客户，请选择一个优先处理。"
    if _contains_any(message or "", ["官网", "咨询", "新线索", "来的线索"]):
        return f"找到{len(candidate_cards)}条官网咨询线索，请选择一个客户继续推进。"
    return f"找到{len(candidate_cards)}个可能匹配的客户，请选择一个再继续查看最近跟进、待办或卡点。"


def _is_todo_queue_question(message: str) -> bool:
    text = message or ""
    if _contains_any(text, ["官网", "咨询", "新线索", "来的线索"]):
        return False
    return _contains_any(text, ["待办", "任务", "优先处理", "今天"])


def _is_context_query(message: str) -> bool:
    return _contains_any(message or "", ["最近跟进", "跟进了什么", "待办", "卡在哪里", "卡住", "现在怎么样"])


def _build_context_query_answer(lead: CrmLead, timeline: list[dict[str, Any]]) -> str:
    recent_details = [item.get("content") or item.get("detail") or item.get("title") or "" for item in timeline[:3]]
    recent_text = "；".join(item for item in recent_details if item) or "暂无最近跟进记录"
    blockers = _extract_blocker_text(recent_text, lead.background_info or "")
    return (
        f"{lead.customer_name}当前阶段是{lead.status}，来源{lead.source_channel or '客户增长'}。"
        f"最近记录：{recent_text}。"
        f"当前卡点：{blockers}。如需推进，可以继续让我生成跟进记录或回访任务。"
    )


def _extract_blocker_text(recent_text: str, background_info: str) -> str:
    combined = f"{recent_text} {background_info}"
    if "语言成绩" in combined or "雅思" in combined or "托福" in combined:
        return "语言成绩或考试材料需要继续补齐"
    if "预算" in combined:
        return "预算和方案边界需要继续确认"
    if "材料" in combined:
        return "申请材料需要继续补齐"
    return "需要结合下一次沟通确认预算、目标专业和申请节奏"


def _extract_customer_keyword(message: str) -> str:
    text = (message or "").strip()
    for suffix in ["最近怎么样", "现在怎么样", "卡在哪里", "最近跟进了什么", "还有哪些待办"]:
        text = text.replace(suffix, "")
    for token in ["帮我看看", "看一下", "这个客户", "客户", "线索", "？", "?", "，", ","]:
        text = text.replace(token, " ")
    parts = [part.strip() for part in text.split() if part.strip()]
    return parts[0] if parts else ""


def _resolve_consultant_action_types(message: str) -> list[str]:
    text = (message or "").strip()
    default_actions = ["create_follow_up", "create_task", "update_lead_status"]

    requested: list[str] = []
    if _contains_any(text, ["跟进", "沟通记录", "电话记录", "电话跟"]):
        requested.append("create_follow_up")
    if _contains_any(text, ["任务", "待办", "回访", "回访任务"]):
        requested.append("create_task")
    if _contains_any(text, ["阶段", "状态", "推进"]):
        requested.append("update_lead_status")

    action_types = requested or default_actions.copy()

    if _contains_any(text, ["不要写跟进", "不要生成跟进", "不写跟进", "无需跟进记录", "先不要写跟进"]):
        action_types = [item for item in action_types if item != "create_follow_up"]
    if _contains_any(text, ["不要创建任务", "不要建任务", "不创建任务", "无需创建任务", "先不要创建任务"]):
        action_types = [item for item in action_types if item != "create_task"]
    if _contains_any(text, ["不要更新阶段", "不要改阶段", "不更新阶段", "不变更阶段", "先不要更新阶段"]):
        action_types = [item for item in action_types if item != "update_lead_status"]

    return action_types or default_actions


def _should_ask_for_more_info(message: str, background_info: str, conversation_context: list[str]) -> bool:
    text = _join_context(message, background_info, conversation_context)
    asks_assessment = _contains_any(message, ["适合哪个项目", "项目匹配", "判断项目", "推荐项目", "研判", "适合"])
    return asks_assessment and not _has_budget_signal(text)


def _build_follow_up_questions(message: str, background_info: str, conversation_context: list[str]) -> list[str]:
    text = _join_context(message, background_info, conversation_context)
    questions = []
    if not _has_budget_signal(text):
        questions.append("预算范围大概是多少？")
    if not _contains_any(text, ["雅思", "托福", "语言", "英语"]):
        questions.append("目前语言成绩或英语水平如何？")
    if not _contains_any(text, ["入学", "申请时间", "时间线", "明年", "今年"]):
        questions.append("计划什么时候入学或递交申请？")
    return questions or ["请补充预算、语言成绩和目标入学时间。"]


def _has_budget_signal(text: str) -> bool:
    return _contains_any(text, ["预算", "费用", "万", "人民币", "资金"])


def _join_context(message: str, background_info: str, conversation_context: list[str]) -> str:
    return " ".join([message or "", background_info or "", *conversation_context])


def _normalize_conversation_context(items: list[str]) -> list[str]:
    return [str(item).strip() for item in items if str(item).strip()][:5]


def _extract_supplemental_context(message: str) -> str:
    markers = ["预算", "雅思", "托福", "语言", "入学", "申请"]
    if not _contains_any(message, markers):
        return ""
    return message.strip()


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
