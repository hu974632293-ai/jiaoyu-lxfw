import json
import re
from datetime import date, timedelta
from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session, object_session

from app.models.assistant import AssistantConversation, AssistantIntentLog, Nl2SqlQueryLog
from app.models.enterprise import EmployeeDirectory, EmployeeProfile, OrganizationUnit, WorkDailyReport
from app.models.event import EventLecture
from app.models.lead import CrmLead
from app.models.operation import AuditLog
from app.models.user import SysUser
from app.schemas.enterprise import DailyReportCreate, EnterpriseChatRequest, Nl2SqlQueryRequest, VoiceDraftRequest
from app.services.lead_service import update_lead_status


def handle_enterprise_chat(db: Session, payload: EnterpriseChatRequest) -> dict[str, Any]:
    message = payload.message.strip()
    intent = _detect_intent(message)

    if intent == "create_lead":
        customer_name = _extract_customer_name(message)
        phone = _extract_phone(message)
        result = {
            "draft": {
                "customer_name": customer_name,
                "contact_info": phone,
                "background_info": message,
                "source_channel": "????",
            },
            "requires_confirmation": True,
            "confirmation_endpoint": "/api/leads",
            "action_type": "create_lead",
        }
        answer = "?????????????????????"
        status = "draft"
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
        "requires_confirmation": result.get("requires_confirmation", False),
        "confirmation_endpoint": result.get("confirmation_endpoint", ""),
        "action_type": result.get("action_type", ""),
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


def build_voice_draft(payload: VoiceDraftRequest) -> dict[str, Any]:
    transcript = payload.transcript.strip()
    if payload.target_type == "lead":
        draft = {
            "customer_name": _extract_customer_name(transcript),
            "contact_info": _extract_phone(transcript),
            "background_info": transcript,
            "source_channel": "顾问录入",
            "owner_id": 1,
        }
        confirmation_endpoint = "/api/leads"
    else:
        summary = _structure_daily_report(transcript)
        draft = {
            "content": transcript,
            "actor_username": payload.actor_username,
            "structured_summary": summary["structured_summary"],
            "risks": summary["risks"],
        }
        confirmation_endpoint = "/api/enterprise-assistant/daily-reports"
    return {
        "target_type": payload.target_type,
        "transcript": transcript,
        "draft": draft,
        "requires_confirmation": True,
        "confirmation_endpoint": confirmation_endpoint,
        "write_policy": "结构化结果仅作为草稿展示，必须由用户确认后再写入业务表。",
    }


def list_daily_reports(
    db: Session,
    start_date: date | None = None,
    end_date: date | None = None,
    employee: str | None = None,
    department: str | None = None,
) -> list[dict[str, Any]]:
    reports = _daily_report_query(db, start_date, end_date, employee, department).order_by(
        WorkDailyReport.report_date.desc(),
        WorkDailyReport.id.desc(),
    ).limit(50).all()
    return [serialize_daily_report(item) for item in reports]


def get_daily_report(db: Session, report_id: int) -> dict[str, Any] | None:
    report = db.query(WorkDailyReport).filter(WorkDailyReport.id == report_id).first()
    return serialize_daily_report(report) if report else None


