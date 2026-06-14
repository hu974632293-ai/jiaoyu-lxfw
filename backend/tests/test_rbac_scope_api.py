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


def test_enterprise_assistant_core_queries_reject_legacy_actor_header():
    client.post("/api/demo/seed")
    legacy_headers = {"X-Actor-Username": "admin"}

    daily_response = client.get("/api/enterprise-assistant/daily-reports", headers=legacy_headers)
    directory_response = client.get("/api/enterprise-assistant/directory", headers=legacy_headers)
    nl2sql_response = client.post(
        "/api/enterprise-assistant/nl2sql/query",
        headers=legacy_headers,
        json={"question": "查询本周高潜线索数量", "actor_username": "admin"},
    )

    for response in [daily_response, directory_response, nl2sql_response]:
        assert response.status_code == 401
        assert response.json()["code"] == 40100


def test_enterprise_assistant_core_queries_accept_bearer_token_and_enforce_role_permission():
    client.post("/api/demo/seed")
    employee_token = _token("employee", "employee123")
    student_token = _token("student", "student123")

    allowed_headers = {"Authorization": f"Bearer {employee_token}"}
    denied_headers = {"Authorization": f"Bearer {student_token}"}

    assert client.get("/api/enterprise-assistant/daily-reports", headers=allowed_headers).status_code == 200
    assert client.get("/api/enterprise-assistant/directory", headers=allowed_headers).status_code == 200
    assert (
        client.post(
            "/api/enterprise-assistant/nl2sql/query",
            headers=allowed_headers,
            json={"question": "查询本周高潜线索数量", "actor_username": "employee"},
        ).status_code
        == 200
    )

    response = client.get("/api/enterprise-assistant/daily-reports", headers=denied_headers)
    assert response.status_code == 403
    assert response.json()["code"] == 40300


def test_crm_write_operations_reject_legacy_actor_header_and_accept_bearer_token():
    client.post("/api/demo/seed")
    admin_headers = {"Authorization": f"Bearer {_token('admin', 'admin123')}"}
    consultant_headers = {"Authorization": f"Bearer {_token('consultant', 'consultant123')}"}
    legacy_headers = {"X-Actor-Username": "admin"}

    legacy_create = client.post(
        "/api/leads",
        headers=legacy_headers,
        json={"customer_name": "legacy CRM 客户", "contact_info": "13900001111", "background_info": "不应由旧 header 写入"},
    )
    assert legacy_create.status_code == 401
    assert legacy_create.json()["code"] == 40100

    created = client.post(
        "/api/leads",
        headers=admin_headers,
        json={"customer_name": "token CRM 客户", "contact_info": "13900002222", "background_info": "真实登录写入"},
    ).json()["data"]
    lead_id = created["id"]

    legacy_responses = [
        client.post(
            f"/api/leads/{lead_id}/follow-ups",
            headers=legacy_headers,
            json={"follow_type": "电话", "content": "旧 header 不应新增跟进", "operator_username": "admin"},
        ),
        client.post(
            "/api/crm/tasks",
            headers=legacy_headers,
            json={"lead_id": lead_id, "title": "旧 header 不应创建任务", "owner_username": "admin"},
        ),
        client.patch(
            f"/api/leads/{lead_id}/status",
            headers=legacy_headers,
            json={"status": "high_potential", "reason": "旧 header 不应改状态"},
        ),
    ]
    for response in legacy_responses:
        assert response.status_code == 401
        assert response.json()["code"] == 40100

    follow_up = client.post(
        f"/api/leads/{lead_id}/follow-ups",
        headers=admin_headers,
        json={"follow_type": "电话", "content": "真实登录新增跟进", "operator_username": "admin"},
    )
    task = client.post(
        "/api/crm/tasks",
        headers=admin_headers,
        json={"lead_id": lead_id, "title": "真实登录创建任务", "owner_username": "admin"},
    )
    status = client.patch(
        f"/api/leads/{lead_id}/status",
        headers=admin_headers,
        json={"status": "high_potential", "reason": "真实登录改状态"},
    )

    assert follow_up.status_code == 200
    assert task.status_code == 200
    assert status.status_code == 200

    scoped_task_create = client.post(
        "/api/crm/tasks",
        headers=consultant_headers,
        json={"lead_id": lead_id, "title": "顾问不应创建非本人客户任务", "owner_username": "consultant"},
    )
    assert scoped_task_create.status_code == 403
    assert scoped_task_create.json()["code"] == 40301

    scoped_complete = client.patch(
        f"/api/crm/tasks/{task.json()['data']['id']}/complete",
        headers=consultant_headers,
        json={"operator_username": "consultant"},
    )
    assert scoped_complete.status_code == 403
    assert scoped_complete.json()["code"] == 40301

    legacy_complete = client.patch(
        f"/api/crm/tasks/{task.json()['data']['id']}/complete",
        headers=legacy_headers,
        json={"operator_username": "admin"},
    )
    assert legacy_complete.status_code == 401
    assert legacy_complete.json()["code"] == 40100

    complete = client.patch(
        f"/api/crm/tasks/{task.json()['data']['id']}/complete",
        headers=admin_headers,
        json={"operator_username": "admin"},
    )
    assert complete.status_code == 200
    assert complete.json()["data"]["status"] == "已完成"
