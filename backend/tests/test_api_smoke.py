from fastapi.testclient import TestClient

from app.core.database import init_db
from app.main import app


init_db()
client = TestClient(app)


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

    users_response = client.get("/api/users")
    assert users_response.status_code == 200
    users_payload = users_response.json()
    assert users_payload["code"] == 0
    assert any(item["username"] == "admin" for item in users_payload["data"])

    permissions_response = client.get("/api/roles/permissions")
    assert permissions_response.status_code == 200
    permissions_payload = permissions_response.json()
    assert permissions_payload["code"] == 0
    assert any(item["permission_code"] == "system:audit:read" for item in permissions_payload["data"])

    create_role_response = client.post(
        "/api/roles",
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

    roles_response = client.get("/api/roles")
    assert roles_response.status_code == 200
    roles_payload = roles_response.json()
    assert roles_payload["code"] == 0
    assert any(item["role_code"] == "stage2_test_role" for item in roles_payload["data"])

    audit_response = client.post(
        "/api/audit/logs",
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

    audit_logs_response = client.get("/api/audit/logs")
    assert audit_logs_response.status_code == 200
    audit_logs_payload = audit_logs_response.json()
    assert audit_logs_payload["code"] == 0
    assert any(item["action"] == "创建测试角色" for item in audit_logs_payload["data"])

    notifications_response = client.get("/api/notifications")
    assert notifications_response.status_code == 200
    notifications_payload = notifications_response.json()
    assert notifications_payload["code"] == 0
    assert any(item["title"] == "高潜客户需要今日回访" for item in notifications_payload["data"])