def daily_report_summary(
    db: Session,
    summary_type: str = "daily",
    target_date: date | None = None,
    week_start: date | None = None,
    department: str | None = None,
) -> dict[str, Any]:
    summary_type = "weekly" if summary_type == "weekly" else "daily"
    today = target_date or date.today()
    if summary_type == "weekly":
        period_start = week_start or (today - timedelta(days=today.weekday()))
        period_end = period_start + timedelta(days=6)
    else:
        period_start = target_date
        period_end = target_date
    reports = _daily_report_query(db, period_start, period_end, None, department).order_by(
        WorkDailyReport.report_date.desc(),
        WorkDailyReport.id.desc(),
    ).all()
    risks: list[str] = []
    progress: list[str] = []
    department_stats: dict[str, int] = {}
    employee_stats: dict[int, dict[str, Any]] = {}
    for report in reports:
        structured = _parse_json(report.structured_summary, {})
        report_risks = _parse_json(report.risks, [])
        if structured.get("progress"):
            progress.append(structured["progress"])
        risks.extend(str(item) for item in report_risks)
        employee_context = _employee_context(db, report.user_id)
        department_name = employee_context["department"] or "未分配部门"
        department_stats[department_name] = department_stats.get(department_name, 0) + 1
        employee_item = employee_stats.setdefault(
            report.user_id,
            {
                "user_id": report.user_id,
                "employee_name": employee_context["employee_name"],
                "department": department_name,
                "report_count": 0,
            },
        )
        employee_item["report_count"] += 1
    return {
        "summary_type": summary_type,
        "period_start": period_start.isoformat() if period_start else None,
        "period_end": period_end.isoformat() if period_end else None,
        "report_count": len(reports),
        "progress_text": "；".join(progress[:5]),
        "risks_text": "；".join(risks[:10]),
        "departments": [
            {"department": item[0], "report_count": item[1]}
            for item in sorted(department_stats.items(), key=lambda pair: pair[0])
        ],
        "employees": list(employee_stats.values()),
        "status": "summary_ready",
    }


def ensure_default_org_units(db: Session) -> None:
    defaults = [
        ("总经理办公室", "部门", "总部统筹 / 8000", "经营决策、资源协调、关键事项审批", 1),
        ("升学规划部", "部门", "升学咨询 / 8010", "客户咨询、项目匹配、申请规划", 2),
        ("双元制事业部", "部门", "赵凯 / 企业微信 / 8012", "德国双元制项目咨询、企业匹配、签证材料协同", 3),
        ("学生服务部", "部门", "周老师 / 企业微信 / 8020", "请假审批、投诉处理、学生关怀", 4),
    ]
    for unit_name, unit_type, contact_info, responsibilities, sort_order in defaults:
        unit = db.query(OrganizationUnit).filter_by(unit_name=unit_name).first()
        if not unit:
            unit = (
                OrganizationUnit(
                    unit_name=unit_name,
                    unit_type=unit_type,
                    contact_info=contact_info,
                    responsibilities=responsibilities,
                    sort_order=sort_order,
                )
            )
            db.add(unit)
        elif not unit.responsibilities:
            unit.responsibilities = responsibilities
    db.flush()
    directory_defaults = [
        ("赵凯", "双元制项目负责人", "企业微信 / 8012", "负责双元制项目咨询和企业资源协调", "双元制事业部"),
        ("周老师", "学生服务负责人", "企业微信 / 8020", "负责请假、反馈和学生关怀跟进", "学生服务部"),
    ]
    for display_name, role_title, contact_info, responsibilities, unit_name in directory_defaults:
        if db.query(EmployeeDirectory).filter_by(display_name=display_name).first():
            continue
        unit = db.query(OrganizationUnit).filter_by(unit_name=unit_name).first()
        db.add(
            EmployeeDirectory(
                organization_unit_id=unit.id if unit else None,
                display_name=display_name,
                role_title=role_title,
                contact_info=contact_info,
                responsibilities=responsibilities,
            )
        )
    db.commit()


def list_org_units(db: Session, keyword: str | None = None) -> list[dict[str, Any]]:
    ensure_default_org_units(db)
    query = db.query(OrganizationUnit)
    if keyword:
        like_keyword = f"%{keyword}%"
        query = query.filter(
            or_(
                OrganizationUnit.unit_name.like(like_keyword),
                OrganizationUnit.contact_info.like(like_keyword),
                OrganizationUnit.responsibilities.like(like_keyword),
            )
        )
    units = query.order_by(OrganizationUnit.sort_order, OrganizationUnit.id).all()
    return [
        {
            "id": item.id,
            "parent_id": item.parent_id,
            "unit_name": item.unit_name,
            "unit_type": item.unit_type,
            "leader_user_id": item.leader_user_id,
            "contact_info": item.contact_info,
            "responsibilities": item.responsibilities,
            "sort_order": item.sort_order,
        }
        for item in units
    ]


