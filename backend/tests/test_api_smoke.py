from fastapi.testclient import TestClient

from app.core.database import Base, SessionLocal, init_db
from app.main import app
from app.models.user import SysUser


init_db()
client = TestClient(app)


def _auth_headers(username: str = "admin", password: str = "admin123") -> dict[str, str]:
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['data']['access_token']}"}


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["code"] == 0


def test_profile_assess():
    response = client.post("/api/profile/assess", json={"raw_input": "19岁 高中毕业 希望新加坡升学", "source_type": "text"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    assert payload["data"]["matched_project"] == "新加坡国际本硕升学计划"


def test_phase2_overview():
    response = client.get("/api/phase2/overview")

    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    assert "企业助手" in [item["name"] for item in payload["data"]["modules"]]
    assert "students" in payload["data"]["counts"]


def test_permission_role_audit_and_notification_api():
    seed_response = client.post("/api/demo/seed")
    assert seed_response.status_code == 200
    assert seed_response.json()["code"] == 0
    headers = _auth_headers()

    users_response = client.get("/api/users", headers=headers)
    assert users_response.status_code == 200
    users_payload = users_response.json()
    assert users_payload["code"] == 0
    assert any(item["username"] == "admin" for item in users_payload["data"])

    permissions_response = client.get("/api/roles/permissions", headers=headers)
    assert permissions_response.status_code == 200
    permissions_payload = permissions_response.json()
    assert permissions_payload["code"] == 0
    assert any(item["permission_code"] == "system:audit:read" for item in permissions_payload["data"])

    create_role_response = client.post(
        "/api/roles",
        headers=headers,
        json={
            "role_code": "stage2_test_role",
            "role_name": "阶段二测试角色",
            "description": "用于验证角色权限 API",
            "permission_codes": ["system:audit:read", "report:snapshot:read"],
        },
    )
    assert create_role_response.status_code == 200
    create_role_payload = create_role_response.json()
    assert create_role_payload["code"] == 0
    assert "system:audit:read" in create_role_payload["data"]["permission_codes"]

    roles_response = client.get("/api/roles", headers=headers)
    assert roles_response.status_code == 200
    roles_payload = roles_response.json()
    assert roles_payload["code"] == 0
    assert any(item["role_code"] == "stage2_test_role" for item in roles_payload["data"])

    audit_response = client.post(
        "/api/audit/logs",
        headers=headers,
        json={
            "actor_username": "admin",
            "action": "创建测试角色",
            "resource_type": "sys_role",
            "resource_id": "stage2_test_role",
            "detail": {"source": "pytest"},
        },
    )
    assert audit_response.status_code == 200
    assert audit_response.json()["code"] == 0

    audit_logs_response = client.get("/api/audit/logs", headers=headers)
    assert audit_logs_response.status_code == 200
    audit_logs_payload = audit_logs_response.json()
    assert audit_logs_payload["code"] == 0
    assert any(item["action"] == "创建测试角色" for item in audit_logs_payload["data"])

    notifications_response = client.get("/api/notifications", headers=headers)
    assert notifications_response.status_code == 200
    notifications_payload = notifications_response.json()
    assert notifications_payload["code"] == 0
    assert any(item["title"] == "高潜客户需要今日回访" for item in notifications_payload["data"])


def test_permission_dependencies_reject_user_without_required_permission():
    seed_response = client.post("/api/demo/seed")
    assert seed_response.status_code == 200
    assert seed_response.json()["code"] == 0

    with SessionLocal() as db:
        student = db.query(SysUser).filter_by(username="stage7_student").first()
        if not student:
            student = SysUser(
                username="stage7_student",
                password_hash="demo",
                real_name="阶段七学生",
                user_type="STUDENT",
                role="student",
            )
            db.add(student)
        else:
            student.role = "student"
            student.user_type = "STUDENT"
        db.commit()

    denied_users_response = client.get("/api/users", headers={"X-Actor-Username": "stage7_student"})
    assert denied_users_response.status_code == 403
    denied_users_payload = denied_users_response.json()
    assert denied_users_payload["code"] == 40300
    assert "权限" in denied_users_payload["msg"]

    student_headers = _auth_headers("stage7_student", "demo")
    denied_daily_response = client.post(
        "/api/enterprise-assistant/daily-reports",
        headers=student_headers,
        json={"content": "尝试提交无权限日报", "actor_username": "stage7_student"},
    )
    assert denied_daily_response.status_code == 403
    assert denied_daily_response.json()["code"] == 40300

    admin_response = client.get("/api/users", headers={"X-Actor-Username": "admin"})
    assert admin_response.status_code == 200
    assert admin_response.json()["code"] == 0


def test_final_business_table_metadata_is_registered():
    expected_tables = {
        "sys_user",
        "sys_role",
        "sys_permission",
        "sys_user_role",
        "sys_role_permission",
        "audit_log",
        "notification",
        "todo_item",
        "customer",
        "lead",
        "lead_source_file",
        "lead_profile_assessment",
        "profile_rule",
        "profile_rule_hit",
        "lead_recommendation",
        "lead_follow_up",
        "lead_task",
        "lead_stage_history",
        "course_project",
        "project_pathway",
        "project_tag",
        "project_rule",
        "project_material",
        "event",
        "event_registration",
        "event_checkin",
        "knowledge_source",
        "knowledge_chunk",
        "chat_session",
        "chat_message",
        "agent_intent_log",
        "agent_action_log",
        "agent_prompt_config",
        "controlled_query_log",
        "dify_fallback_log",
        "employee_profile",
        "employee_daily_report",
        "daily_report_summary",
        "organization_unit",
        "employee_directory",
        "student_profile",
        "student_admin_service",
        "student_leave_approval",
        "student_feedback_ticket",
        "student_academic_node",
        "student_application_progress",
        "student_psych_profile",
        "student_psych_alert",
        "psych_follow_up",
        "report_snapshot",
        "report_metric",
        "report_generation_log",
        "recommendation_log",
    }

    assert expected_tables.issubset(set(Base.metadata.tables))


def test_demo_seed_covers_final_business_domains():
    response = client.post("/api/demo/seed")

    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    data = payload["data"]
    for key in [
        "customers",
        "leads",
        "employees",
        "students",
        "events",
        "reports",
        "roles",
        "permissions",
        "knowledge_sources",
    ]:
        assert data[key] > 0


def test_demo_seed_builds_realistic_business_volume_idempotently():
    from app.models.crm import CrmFollowUp, CrmTask
    from app.models.event import EventRegistration
    from app.models.enterprise import EmployeeDailyReport, EmployeeProfile
    from app.models.lead import CrmLead, Customer
    from app.models.report import ReportSnapshot
    from app.models.student import (
        StudentAcademicEvent,
        StudentAcademicNode,
        StudentApplicationProgress,
        StudentFeedbackTicket,
        StudentGrade,
        StudentLeaveApproval,
        StudentProfile,
        StudentPsychAlert,
    )

    response = client.post("/api/demo/seed")

    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    data = payload["data"]
    assert data["customers"] >= 24
    assert data["leads"] >= 48
    assert data["employees"] >= 8
    assert data["students"] >= 10
    assert data["events"] >= 6
    assert data["reports"] >= 4

    with SessionLocal() as db:
        before_counts = {
            "demo_crm_leads": db.query(CrmLead).filter(CrmLead.source_channel == "真实业务演示").count(),
            "demo_customers": db.query(Customer).filter(Customer.source_channel == "真实业务演示").count(),
            "demo_students": db.query(StudentProfile)
            .filter(StudentProfile.contact_info.like("%@student.demo"))
            .count(),
            "demo_employees": db.query(EmployeeProfile)
            .filter(EmployeeProfile.employee_no.like("EMP-DEMO-%"))
            .count(),
            "demo_followups": db.query(CrmFollowUp).count(),
            "demo_tasks": db.query(CrmTask).count(),
            "demo_registrations": db.query(EventRegistration)
            .filter(EventRegistration.source_channel == "官网活动报名")
            .count(),
            "demo_daily_reports": db.query(EmployeeDailyReport).count(),
            "demo_leave_approvals": db.query(StudentLeaveApproval).count(),
            "demo_feedback": db.query(StudentFeedbackTicket).count(),
            "demo_grades": db.query(StudentGrade).count(),
            "demo_academic_events": db.query(StudentAcademicEvent).count(),
            "demo_academic_nodes": db.query(StudentAcademicNode).count(),
            "demo_progress": db.query(StudentApplicationProgress).count(),
            "demo_psych_alerts": db.query(StudentPsychAlert).count(),
            "demo_reports": db.query(ReportSnapshot)
            .filter(ReportSnapshot.generation_mode == "realistic_demo")
            .count(),
        }

    assert before_counts["demo_crm_leads"] >= 24
    assert before_counts["demo_customers"] >= 24
    assert before_counts["demo_students"] >= 10
    assert before_counts["demo_employees"] >= 8
    assert before_counts["demo_followups"] >= 24
    assert before_counts["demo_tasks"] >= 16
    assert before_counts["demo_registrations"] >= 18
    assert before_counts["demo_daily_reports"] >= 16
    assert before_counts["demo_leave_approvals"] >= 10
    assert before_counts["demo_feedback"] >= 10
    assert before_counts["demo_grades"] >= 30
    assert before_counts["demo_academic_events"] >= 20
    assert before_counts["demo_academic_nodes"] >= 20
    assert before_counts["demo_progress"] >= 30
    assert before_counts["demo_psych_alerts"] >= 6
    assert before_counts["demo_reports"] >= 4

    second_response = client.post("/api/demo/seed")
    assert second_response.status_code == 200
    assert second_response.json()["code"] == 0

    with SessionLocal() as db:
        after_counts = {
            "demo_crm_leads": db.query(CrmLead).filter(CrmLead.source_channel == "真实业务演示").count(),
            "demo_customers": db.query(Customer).filter(Customer.source_channel == "真实业务演示").count(),
            "demo_students": db.query(StudentProfile)
            .filter(StudentProfile.contact_info.like("%@student.demo"))
            .count(),
            "demo_employees": db.query(EmployeeProfile)
            .filter(EmployeeProfile.employee_no.like("EMP-DEMO-%"))
            .count(),
            "demo_followups": db.query(CrmFollowUp).count(),
            "demo_tasks": db.query(CrmTask).count(),
            "demo_registrations": db.query(EventRegistration)
            .filter(EventRegistration.source_channel == "官网活动报名")
            .count(),
            "demo_daily_reports": db.query(EmployeeDailyReport).count(),
            "demo_leave_approvals": db.query(StudentLeaveApproval).count(),
            "demo_feedback": db.query(StudentFeedbackTicket).count(),
            "demo_grades": db.query(StudentGrade).count(),
            "demo_academic_events": db.query(StudentAcademicEvent).count(),
            "demo_academic_nodes": db.query(StudentAcademicNode).count(),
            "demo_progress": db.query(StudentApplicationProgress).count(),
            "demo_psych_alerts": db.query(StudentPsychAlert).count(),
            "demo_reports": db.query(ReportSnapshot)
            .filter(ReportSnapshot.generation_mode == "realistic_demo")
            .count(),
        }

    assert after_counts == before_counts
