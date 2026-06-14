import json
import re
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.assistant import AgentActionLog
from app.models.assistant import KnowledgeSource, KnowledgeSyncJob
from app.models.enterprise import EmployeeDirectory, OrganizationUnit
from app.models.knowledge import ChatMessage, ChatSession, KnowledgeChatLog
from app.models.lead import CrmLead
from app.models.operation import AuditLog
from app.models.user import SysUser
from app.schemas.knowledge import KnowledgeSourceCreate, KnowledgeSourceUpdate, KnowledgeSyncJobCreate
from app.services.dify_client import DifyClient
from app.services.enterprise_service import ensure_default_org_units
from app.services.fallback_answers import match_scene_answer

SCENE_LABELS = {
    "customer_service": "客服咨询",
    "enterprise_guide": "企业新人指南",
    "student_life": "学生生活支持",
    "customer_assessment": "客户研判",
    "report_assistant": "报告解释",
    "policy": "留学政策",
}


async def ask_knowledge(db: Session, payload) -> dict[str, Any]:
    client = DifyClient()
    request_context = {
        "scene": payload.scene,
        "role": payload.role,
        "actor_username": payload.actor_username,
        "lead_id": payload.lead_id,
        "student_id": payload.student_id,
        "business_context": payload.business_context,
        "action_mode": payload.action_mode,
        "dify_app_id": _resolve_dify_app_id(payload.scene),
    }
    question = payload.question
    conversation_id = payload.conversation_id
    session = _resolve_chat_session(db, payload)
    action_result = _build_employee_agent_result(db, payload, session)
    if action_result:
        result = {
            "answer": action_result["answer"],
            "citations": [],
            "conversation_id": conversation_id or "",
            "status": "success",
        }
    else:
        action_result = _default_action_result()
        try:
            result = await client.chat(question, conversation_id=conversation_id, inputs=request_context, user=payload.actor_username or payload.role or "anonymous")
        except Exception as exc:
            result = {
                "answer": f"Dify 调用失败：{exc}",
                "citations": [],
                "conversation_id": conversation_id or "",
                "status": "error",
            }

    fallback_reason = _fallback_reason(result["status"])

    # Dify 未配置或调用异常时，用场景化模板兜底，避免阻断主业务。
    if result["status"] in {"fallback", "error"}:
        result["answer"] = match_scene_answer(payload.scene, question)
    citations_json = json.dumps(result["citations"], ensure_ascii=False)
    log = KnowledgeChatLog(
        lead_id=payload.lead_id,
        scene=payload.scene,
        question=question,
        answer=result["answer"],
        citations=citations_json,
        dify_conversation_id=result["conversation_id"],
        status=result["status"],
        fallback_reason=fallback_reason,
    )
    db.add(log)
    if session:
        session.updated_at = datetime.utcnow()
        db.add(ChatMessage(session_id=session.id, role="user", content=question, status="success"))
        db.add(ChatMessage(session_id=session.id, role="assistant", content=result["answer"], citations=citations_json, status=result["status"]))
        if action_result["requires_confirmation"]:
            _record_pending_agent_action(db, payload, session, action_result)
    db.commit()
    db.refresh(log)
    if session:
        db.refresh(session)
    return {
        "id": log.id,
        "scene": log.scene,
        "request_context": request_context,
        "scene_label": SCENE_LABELS.get(log.scene, log.scene),
        "answer": log.answer,
        "citations": result["citations"],
        "conversation_id": log.dify_conversation_id,
        "session_id": session.id if session else None,
        "messages": _serialize_session_messages(db, session.id) if session else [],
        "status": log.status,
        "fallback_reason": log.fallback_reason,
        **action_result,
    }


def get_latest_chat_session(db: Session, scene: str, channel: str = "web", actor_username: str | None = None) -> dict[str, Any]:
    actor = _get_actor(db, actor_username)
    query = db.query(ChatSession).filter(ChatSession.scene == scene, ChatSession.channel == channel, ChatSession.status == "active")
    if actor:
        query = query.filter(ChatSession.user_id == actor.id)
    elif actor_username:
        return {"session_id": None, "scene": scene, "channel": channel, "messages": []}
    else:
        query = query.filter(ChatSession.user_id.is_(None))
    session = query.order_by(ChatSession.updated_at.desc(), ChatSession.id.desc()).first()
    if not session:
        return {"session_id": None, "scene": scene, "channel": channel, "messages": []}
    return {
        "session_id": session.id,
        "scene": session.scene,
        "channel": session.channel,
        "messages": _serialize_session_messages(db, session.id),
        "latest_action": _latest_pending_agent_action(db, actor.id if actor else None, session.id),
    }