def list_directory_contacts(db: Session, keyword: str | None = None, department: str | None = None) -> list[dict[str, Any]]:
    ensure_default_org_units(db)
    query = db.query(EmployeeDirectory).outerjoin(
        OrganizationUnit,
        EmployeeDirectory.organization_unit_id == OrganizationUnit.id,
    )
    if keyword:
        like_keyword = f"%{keyword}%"
        query = query.filter(
            or_(
                EmployeeDirectory.display_name.like(like_keyword),
                EmployeeDirectory.role_title.like(like_keyword),
                EmployeeDirectory.contact_info.like(like_keyword),
                EmployeeDirectory.responsibilities.like(like_keyword),
                OrganizationUnit.unit_name.like(like_keyword),
            )
        )
    if department:
        query = query.filter(OrganizationUnit.unit_name == department)
    contacts = query.order_by(EmployeeDirectory.id.desc()).limit(50).all()
    return [serialize_directory_contact(db, item) for item in contacts]


def get_directory_contact(db: Session, contact_id: int) -> dict[str, Any] | None:
    contact = db.query(EmployeeDirectory).filter(EmployeeDirectory.id == contact_id).first()
    return serialize_directory_contact(db, contact) if contact else None


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
    employee_context = _employee_context(object_session(item), item.user_id)
    return {
        "id": item.id,
        "user_id": item.user_id,
        **employee_context,
        "report_date": item.report_date.isoformat() if item.report_date else None,
        "content": item.content,
        "structured_summary": _parse_json(item.structured_summary, {}),
        "risks": _parse_json(item.risks, []),
        "status": item.status,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def serialize_directory_contact(db: Session, item: EmployeeDirectory) -> dict[str, Any]:
    unit = db.query(OrganizationUnit).filter(OrganizationUnit.id == item.organization_unit_id).first()
    employee_no = ""
    department = unit.unit_name if unit else ""
    if item.employee_id:
        profile = db.query(EmployeeProfile).filter(EmployeeProfile.id == item.employee_id).first()
        if profile:
            employee_no = profile.employee_no
            department = profile.department or department
    return {
        "id": item.id,
        "employee_id": item.employee_id,
        "employee_no": employee_no,
        "organization_unit_id": item.organization_unit_id,
        "unit_name": unit.unit_name if unit else "",
        "department": department,
        "display_name": item.display_name,
        "role_title": item.role_title,
        "contact_info": item.contact_info,
        "responsibilities": item.responsibilities,
        "status": item.status,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def _daily_report_query(
    db: Session,
    start_date: date | None = None,
    end_date: date | None = None,
    employee: str | None = None,
    department: str | None = None,
):
    query = db.query(WorkDailyReport).outerjoin(SysUser, WorkDailyReport.user_id == SysUser.id).outerjoin(
        EmployeeProfile,
        EmployeeProfile.user_id == WorkDailyReport.user_id,
    )
    if start_date:
        query = query.filter(WorkDailyReport.report_date >= start_date)
    if end_date:
        query = query.filter(WorkDailyReport.report_date <= end_date)
    if employee:
        like_employee = f"%{employee}%"
        query = query.filter(or_(SysUser.real_name.like(like_employee), SysUser.username.like(like_employee)))
    if department:
        query = query.filter(EmployeeProfile.department == department)
    return query


def _employee_context(db: Session | None, user_id: int) -> dict[str, Any]:
    if not db:
        return {"employee_name": "", "employee_no": "", "department": "", "position": ""}
    user = db.query(SysUser).filter(SysUser.id == user_id).first()
    profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == user_id).first()
    return {
        "employee_name": user.real_name if user else "",
        "employee_no": profile.employee_no if profile else "",
        "department": profile.department if profile else "",
        "position": profile.position if profile else "",
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
