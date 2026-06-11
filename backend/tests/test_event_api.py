from fastapi.testclient import TestClient

from app.core.database import init_db
from app.main import app


init_db()
client = TestClient(app)


def test_event_operation_create_registration_roster_check_in_and_audit_api():
    seed_response = client.post("/api/demo/seed")
    assert seed_response.status_code == 200
    assert seed_response.json()["code"] == 0

    create_response = client.post(
        "/api/events",
        json={
            "event_name": "阶段五活动运营测试说明会",
            "event_type": "线上讲座",
            "start_time": "2026-07-01T19:30:00",
            "location": "腾讯会议",
            "max_participants": 30,
            "target_audience": "线索客户、在读学生",
            "speaker": "升学规划顾问",
            "status": "已发布",
            "operator_username": "admin",
        },
    )
    assert create_response.status_code == 200
    create_payload = create_response.json()
    assert create_payload["code"] == 0
    event_id = create_payload["data"]["id"]
    assert create_payload["data"]["event_name"] == "阶段五活动运营测试说明会"
    assert create_payload["data"]["status"] == "已发布"

    lead_registration_response = client.post(
        f"/api/events/{event_id}/registrations",
        json={
            "subject_type": "lead",
            "subject_id": 1,
            "subject_name": "一期演示线索",
            "contact_info": "13800000001",
            "source_channel": "CRM邀约",
            "operator_username": "admin",
        },
    )
    assert lead_registration_response.status_code == 200
    lead_registration_payload = lead_registration_response.json()
    assert lead_registration_payload["code"] == 0
    assert lead_registration_payload["data"]["subject_type"] == "lead"
    assert lead_registration_payload["data"]["status"] == "已报名"

    student_registration_response = client.post(
        f"/api/events/{event_id}/registrations",
        json={
            "subject_type": "student",
            "subject_id": 1,
            "subject_name": "阶段五学生",
            "contact_info": "student@example.com",
            "source_channel": "学生助手",
            "operator_username": "admin",
        },
    )
    assert student_registration_response.status_code == 200
    student_registration_payload = student_registration_response.json()
    assert student_registration_payload["code"] == 0
    student_registration_id = student_registration_payload["data"]["id"]
    assert student_registration_payload["data"]["subject_type"] == "student"
    assert student_registration_payload["data"]["lead_id"] is None

    roster_response = client.get(f"/api/events/{event_id}/registrations")
    assert roster_response.status_code == 200
    roster_payload = roster_response.json()
    assert roster_payload["code"] == 0
    assert {item["subject_type"] for item in roster_payload["data"]} >= {"lead", "student"}
    assert any(item["subject_name"] == "阶段五学生" for item in roster_payload["data"])

    check_in_response = client.post(
        f"/api/events/{event_id}/check-ins",
        json={"registration_id": student_registration_id, "operator_username": "admin"},
    )
    assert check_in_response.status_code == 200
    check_in_payload = check_in_response.json()
    assert check_in_payload["code"] == 0
    assert check_in_payload["data"]["status"] == "已签到"
    assert check_in_payload["data"]["checked_in_at"]

    events_response = client.get("/api/events")
    assert events_response.status_code == 200
    events_payload = events_response.json()
    assert events_payload["code"] == 0
    created_event = next(item for item in events_payload["data"] if item["id"] == event_id)
    assert created_event["current_participants"] >= 2
    assert created_event["checked_in_count"] >= 1

    audit_response = client.get("/api/audit/logs")
    assert audit_response.status_code == 200
    audit_actions = [item["action"] for item in audit_response.json()["data"]]
    assert "创建活动" in audit_actions
    assert "活动报名" in audit_actions
    assert "活动签到" in audit_actions
