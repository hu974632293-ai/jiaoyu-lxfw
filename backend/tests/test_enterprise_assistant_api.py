import json
from datetime import date, timedelta

from fastapi.testclient import TestClient

from app.core.database import init_db
from app.core.database import SessionLocal
from app.main import app
from app.models.enterprise import EmployeeDirectory, EmployeeProfile, OrganizationUnit, WorkDailyReport
from app.models.lead import CrmLead
from app.models.user import SysUser


init_db()
client = TestClient(app)


def test_enterprise_assistant_chat_daily_org_nl2sql_and_audit_api():
    seed_response = client.post("/api/demo/seed")
    assert seed_response.status_code == 200
    assert seed_response.json()["code"] == 0

    create_lead_response = client.post(
        "/api/enterprise-assistant/chat",
        json={
            "message": "帮我录入一个客户：阶段六企业助手客户，高三，想去新加坡读本科，家长关注费用，电话 13900006666",
            "actor_username": "admin",
        },
    )
    assert create_lead_response.status_code == 200
    create_lead_payload = create_lead_response.json()
    assert create_lead_payload["code"] == 0
    assert create_lead_payload["data"]["intent"] == "create_lead"
    lead_id = create_lead_payload["data"]["result"]["lead_id"]
    assert create_lead_payload["data"]["result"]["customer_name"] == "阶段六企业助手客户"

    query_response = client.post(
        "/api/enterprise-assistant/chat",
        json={"message": "查询客户 阶段六企业助手客户", "actor_username": "admin"},
    )
    assert query_response.status_code == 200
    query_payload = query_response.json()
    assert query_payload["code"] == 0
    assert query_payload["data"]["intent"] == "query_lead"
    assert any(item["id"] == lead_id for item in query_payload["data"]["result"]["leads"])

    update_status_response = client.post(
        "/api/enterprise-assistant/chat",
        json={"message": f"把客户 {lead_id} 状态更新为 high_potential，原因：已确认预算", "actor_username": "admin"},
    )
    assert update_status_response.status_code == 200
    update_status_payload = update_status_response.json()
    assert update_status_payload["code"] == 0
    assert update_status_payload["data"]["intent"] == "update_lead_status"
    assert update_status_payload["data"]["result"]["status"] == "high_potential"

    daily_response = client.post(
        "/api/enterprise-assistant/daily-reports",
        json={
            "content": "今天跟进 8 个客户，2 个高潜进入活动邀约，风险是德国项目材料不齐，明天补齐材料清单。",
            "actor_username": "admin",
        },
    )
    assert daily_response.status_code == 200
    daily_payload = daily_response.json()
    assert daily_payload["code"] == 0
    assert daily_payload["data"]["structured_summary"]["progress"].startswith("今天跟进")
    assert daily_payload["data"]["risks"]

    reports_response = client.get("/api/enterprise-assistant/daily-reports")
    assert reports_response.status_code == 200
    reports_payload = reports_response.json()
    assert reports_payload["code"] == 0
    assert any(item["id"] == daily_payload["data"]["id"] for item in reports_payload["data"])

    summary_response = client.get("/api/enterprise-assistant/daily-reports/summary")
    assert summary_response.status_code == 200
    summary_payload = summary_response.json()
    assert summary_payload["code"] == 0
    assert summary_payload["data"]["report_count"] >= 1
    assert "德国项目材料不齐" in summary_payload["data"]["risks_text"]

    org_response = client.get("/api/enterprise-assistant/org-units")
    assert org_response.status_code == 200
    org_payload = org_response.json()
    assert org_payload["code"] == 0
    assert any(item["unit_name"] == "双元制事业部" for item in org_payload["data"])

    guide_response = client.post(
        "/api/enterprise-assistant/chat",
        json={"message": "查一下双元制事业部负责人和新人入职流程", "actor_username": "admin"},
    )
    assert guide_response.status_code == 200
    guide_payload = guide_response.json()
    assert guide_payload["code"] == 0
    assert guide_payload["data"]["intent"] == "guide_qa"
    assert guide_payload["data"]["status"] == "fallback"
    assert "新人入职" in guide_payload["data"]["answer"]

    nl2sql_response = client.post(
        "/api/enterprise-assistant/nl2sql/query",
        json={"question": "查询本周高潜线索数量", "actor_username": "admin"},
    )
    assert nl2sql_response.status_code == 200
    nl2sql_payload = nl2sql_response.json()
    assert nl2sql_payload["code"] == 0
    assert nl2sql_payload["data"]["status"] == "success"
    assert nl2sql_payload["data"]["sql_template"] == "count_high_potential_leads"

    blocked_response = client.post(
        "/api/enterprise-assistant/nl2sql/query",
        json={"question": "删除所有客户", "actor_username": "admin"},
    )
    assert blocked_response.status_code == 200
    blocked_payload = blocked_response.json()
    assert blocked_payload["code"] == 0
    assert blocked_payload["data"]["status"] == "blocked"

    audit_response = client.get("/api/audit/logs")
    assert audit_response.status_code == 200
    audit_actions = [item["action"] for item in audit_response.json()["data"]]
    assert "企业助手创建客户" in audit_actions
    assert "企业助手更新客户状态" in audit_actions
    assert "提交企业日报" in audit_actions


