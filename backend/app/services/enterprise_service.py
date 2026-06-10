import json
import re
from datetime import date
from typing import Any

from sqlalchemy.orm import Session

from app.models.assistant import AssistantConversation, AssistantIntentLog, Nl2SqlQueryLog
from app.models.enterprise import OrganizationUnit, WorkDailyReport
from app.models.event import EventLecture
from app.models.lead import CrmLead
from app.models.operation import AuditLog
from app.models.user import SysUser
from app.schemas.enterprise import DailyReportCreate, EnterpriseChatRequest, Nl2SqlQueryRequest
from app.services.lead_service import update_lead_status


def handle_enterprise_chat(db: Session, payload: EnterpriseChatRequest) -> dict[str, Any]:
    message = payload.message.strip()
    intent = _detect_intent(message)

    if intent == "create_lead":
        result = _create_lead_from_message(db, message, payload.actor_username)
        answer = f"已创建客户：{result['customer_name']}，当前阶段：{result['status']}。"
        status = "success"
    elif intent == "query_lead":
        result = _query_leads(db, message)
        answer = f"找到 {len(result['leads'])} 条匹配客户。"
        status = "success"
    elif intent == "update_lead_status":
        result = _update_lead_status_from_message(db, message, payload.actor_username)
        answer = f"已更新客户 #{result['lead_id']} 状态为 {result['status']}。"
        status = "success"
    else:
        result = _guide_answer(db)
        answer = result["answer"]
        status = "fallback"

    conversation = _record_conversation(db, payload.actor_username, message, answer, intent, status)
    _record_intent(db, conversation.id, intent, result, status)
    db.commit()
    return {
        "conversation_id": conversation.id,
        "intent": intent,
        "status": status,
        "answer": answer,
        "result": result,
    }


def create_daily_report(db: Session, payload: DailyReportCreate) -> dict[str, Any]:
    actor = _get_actor(db, payload.actor_username)
    summary = _structure_daily_report(payload.content)
    report = WorkDailyReport(
        user_id=actor.id if actor else _ensure_system_user(db).id,
        report_date=date.today(),
        content=payload.content,
        structured_summary=json.dumps(summary["structured_summary"], ensure_ascii=False),
        risks=json.dumps(summary["risks"], ensure_ascii=False),
    )
    db.add(report)
    db.flush()
    _create_audit_log(
        db,
        actor,
        "提交企业日报",
        "work_daily_report",
        str(report.id),
        {"progress": summary["structured_summary"]["progress"], "risks": summary["risks"]},
    )
    db.commit()
    db.refresh(report)
    return serialize_daily_report(report)


def list_daily_reports(db: Session) -> list[dict[str, Any]]:
    reports = db.query(WorkDailyReport).order_by(WorkDailyReport.id.desc()).limit(50).all()
    return [serialize_daily_report(item) for item in reports]


def daily_report_summary(db: Session) -> dict[str, Any]:
    reports = db.query(WorkDailyReport).order_by(WorkDailyReport.id.desc()).limit(20).all()
    risks: list[str] = []
    progress: list[str] = []
    for report in reports:
        structured = _parse_json(report.structured_summary, {})
        report_risks = _parse_json(report.risks, [])
        if structured.get("progress"):
            progress.append(structured["progress"])
        risks.extend(str(item) for item in report_risks)
    return {
        "report_count": len(reports),
        "progress_text": "；".join(progress[:5]),
        "risks_text": "；".join(risks[:10]),
        "status": "summary_ready",
    }


def ensure_default_org_units(db: Session) -> None:
    defaults = [
        ("总经理办公室", "部门", "总部统筹 / 8000", 1),
        ("升学规划部", "部门", "升学咨询 / 8010", 2),
        ("双元制事业部", "部门", "赵凯 / 企业微信 / 8012", 3),
        ("学生服务部", "部门", "周老师 / 企业微信 / 8020", 4),
    ]
    for unit_name, unit_type, contact_info, sort_order in defaults:
        if not db.query(OrganizationUnit).filter_by(unit_name=unit_name).first():
            db.add(
                OrganizationUnit(
                    unit_name=unit_name,
                    unit_type=unit_type,
                    contact_info=contact_info,
                    sort_order=sort_order,
                )
            )
    db.commit()


