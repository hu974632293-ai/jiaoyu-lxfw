from fastapi.testclient import TestClient

from app.core.database import init_db
from app.main import app


init_db()
client = TestClient(app)


def test_report_center_generates_four_report_snapshots_and_audit_logs():
    seed_response = client.post("/api/demo/seed")
    assert seed_response.status_code == 200
    assert seed_response.json()["code"] == 0

    daily_response = client.post(
        "/api/enterprise-assistant/daily-reports",
        json={
            "content": "今天跟进 6 个客户，完成 2 场活动邀约，风险是签证材料补充较慢，明天协调老师跟进。",
            "actor_username": "admin",
        },
    )
    assert daily_response.status_code == 200
    assert daily_response.json()["code"] == 0

    students_response = client.get("/api/student-assistant/students")
    assert students_response.status_code == 200
    student_id = students_response.json()["data"][0]["id"]

    psych_response = client.post(
        "/api/student-assistant/chat",
        json={"student_id": student_id, "message": "我最近焦虑睡不着，感觉撑不下去了。", "actor_username": "admin"},
    )
    assert psych_response.status_code == 200
    assert psych_response.json()["code"] == 0

    feedback_response = client.post(
        "/api/student-assistant/feedback-tickets",
        json={"student_id": student_id, "category": "投诉", "content": "住宿沟通不及时，希望尽快处理。", "actor_username": "admin"},
    )
    assert feedback_response.status_code == 200
    assert feedback_response.json()["code"] == 0

    created_reports = []
    for report_type in ["customer_operation", "daily_summary", "student_psych_weekly", "feedback_weekly"]:
        response = client.post(
            "/api/reports/generate",
            json={
                "report_type": report_type,
                "generated_by": "admin",
                "period_start": "2026-06-01",
                "period_end": "2026-06-10",
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["code"] == 0
        assert payload["data"]["report_type"] == report_type
        assert payload["data"]["generation_mode"] == "template"
        created_reports.append(payload["data"])

    list_response = client.get("/api/reports")
    assert list_response.status_code == 200
    list_payload = list_response.json()
    assert list_payload["code"] == 0
    listed_types = {item["report_type"] for item in list_payload["data"]}
    assert listed_types >= {"customer_operation", "daily_summary", "student_psych_weekly", "feedback_weekly"}

    for item in created_reports:
        detail_response = client.get(f"/api/reports/{item['id']}")
        assert detail_response.status_code == 200
        detail_payload = detail_response.json()
        assert detail_payload["code"] == 0
        assert detail_payload["data"]["report_type"] == item["report_type"]
        assert detail_payload["data"]["content"]["summary"]
        assert detail_payload["data"]["content"]["risks"] is not None
        assert detail_payload["data"]["content"]["suggestions"]

    daily_detail = client.get(f"/api/reports/{next(item['id'] for item in created_reports if item['report_type'] == 'daily_summary')}").json()
    assert daily_detail["data"]["content"]["summary"]["report_count"] >= 1
    assert "签证材料补充较慢" in "".join(daily_detail["data"]["content"]["risks"])

    psych_detail = client.get(f"/api/reports/{next(item['id'] for item in created_reports if item['report_type'] == 'student_psych_weekly')}").json()
    assert psych_detail["data"]["content"]["summary"]["alert_count"] >= 1
    assert psych_detail["data"]["content"]["safety_note"] == "心理预警仅为辅助识别，不替代专业心理诊断。"

    feedback_detail = client.get(f"/api/reports/{next(item['id'] for item in created_reports if item['report_type'] == 'feedback_weekly')}").json()
    assert feedback_detail["data"]["content"]["summary"]["ticket_count"] >= 1
    assert "投诉" in feedback_detail["data"]["content"]["category_distribution"]

    audit_response = client.get("/api/audit/logs")
    assert audit_response.status_code == 200
    audit_actions = [item["action"] for item in audit_response.json()["data"]]
    assert "生成报告快照" in audit_actions