def test_daily_report_filters_detail_summary_and_directory_api():
    seed_response = client.post("/api/demo/seed")
    assert seed_response.status_code == 200
    assert seed_response.json()["code"] == 0

    report_day = date(2026, 6, 12)
    other_day = report_day - timedelta(days=1)
    weekly_start = report_day - timedelta(days=report_day.weekday())
    with SessionLocal() as db:
        consultant = _ensure_user(db, "stage6_consultant", "阶段六顾问")
        teacher = _ensure_user(db, "stage6_teacher", "阶段六老师")
        _ensure_employee_profile(db, consultant, "S6-CONSULTANT", "升学规划部", "顾问")
        _ensure_employee_profile(db, teacher, "S6-TEACHER", "学生服务部", "老师")
        db.query(WorkDailyReport).filter(WorkDailyReport.user_id.in_([consultant.id, teacher.id])).delete(
            synchronize_session=False
        )
        _ensure_org_unit(db, "升学规划部", "客户咨询、项目匹配、申请规划", "8010")
        service_unit = _ensure_org_unit(db, "学生服务部", "请假审批、投诉处理、学生关怀", "8020")
        contact = _ensure_directory_contact(db, teacher, service_unit, "阶段六周老师", "学生服务负责人", "wecom:zhou", "负责学生服务跟进")
        _create_report(db, consultant, report_day, "今天跟进阶段六客户，风险是材料不齐，明天补齐。")
        _create_report(db, teacher, report_day, "今天处理学生反馈，下一步同步老师。")
        _create_report(db, consultant, other_day, "昨天跟进历史客户。")
        db.commit()
        contact_id = contact.id

    filtered_response = client.get(
        "/api/enterprise-assistant/daily-reports",
        params={
            "start_date": report_day.isoformat(),
            "end_date": report_day.isoformat(),
            "employee": "阶段六顾问",
            "department": "升学规划部",
        },
    )
    assert filtered_response.status_code == 200
    filtered_payload = filtered_response.json()
    assert filtered_payload["code"] == 0
    assert len(filtered_payload["data"]) == 1
    filtered_report = filtered_payload["data"][0]
    assert filtered_report["employee_name"] == "阶段六顾问"
    assert filtered_report["department"] == "升学规划部"
    assert filtered_report["report_date"] == report_day.isoformat()

    detail_response = client.get(f"/api/enterprise-assistant/daily-reports/{filtered_report['id']}")
    assert detail_response.status_code == 200
    detail_payload = detail_response.json()
    assert detail_payload["code"] == 0
    assert detail_payload["data"]["id"] == filtered_report["id"]
    assert detail_payload["data"]["employee_no"] == "S6-CONSULTANT"

    daily_summary_response = client.get(
        "/api/enterprise-assistant/daily-reports/summary",
        params={"summary_type": "daily", "date": report_day.isoformat(), "department": "升学规划部"},
    )
    assert daily_summary_response.status_code == 200
    daily_summary = daily_summary_response.json()["data"]
    assert daily_summary["summary_type"] == "daily"
    assert daily_summary["period_start"] == report_day.isoformat()
    assert daily_summary["period_end"] == report_day.isoformat()
    assert daily_summary["report_count"] >= 1
    assert any(item["department"] == "升学规划部" for item in daily_summary["departments"])
    assert "材料不齐" in daily_summary["risks_text"]

    weekly_summary_response = client.get(
        "/api/enterprise-assistant/daily-reports/summary",
        params={"summary_type": "weekly", "week_start": weekly_start.isoformat()},
    )
    assert weekly_summary_response.status_code == 200
    weekly_summary = weekly_summary_response.json()["data"]
    assert weekly_summary["summary_type"] == "weekly"
    assert weekly_summary["period_start"] == weekly_start.isoformat()
    assert weekly_summary["period_end"] == (weekly_start + timedelta(days=6)).isoformat()
    assert weekly_summary["report_count"] >= 3
    assert any(item["employee_name"] == "阶段六顾问" for item in weekly_summary["employees"])

    org_response = client.get("/api/enterprise-assistant/org-units", params={"keyword": "学生服务"})
    assert org_response.status_code == 200
    org_payload = org_response.json()
    assert org_payload["code"] == 0
    assert any(item["responsibilities"] == "请假审批、投诉处理、学生关怀" for item in org_payload["data"])

    directory_response = client.get(
        "/api/enterprise-assistant/directory",
        params={"keyword": "周老师", "department": "学生服务部"},
    )
    assert directory_response.status_code == 200
    directory_payload = directory_response.json()
    assert directory_payload["code"] == 0
    assert any(item["id"] == contact_id and item["unit_name"] == "学生服务部" for item in directory_payload["data"])

    directory_detail_response = client.get(f"/api/enterprise-assistant/directory/{contact_id}")
    assert directory_detail_response.status_code == 200
    directory_detail_payload = directory_detail_response.json()
    assert directory_detail_payload["code"] == 0
    assert directory_detail_payload["data"]["display_name"] == "阶段六周老师"
    assert directory_detail_payload["data"]["responsibilities"] == "负责学生服务跟进"


