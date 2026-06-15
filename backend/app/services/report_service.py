import base64
import json
import zipfile
from collections import Counter
from datetime import date
from html import escape
from io import BytesIO
from typing import Any

from sqlalchemy.orm import Session

from app.models.enterprise import WorkDailyReport
from app.models.lead import CrmLead, LeadProfileAssessment
from app.models.operation import AuditLog
from app.models.report import ReportSnapshot
from app.models.student import StudentFeedbackTicket, StudentPsychAlert
from app.models.user import SysUser
from app.schemas.report import ReportGenerateRequest
from app.services.crm_service import list_lead_timeline


def generate_customer_operation_report(db: Session, generated_by: str = "system"):
    report = ReportSnapshot(
        report_type="customer_operation",
        title="客户经营分析报告",
        content_json=json.dumps(_build_customer_operation_content(db), ensure_ascii=False),
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


def export_report_snapshot(db: Session, report_id: int, export_format: str, exported_by: str = "system") -> dict[str, Any]:
    file_format = export_format.lower()
    if file_format not in {"pdf", "docx"}:
        raise ValueError("不支持的导出格式")

    report = db.query(ReportSnapshot).filter(ReportSnapshot.id == report_id).first()
    if not report:
        raise LookupError("报告不存在")

    content = _parse_json(report.content_json, {})
    export_text = _render_report_export_text(report, content)
    if file_format == "pdf":
        file_bytes = _build_pdf_bytes(export_text)
        content_type = "application/pdf"
    else:
        file_bytes = _build_docx_bytes(export_text)
        content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    filename = f"report-{report.id}-{report.report_type}.{file_format}"
    audit_log = _create_audit_log(
        db,
        exported_by,
        "导出报告快照",
        "report_snapshot",
        str(report.id),
        {"format": file_format, "filename": filename},
    )
    db.flush()
    export_id = audit_log.id
    db.commit()

    return {
        "export_id": export_id,
        "report_id": report.id,
        "format": file_format,
        "filename": filename,
        "content_type": content_type,
        "content_base64": base64.b64encode(file_bytes).decode("ascii"),
        "size": len(file_bytes),
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
        "recent_customer_changes": _recent_customer_changes(db, leads),
        "risks": _customer_risks(leads, high_value),
        "suggestions": [
            "优先跟进画像评分超过 70 分的客户",
            "对缺少联系方式或学历信息的客户进行二次补充",
            "将高潜客户导流到项目说明会并记录活动转化",
        ],
    }


def _recent_customer_changes(db: Session, leads: list[CrmLead]) -> list[dict[str, Any]]:
    recent_leads = sorted(leads, key=lambda item: item.updated_at or item.created_at, reverse=True)[:10]
    changes = []
    for lead in recent_leads:
        timeline = list_lead_timeline(db, lead.id) or []
        timeline_titles = [item["title"] for item in timeline if item["title"] != "创建线索"]
        changes.append(
            {
                "lead_id": lead.id,
                "customer_name": lead.customer_name,
                "source_channel": lead.source_channel,
                "status": lead.status,
                "timeline_titles": timeline_titles[:5],
            }
        )
    return changes


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


def _render_report_export_text(report: ReportSnapshot, content: dict[str, Any]) -> list[str]:
    lines = [
        report.title,
        f"报告编号：{report.id}",
        f"报告类型：{report.report_type}",
        f"时间范围：{_date_text(report.period_start) or '未限定'} 至 {_date_text(report.period_end) or '未限定'}",
        f"生成人：{report.generated_by}",
        "",
    ]
    for key, value in content.items():
        lines.append(f"{_report_export_key(key)}：{_report_export_value(value)}")
    return lines


def _report_export_key(value: str) -> str:
    return value.replace("_", " ")


def _report_export_value(value: Any) -> str:
    if isinstance(value, dict):
        return "；".join(f"{_report_export_key(str(key))}：{_report_export_value(item)}" for key, item in value.items()) or "暂无"
    if isinstance(value, list):
        return "；".join(_report_export_value(item) for item in value) or "暂无"
    return str(value if value is not None else "暂无")


def _build_pdf_bytes(lines: list[str]) -> bytes:
    content_lines = ["BT", "/F1 11 Tf", "50 790 Td"]
    for index, line in enumerate(lines[:38]):
        if index:
            content_lines.append("0 -18 Td")
        content_lines.append(f"<{_pdf_text_hex(line[:96])}> Tj")
    content_lines.append("ET")
    stream = "\n".join(content_lines).encode("ascii")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    return _compose_pdf(objects)


def _pdf_text_hex(value: str) -> str:
    return ("feff" + value.encode("utf-16-be", errors="replace").hex()).upper()


def _compose_pdf(objects: list[bytes]) -> bytes:
    output = BytesIO()
    output.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for index, item in enumerate(objects, start=1):
        offsets.append(output.tell())
        output.write(f"{index} 0 obj\n".encode("ascii"))
        output.write(item)
        output.write(b"\nendobj\n")
    xref_offset = output.tell()
    output.write(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    output.write(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        output.write(f"{offset:010d} 00000 n \n".encode("ascii"))
    output.write(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF".encode("ascii"))
    return output.getvalue()


def _build_docx_bytes(lines: list[str]) -> bytes:
    paragraphs = "\n".join(f"<w:p><w:r><w:t>{escape(line)}</w:t></w:r></w:p>" for line in lines)
    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body>{paragraphs}<w:sectPr /></w:body></w:document>"
    )
    with BytesIO() as buffer:
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
            archive.writestr(
                "[Content_Types].xml",
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                '<Default Extension="xml" ContentType="application/xml"/>'
                '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
                "</Types>",
            )
            archive.writestr(
                "_rels/.rels",
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
                "</Relationships>",
            )
            archive.writestr("word/document.xml", document_xml)
        return buffer.getvalue()


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
) -> AuditLog:
    actor = _get_actor(db, actor_username)
    log = AuditLog(
        actor_user_id=actor.id if actor else None,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        detail=json.dumps(detail, ensure_ascii=False),
    )
    db.add(log)
    return log


def _parse_json(raw: str | None, default: Any) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return default


def _date_text(value: date | None) -> str | None:
    return value.isoformat() if value else None
