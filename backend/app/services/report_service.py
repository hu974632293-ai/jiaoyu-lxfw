import json
from collections import Counter
from datetime import date
from typing import Any

from sqlalchemy.orm import Session

from app.models.enterprise import WorkDailyReport
from app.models.lead import CrmLead, LeadProfileAssessment
from app.models.operation import AuditLog
from app.models.report import ReportSnapshot
from app.models.student import StudentFeedbackTicket, StudentPsychAlert
from app.models.user import SysUser
from app.schemas.report import ReportGenerateRequest


def generate_customer_operation_report(db: Session, generated_by: str = "system"):
    leads = db.query(CrmLead).all()
    assessments = db.query(LeadProfileAssessment).all()

    project_counter = Counter(item.matched_project for item in assessments if item.matched_project)
    high_value = [
        {
            "assessment_id": item.id,
            "matched_project": item.matched_project,
            "singapore_score": item.singapore_score,
            "germany_score": item.germany_score,
        }
        for item in assessments
        if max(item.singapore_score, item.germany_score) >= 70
    ]

    content = {
        "summary": {
            "lead_count": len(leads),
            "assessment_count": len(assessments),
            "high_value_count": len(high_value),
        },
        "project_distribution": dict(project_counter),
        "high_value_leads": high_value,
        "suggestions": [
            "优先跟进画像评分超过 70 分的客户",
            "对缺少联系方式或学历信息的客户进行二次补充",
            "将新加坡升学意向客户导流到线上说明会",
            "将德国职业教育意向客户安排顾问确认德语和职业方向",
        ],
    }

    report = ReportSnapshot(
        report_type="customer_operation",
        title="客户经营分析报告",
        content_json=json.dumps(content, ensure_ascii=False),
        generated_by=generated_by,
        generation_mode="template",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def generate_report_snapshot(db: Session, payload: ReportGenerateRequest) -> ReportSnapshot:
    report_builders = {
        "customer_operation": _build_customer_operation_content,
        "daily_summary": _build_daily_summary_content,
        "student_psych_weekly": _build_student_psych_content,
        "feedback_weekly": _build_feedback_content,
    }
    if payload.report_type not in report_builders:
        raise ValueError("不支持的报告类型")

    content = report_builders[payload.report_type](db)
    report = ReportSnapshot(
        report_type=payload.report_type,
        title=_report_title(payload.report_type),
        period_start=payload.period_start,
        period_end=payload.period_end,
        content_json=json.dumps(content, ensure_ascii=False),
        generated_by=payload.generated_by,
        generation_mode="template",
    )
    db.add(report)
    db.flush()
    _create_audit_log(
        db,
        payload.generated_by,
        "生成报告快照",
        "report_snapshot",
        str(report.id),
        {"report_type": payload.report_type, "period_start": _date_text(payload.period_start), "period_end": _date_text(payload.period_end)},
    )
    db.commit()
    db.refresh(report)
    return report


def serialize_report_summary(item: ReportSnapshot) -> dict[str, Any]:
    return {
        "id": item.id,
        "title": item.title,
        "report_type": item.report_type,
        "period_start": item.period_start.isoformat() if item.period_start else None,
        "period_end": item.period_end.isoformat() if item.period_end else None,
        "generated_by": item.generated_by,
        "generation_mode": item.generation_mode,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def serialize_report_detail(item: ReportSnapshot) -> dict[str, Any]:
    return {
        **serialize_report_summary(item),
        "content": _parse_json(item.content_json, {}),
    }


def _build_customer_operation_content(db: Session) -> dict[str, Any]:
    leads = db.query(CrmLead).all()
    assessments = db.query(LeadProfileAssessment).all()
    status_counter = Counter(item.status for item in leads)
    project_counter = Counter(item.matched_project for item in assessments if item.matched_project)
    high_value = [
        {
            "assessment_id": item.id,
            "matched_project": item.matched_project,
            "singapore_score": item.singapore_score,
            "germany_score": item.germany_score,
        }
        for item in assessments
        if max(item.singapore_score, item.germany_score) >= 70
    ]
    return {
        "summary": {
            "lead_count": len(leads),
            "assessment_count": len(assessments),
            "high_value_count": len(high_value),
            "converted_count": status_counter.get("已转化", 0) + status_counter.get("converted", 0),
            "lost_count": status_counter.get("流失", 0) + status_counter.get("lost", 0),
        },
        "project_distribution": dict(project_counter),
        "status_distribution": dict(status_counter),
        "high_value_leads": high_value,
        "risks": _customer_risks(leads, high_value),
        "suggestions": [
            "优先跟进画像评分超过 70 分的客户",
            "对缺少联系方式或学历信息的客户进行二次补充",
            "将高潜客户导流到项目说明会并记录活动转化",
        ],
    }


def _build_daily_summary_content(db: Session) -> dict[str, Any]:
    reports = db.query(WorkDailyReport).order_by(WorkDailyReport.id.desc()).limit(50).all()
    risks: list[str] = []
    progress: list[str] = []
    for report in reports:
        structured = _parse_json(report.structured_summary, {})
        if structured.get("progress"):
            progress.append(structured["progress"])
        risks.extend(str(item) for item in _parse_json(report.risks, []))
    return {
        "summary": {
            "report_count": len(reports),
            "risk_count": len(risks),
            "progress_samples": progress[:5],
        },
        "risks": risks,
        "suggestions": [
            "管理者每日查看风险项并分配责任人",
            "对重复出现的材料、签证和活动邀约问题做周度复盘",
            "将日报风险与 CRM 任务、学生服务待办联动跟进",
        ],
    }


def _build_student_psych_content(db: Session) -> dict[str, Any]:
    alerts = db.query(StudentPsychAlert).order_by(StudentPsychAlert.id.desc()).limit(100).all()
    risk_counter = Counter(item.risk_level for item in alerts)
    pending_count = sum(1 for item in alerts if item.status != "已关闭")
    return {
        "summary": {
            "alert_count": len(alerts),
            "pending_count": pending_count,
            "high_risk_count": risk_counter.get("高", 0),
        },
        "risk_distribution": dict(risk_counter),
        "risks": [item.trigger_reason for item in alerts[:10]],
        "suggestions": [
            "老师优先跟进高风险和待跟进预警",
            "记录跟进动作和学生反馈，必要时引导专业支持",
            "周会只讨论支持路径，不把辅助识别当作诊断结论",
        ],
        "safety_note": "心理预警仅为辅助识别，不替代专业心理诊断。",
    }


def _build_feedback_content(db: Session) -> dict[str, Any]:
    tickets = db.query(StudentFeedbackTicket).order_by(StudentFeedbackTicket.id.desc()).limit(100).all()
    category_counter = Counter(item.category for item in tickets)
    status_counter = Counter(item.status for item in tickets)
    unresolved = [item for item in tickets if item.status != "已处理"]
    return {
        "summary": {
            "ticket_count": len(tickets),
            "unresolved_count": len(unresolved),
            "handled_count": status_counter.get("已处理", 0),
        },
        "category_distribution": dict(category_counter),
        "status_distribution": dict(status_counter),
        "risks": [item.summary or item.content for item in unresolved[:10]],
        "suggestions": [
            "优先处理投诉类和超时未处理工单",
            "按住宿、签证、课程等类别汇总高频问题",
            "处理结果同步给学生，并沉淀到知识库或服务 SOP",
        ],
    }


def _customer_risks(leads: list[CrmLead], high_value: list[dict[str, Any]]) -> list[str]:
    risks = []
    missing_contact = sum(1 for item in leads if not item.contact_info)
    if missing_contact:
        risks.append(f"{missing_contact} 个客户缺少联系方式")
    if not high_value:
        risks.append("当前缺少高评分画像客户，需要补充有效客户资料")
    return risks


def _report_title(report_type: str) -> str:
    return {
        "customer_operation": "客户经营分析报告",
        "daily_summary": "员工日报汇总报告",
        "student_psych_weekly": "学生心理健康周报",
        "feedback_weekly": "投诉处理周报",
    }[report_type]


def _get_actor(db: Session, username: str | None) -> SysUser | None:
    if not username:
        return None
    return db.query(SysUser).filter_by(username=username).first()


def _create_audit_log(
    db: Session,
    actor_username: str | None,
    action: str,
    resource_type: str,
    resource_id: str,
    detail: dict[str, Any],
) -> None:
    actor = _get_actor(db, actor_username)
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


def _date_text(value: date | None) -> str | None:
    return value.isoformat() if value else None