def test_voice_draft_structures_lead_and_daily_report_without_writing():
    seed_response = client.post("/api/demo/seed")
    assert seed_response.status_code == 200
    assert seed_response.json()["code"] == 0

    with SessionLocal() as db:
        lead_count_before = db.query(CrmLead).count()
        report_count_before = db.query(WorkDailyReport).count()

    lead_response = client.post(
        "/api/enterprise-assistant/voice-drafts",
        json={
            "target_type": "lead",
            "transcript": "客户：陈语，电话 13900008888，高三，想申请新加坡本科，家长关注预算和就业。",
            "actor_username": "admin",
        },
    )
    assert lead_response.status_code == 200
    lead_payload = lead_response.json()
    assert lead_payload["code"] == 0
    assert lead_payload["data"]["target_type"] == "lead"
    assert lead_payload["data"]["requires_confirmation"] is True
    assert lead_payload["data"]["confirmation_endpoint"] == "/api/leads"
    assert lead_payload["data"]["draft"]["customer_name"] == "陈语"
    assert lead_payload["data"]["draft"]["contact_info"] == "13900008888"
    assert "新加坡本科" in lead_payload["data"]["draft"]["background_info"]

    daily_response = client.post(
        "/api/enterprise-assistant/voice-drafts",
        json={
            "target_type": "daily_report",
            "transcript": "今天跟进 6 个客户，风险是德国项目材料不齐，明天补齐材料清单。",
            "actor_username": "admin",
        },
    )
    assert daily_response.status_code == 200
    daily_payload = daily_response.json()
    assert daily_payload["code"] == 0
    assert daily_payload["data"]["target_type"] == "daily_report"
    assert daily_payload["data"]["confirmation_endpoint"] == "/api/enterprise-assistant/daily-reports"
    assert daily_payload["data"]["draft"]["content"].startswith("今天跟进 6 个客户")
    assert daily_payload["data"]["draft"]["structured_summary"]["progress"].startswith("今天跟进")
    assert daily_payload["data"]["draft"]["risks"] == ["风险是德国项目材料不齐"]

    with SessionLocal() as db:
        assert db.query(CrmLead).count() == lead_count_before
        assert db.query(WorkDailyReport).count() == report_count_before


def _ensure_user(db, username: str, real_name: str) -> SysUser:
    user = db.query(SysUser).filter_by(username=username).first()
    if user:
        user.real_name = real_name
        return user
    user = SysUser(username=username, password_hash="demo", real_name=real_name, user_type="EMPLOYEE", role="staff")
    db.add(user)
    db.flush()
    return user


def _ensure_employee_profile(db, user: SysUser, employee_no: str, department: str, position: str) -> EmployeeProfile:
    profile = db.query(EmployeeProfile).filter_by(user_id=user.id).first()
    if not profile:
        profile = EmployeeProfile(user_id=user.id, employee_no=employee_no)
        db.add(profile)
    profile.department = department
    profile.position = position
    profile.phone = "13800000000"
    db.flush()
    return profile


def _ensure_org_unit(db, unit_name: str, responsibilities: str, contact_info: str) -> OrganizationUnit:
    unit = db.query(OrganizationUnit).filter_by(unit_name=unit_name).first()
    if not unit:
        unit = OrganizationUnit(unit_name=unit_name, unit_type="部门", sort_order=20)
        db.add(unit)
    unit.contact_info = contact_info
    unit.responsibilities = responsibilities
    db.flush()
    return unit


def _ensure_directory_contact(
    db,
    user: SysUser,
    unit: OrganizationUnit,
    display_name: str,
    role_title: str,
    contact_info: str,
    responsibilities: str,
) -> EmployeeDirectory:
    profile = db.query(EmployeeProfile).filter_by(user_id=user.id).first()
    contact = db.query(EmployeeDirectory).filter_by(display_name=display_name).first()
    if not contact:
        contact = EmployeeDirectory(display_name=display_name)
        db.add(contact)
    contact.employee_id = profile.id if profile else None
    contact.organization_unit_id = unit.id
    contact.role_title = role_title
    contact.contact_info = contact_info
    contact.responsibilities = responsibilities
    contact.status = "启用"
    db.flush()
    return contact


def _create_report(db, user: SysUser, report_date: date, content: str) -> WorkDailyReport:
    report = WorkDailyReport(
        user_id=user.id,
        report_date=report_date,
        content=content,
        structured_summary=json.dumps({"progress": content, "next_action": "明天补齐"}, ensure_ascii=False),
        risks=json.dumps(["材料不齐"] if "材料不齐" in content else [], ensure_ascii=False),
    )
    db.add(report)
    db.flush()
    return report
