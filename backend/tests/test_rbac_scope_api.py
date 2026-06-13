"""RBAC和数据范围测试 — 批次一 Task 1 失败用例"""
from fastapi.testclient import TestClient

from app.core.database import init_db
from app.main import app

init_db()
client = TestClient(app)


def _token(username: str, password: str) -> str:
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["data"]["access_token"]


def test_student_cannot_approve_leave():
    client.post("/api/demo/seed")
    student_token = _token("student", "student123")
    students = client.get("/api/student-assistant/students", headers={"Authorization": f"Bearer {student_token}"}).json()["data"]
    student_id = students[0]["id"]
    leave = client.post(
        "/api/student-assistant/leaves",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "student_id": student_id,
            "reason": "签证材料递交",
            "start_time": "2026-06-14T09:00:00",
            "end_time": "2026-06-14T18:00:00",
        },
    ).json()["data"]
    response = client.post(
        f"/api/student-assistant/leaves/{leave['id']}/approve",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"status": "已同意", "resolution": "学生不能自审"},
    )
    assert response.status_code == 403
    assert response.json()["code"] != 0


def test_consultant_cannot_update_unowned_lead_status():
    client.post("/api/demo/seed")
    consultant_token = _token("consultant", "consultant123")
    admin_token = _token("admin", "admin123")
    created = client.post(
        "/api/leads",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"customer_name": "范围测试客户", "contact_info": "13900008888", "background_info": "范围测试", "source_channel": "测试"},
    ).json()["data"]
    response = client.patch(
        f"/api/leads/{created['id']}/status",
        headers={"Authorization": f"Bearer {consultant_token}"},
        json={"status": "已签约", "reason": "不应越权"},
    )
    assert response.status_code == 403
    assert response.json()["code"] != 0