def list_org_units(db: Session) -> list[dict[str, Any]]:
    ensure_default_org_units(db)
    units = db.query(OrganizationUnit).order_by(OrganizationUnit.sort_order, OrganizationUnit.id).all()
    return [
        {
            "id": item.id,
            "parent_id": item.parent_id,
            "unit_name": item.unit_name,
            "unit_type": item.unit_type,
            "leader_user_id": item.leader_user_id,
            "contact_info": item.contact_info,
            "sort_order": item.sort_order,
        }
        for item in units
    ]


def run_controlled_nl2sql(db: Session, payload: Nl2SqlQueryRequest) -> dict[str, Any]:
    actor = _get_actor(db, payload.actor_username)
    question = payload.question.strip()
    lowered = question.lower()
    blocked_keywords = ["删除", "清空", "更新", "修改", "drop", "delete", "update", "insert"]
    if any(keyword in lowered or keyword in question for keyword in blocked_keywords):
        result = {
            "status": "blocked",
            "sql_template": "",
            "result": {"reason": "仅允许白名单只读查询，不执行写 SQL。"},
        }
    elif "高潜" in question or "high_potential" in lowered:
        count = db.query(CrmLead).filter(CrmLead.status == "high_potential").count()
        result = {
            "status": "success",
            "sql_template": "count_high_potential_leads",
            "result": {"count": count},
        }
    elif "活动" in question:
        count = db.query(EventLecture).count()
        result = {
            "status": "success",
            "sql_template": "count_events",
            "result": {"count": count},
        }
    else:
        count = db.query(CrmLead).count()
        result = {
            "status": "success",
            "sql_template": "count_leads",
            "result": {"count": count},
        }

    log = Nl2SqlQueryLog(
        user_id=actor.id if actor else None,
        question=question,
        sql_template=result["sql_template"],
        result_json=json.dumps(result["result"], ensure_ascii=False),
        status=result["status"],
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    result["id"] = log.id
    return result


def serialize_daily_report(item: WorkDailyReport) -> dict[str, Any]:
    return {
        "id": item.id,
        "user_id": item.user_id,
        "report_date": item.report_date.isoformat() if item.report_date else None,
        "content": item.content,
        "structured_summary": _parse_json(item.structured_summary, {}),
        "risks": _parse_json(item.risks, []),
        "status": item.status,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def _detect_intent(message: str) -> str:
    if "录入" in message or "新增客户" in message:
        return "create_lead"
    if "状态更新" in message or "更新为" in message:
        return "update_lead_status"
    if "查询客户" in message or "查客户" in message:
        return "query_lead"
    return "guide_qa"


def _create_lead_from_message(db: Session, message: str, actor_username: str | None) -> dict[str, Any]:
    customer_name = _extract_customer_name(message)
    contact_info = _extract_phone(message)
    lead = CrmLead(
        customer_name=customer_name,
        contact_info=contact_info,
        background_info=message,
        status="新增意向",
    )
    db.add(lead)
    db.flush()
    _create_audit_log(
        db,
        _get_actor(db, actor_username),
        "企业助手创建客户",
        "crm_lead",
        str(lead.id),
        {"customer_name": lead.customer_name, "source": "enterprise_assistant"},
    )
    return {"lead_id": lead.id, "customer_name": lead.customer_name, "contact_info": lead.contact_info, "status": lead.status}


def _query_leads(db: Session, message: str) -> dict[str, Any]:
    keyword = message.replace("查询客户", "").replace("查客户", "").strip()
    query = db.query(CrmLead)
    if keyword:
        query = query.filter(CrmLead.customer_name.contains(keyword))
    leads = query.order_by(CrmLead.id.desc()).limit(10).all()
    return {
        "leads": [
            {
                "id": item.id,
                "customer_name": item.customer_name,
                "contact_info": item.contact_info,
                "status": item.status,
            }
            for item in leads
        ]
    }


def _update_lead_status_from_message(db: Session, message: str, actor_username: str | None) -> dict[str, Any]:
    lead_id_match = re.search(r"客户\s*(\d+)", message)
    status_match = re.search(r"更新为\s*([a-zA-Z_一-龥]+)", message)
    if not lead_id_match or not status_match:
        raise ValueError("缺少客户 ID 或目标状态")
    lead_id = int(lead_id_match.group(1))
    status = status_match.group(1).rstrip("，。,. ")
    lead = update_lead_status(db, lead_id, status, "企业助手自然语言状态更新", actor_username)
    if not lead:
        raise ValueError("客户不存在")
    _create_audit_log(
        db,
        _get_actor(db, actor_username),
        "企业助手更新客户状态",
        "crm_lead",
        str(lead.id),
        {"status": status},
    )
    return {"lead_id": lead.id, "customer_name": lead.customer_name, "status": lead.status}


def _guide_answer(db: Session) -> dict[str, Any]:
    ensure_default_org_units(db)
    unit = db.query(OrganizationUnit).filter(OrganizationUnit.unit_name == "双元制事业部").first()
    answer = (
        f"新人入职先完成账号开通、制度学习、跟岗 3 天和首周日报。"
        f"双元制事业部负责人信息：{unit.contact_info if unit else '赵凯 / 企业微信 / 8012'}。"
    )
    return {"answer": answer, "fallback_reason": "Dify 未配置或未调用真实知识库，使用企业指南模板 fallback。"}


def _structure_daily_report(content: str) -> dict[str, Any]:
    parts = re.split(r"[，。；;]", content)
    progress = next((part for part in parts if "跟进" in part or "客户" in part), content)
    risk = next((part for part in parts if "风险" in part or "不齐" in part or "影响" in part), "")
    next_action = next((part for part in parts if "明天" in part or "下一步" in part or "补齐" in part), "")
    return {
        "structured_summary": {
            "progress": progress.strip(),
            "next_action": next_action.strip(),
        },
        "risks": [risk.strip()] if risk.strip() else [],
    }


def _record_conversation(
    db: Session,
    actor_username: str | None,
    question: str,
    answer: str,
    intent: str,
    status: str,
) -> AssistantConversation:
    actor = _get_actor(db, actor_username)
    conversation = AssistantConversation(
        user_id=actor.id if actor else None,
        assistant_type="enterprise",
        question=question,
        answer=answer,
        intent=intent,
        status=status,
    )
    db.add(conversation)
    db.flush()
    return conversation


def _record_intent(db: Session, conversation_id: int, intent: str, result: dict[str, Any], status: str) -> None:
    db.add(
        AssistantIntentLog(
            conversation_id=conversation_id,
            intent=intent,
            confidence=0.86,
            parsed_payload=json.dumps(result, ensure_ascii=False),
            status=status,
        )
    )


def _extract_customer_name(message: str) -> str:
    match = re.search(r"客户[:：]\s*([^，,。]+)", message)
    if match:
        return match.group(1).strip()
    match = re.search(r"客户\s*([^，,。]+)", message)
    return match.group(1).strip() if match else "企业助手录入客户"


def _extract_phone(message: str) -> str:
    match = re.search(r"1\d{10}", message)
    return match.group(0) if match else ""


def _get_actor(db: Session, username: str | None) -> SysUser | None:
    if not username:
        return None
    return db.query(SysUser).filter_by(username=username).first()


def _ensure_system_user(db: Session) -> SysUser:
    user = db.query(SysUser).filter_by(username="admin").first()
    if user:
        return user
    user = SysUser(username="admin", password_hash="demo", real_name="演示管理员", user_type="EMPLOYEE", role="admin")
    db.add(user)
    db.flush()
    return user


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


def _parse_json(raw: str | None, default: Any) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return default