def _resolve_dify_app_id(scene: str) -> str:
    from app.core.config import settings

    for item in settings.dify_app_id_map.split(","):
        key, _, value = item.partition(":")
        if key.strip() == scene:
            return value.strip()
    return ""


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


def _resolve_chat_session(db: Session, payload) -> ChatSession | None:
    if not payload.actor_username and payload.channel == "web" and not payload.session_id:
        return None
    actor = _get_actor(db, payload.actor_username)
    if payload.session_id:
        query = db.query(ChatSession).filter(ChatSession.id == payload.session_id, ChatSession.status == "active")
        if actor:
            query = query.filter(ChatSession.user_id == actor.id)
        session = query.first()
        if session:
            return session
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.user_id == (actor.id if actor else None),
            ChatSession.scene == payload.scene,
            ChatSession.channel == payload.channel,
            ChatSession.status == "active",
        )
        .order_by(ChatSession.updated_at.desc(), ChatSession.id.desc())
        .first()
    )
    if session:
        return session
    session = ChatSession(
        user_id=actor.id if actor else None,
        student_id=payload.student_id,
        lead_id=payload.lead_id,
        scene=payload.scene,
        channel=payload.channel,
        status="active",
    )
    db.add(session)
    db.flush()
    return session


def _serialize_session_messages(db: Session, session_id: int) -> list[dict[str, Any]]:
    items = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.id.asc()).limit(100).all()
    return [
        {
            "id": item.id,
            "role": item.role,
            "content": item.content,
            "citations": _parse_json_list(item.citations),
            "status": item.status,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in items
    ]


def _get_actor(db: Session, username: str | None) -> SysUser | None:
    if not username:
        return None
    return db.query(SysUser).filter_by(username=username).first()


def _default_action_result() -> dict[str, Any]:
    return {
        "action_type": "answer",
        "action_status": "suggested",
        "requires_confirmation": False,
        "draft": None,
        "target_type": "",
        "target_id": None,
        "next_step": "继续追问或进入对应业务页处理",
        "business_result": {},
        "idempotency_key": "",
    }


def _build_employee_agent_result(db: Session, payload, session: ChatSession | None) -> dict[str, Any] | None:
    if payload.channel != "employee_agent" or not str(payload.scene).startswith("enterprise_"):
        return None

    question = payload.question.strip()
    if payload.scene == "enterprise_customer":
        return _customer_result(db, payload, session)
    if payload.scene == "enterprise_org":
        return _org_contact_result(db, question)
    if payload.scene == "enterprise_guide":
        return _guide_result()
    if payload.scene == "enterprise_daily":
        return _daily_result(payload, session)
    return _default_action_result() | {"answer": "可以继续说明你的业务目标，我会先给出建议；需要写入时会等你确认。"}


def _customer_result(db: Session, payload, session: ChatSession | None) -> dict[str, Any]:
    question = payload.question.strip()
    if _is_update_lead_status_intent(question):
        draft = _build_update_lead_status_draft(question)
        if draft:
            return {
                **_default_action_result(),
                "answer": f"已生成客户状态更新草稿：客户 #{draft['lead_id']} 更新为 {draft['status']}。确认后再同步。",
                "action_type": "update_lead_status",
                "action_status": "waiting_confirmation",
                "requires_confirmation": True,
                "draft": draft,
                "target_type": "crm_lead",
                "target_id": draft["lead_id"],
                "next_step": "确认后同步到客户列表、客户 360 和阶段记录",
                "business_result": {"lead_id": draft["lead_id"], "status": draft["status"]},
                "idempotency_key": _build_idempotency_key(payload, session, "lead-status"),
            }
    if _is_create_lead_intent(question):
        draft = _build_create_lead_draft(question)
        return {
            **_default_action_result(),
            "answer": f"已生成客户录入草稿：{draft['customer_name']}。确认后再保存到客户增长。",
            "action_type": "create_lead",
            "action_status": "waiting_confirmation",
            "requires_confirmation": True,
            "draft": draft,
            "target_type": "crm_lead",
            "next_step": "确认后同步到客户增长和客户 360",
            "business_result": {"customer_name": draft["customer_name"], "contact_info": draft["contact_info"]},
            "idempotency_key": _build_idempotency_key(payload, session, "lead-create"),
        }
    return _customer_summary_result(db)


def _customer_summary_result(db: Session) -> dict[str, Any]:
    high_potential_count = db.query(CrmLead).filter(CrmLead.status == "high_potential").count()
    latest_leads = (
        db.query(CrmLead)
        .filter(CrmLead.status == "high_potential")
        .order_by(CrmLead.updated_at.desc(), CrmLead.id.desc())
        .limit(3)
        .all()
    )
    names = "、".join(item.customer_name for item in latest_leads) or "暂无高潜客户名单"
    answer = f"当前高潜客户 {high_potential_count} 个。重点先跟进：{names}；建议先补齐最近沟通记录，再安排下一次触达。"
    return {
        **_default_action_result(),
        "answer": answer,
        "action_type": "query_customer_summary",
        "target_type": "crm_lead",
        "next_step": "进入客户增长查看名单并补充跟进记录",
        "business_result": {
            "high_potential_count": high_potential_count,
            "focus_leads": [{"id": item.id, "customer_name": item.customer_name, "status": item.status} for item in latest_leads],
        },
    }


def _org_contact_result(db: Session, question: str) -> dict[str, Any]:
    ensure_default_org_units(db)
    keyword = "投诉" if "投诉" in question else "学生服务" if "学生" in question else ""
    query = db.query(EmployeeDirectory).outerjoin(OrganizationUnit, EmployeeDirectory.organization_unit_id == OrganizationUnit.id)
    if keyword:
        like_keyword = f"%{keyword}%"
        contact = query.filter(
            (EmployeeDirectory.responsibilities.like(like_keyword))
            | (EmployeeDirectory.role_title.like(like_keyword))
            | (OrganizationUnit.unit_name.like(like_keyword))
            | (OrganizationUnit.responsibilities.like(like_keyword))
        ).first()
        if not contact and keyword in {"投诉", "学生服务"}:
            contact = (
                db.query(EmployeeDirectory)
                .filter(
                    (EmployeeDirectory.role_title.like("%学生服务%"))
                    | (EmployeeDirectory.responsibilities.like("%学生%"))
                    | (EmployeeDirectory.display_name == "周老师")
                )
                .first()
            )
    else:
        contact = query.first()
    if not contact:
        answer = "暂未找到明确负责人，请先联系学生服务部值班同事确认。"
        business_result = {}
    else:
        unit = db.query(OrganizationUnit).filter(OrganizationUnit.id == contact.organization_unit_id).first()
        answer = (
            f"{contact.display_name}负责这类事项，岗位是{contact.role_title or '负责人'}，"
            f"联系方式：{contact.contact_info or '企业微信'}。处理入口建议走{unit.unit_name if unit else '对应部门'}，下一步先登记投诉内容和紧急程度。"
        )
        business_result = {
            "contact_id": contact.id,
            "display_name": contact.display_name,
            "role_title": contact.role_title,
            "contact_info": contact.contact_info,
        }
    return {
        **_default_action_result(),
        "answer": answer,
        "action_type": "query_org_contact",
        "target_type": "employee_directory",
        "next_step": "按负责人信息登记事项并继续追问处理口径",
        "business_result": business_result,
    }


def _guide_result() -> dict[str, Any]:
    return {
        **_default_action_result(),
        "answer": "新人第一周先完成账号开通、制度学习、跟岗熟悉业务、提交首周日报；遇到客户、学生或投诉事项时，先确认所属业务页再处理。",
        "action_type": "query_employee_guide",
        "target_type": "employee_guide",
        "next_step": "按清单完成入职事项，遇到具体问题继续追问",
    }


def _daily_result(payload, session: ChatSession | None) -> dict[str, Any]:
    question = payload.question.strip()
    if not _is_daily_write_intent(question):
        return {
            **_default_action_result(),
            "answer": "你好。你可以直接口述今天做了什么、风险是什么、明天准备做什么；我会整理成日报草稿，确认后再同步。",
            "next_step": "补充今日进展、风险和明日计划",
        }
    idempotency_key = _build_idempotency_key(payload, session, "daily")
    return {
        **_default_action_result(),
        "answer": f"已整理为日报草稿：{question}",
        "action_type": "submit_daily_report",
        "action_status": "waiting_confirmation",
        "requires_confirmation": True,
        "draft": {"content": question},
        "target_type": "work_daily_report",
        "next_step": "确认后同步到员工日报和管理者日报汇总",
        "business_result": {"content_preview": question[:80]},
        "idempotency_key": idempotency_key,
    }


def _is_daily_write_intent(question: str) -> bool:
    intent_words = ["日报", "日结", "工作总结", "生成草稿", "提交"]
    business_words = ["跟进", "客户", "学生", "风险", "明天", "下一步", "材料", "联系"]
    return any(word in question for word in intent_words) and any(word in question for word in business_words)


def _is_create_lead_intent(question: str) -> bool:
    return any(word in question for word in ["新增客户", "录入客户", "创建客户", "保存客户"])


def _is_update_lead_status_intent(question: str) -> bool:
    return "客户" in question and ("状态" in question or "更新为" in question)


def _build_create_lead_draft(question: str) -> dict[str, Any]:
    phone = re.search(r"1\d{10}", question)
    name_match = re.search(r"客户[:：]\s*([^，,。]+)", question)
    customer_name = name_match.group(1).strip() if name_match else "企业助手录入客户"
    return {
        "customer_name": customer_name,
        "contact_info": phone.group(0) if phone else "",
        "background_info": question,
        "source_channel": "企业助手",
    }


def _build_update_lead_status_draft(question: str) -> dict[str, Any] | None:
    lead_id_match = re.search(r"客户\s*(\d+)", question)
    status_match = re.search(r"更新为\s*([a-zA-Z_一-龥]+)", question)
    if not lead_id_match or not status_match:
        return None
    return {
        "lead_id": int(lead_id_match.group(1)),
        "status": status_match.group(1).rstrip("，。,. "),
        "reason": "企业助手确认更新",
    }


def _build_idempotency_key(payload, session: ChatSession | None, suffix: str) -> str:
    actor = payload.actor_username or payload.role or "anonymous"
    session_part = session.id if session else "new"
    stamp = int(datetime.utcnow().timestamp() * 1000)
    return f"{actor}-{payload.scene}-{session_part}-{stamp}-{suffix}"


def _record_pending_agent_action(db: Session, payload, session: ChatSession, action_result: dict[str, Any]) -> None:
    actor = _get_actor(db, payload.actor_username)
    db.add(
        AgentActionLog(
            user_id=actor.id if actor else None,
            assistant_type="employee_agent",
            action_type=action_result["action_type"],
            target_type=action_result["target_type"],
            target_id=None,
            payload_json=json.dumps(
                {
                    "idempotency_key": action_result["idempotency_key"],
                    "session_id": session.id,
                    "draft": action_result["draft"],
                    "next_step": action_result["next_step"],
                    "business_result": action_result["business_result"],
                },
                ensure_ascii=False,
            ),
            status="pending",
        )
    )


def _latest_pending_agent_action(db: Session, user_id: int | None, session_id: int) -> dict[str, Any] | None:
    query = db.query(AgentActionLog).filter(
        AgentActionLog.assistant_type == "employee_agent",
        AgentActionLog.status == "pending",
    )
    query = query.filter(AgentActionLog.user_id == user_id) if user_id is not None else query.filter(AgentActionLog.user_id.is_(None))
    for item in query.order_by(AgentActionLog.id.desc()).limit(50).all():
        payload = _parse_json_dict(item.payload_json)
        if payload.get("session_id") != session_id:
            continue
        return {
            "action_type": item.action_type,
            "action_status": "waiting_confirmation",
            "requires_confirmation": True,
            "draft": payload.get("draft"),
            "target_type": item.target_type,
            "target_id": item.target_id,
            "next_step": payload.get("next_step") or "确认后同步业务记录",
            "business_result": payload.get("business_result") or {},
            "idempotency_key": payload.get("idempotency_key") or "",
        }
    return None


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


def _parse_json_dict(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return value if isinstance(value, dict) else {}


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
