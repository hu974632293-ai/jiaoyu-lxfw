"""Agent契约测试 — 批次一 Task 1 失败用例"""
from fastapi.testclient import TestClient

from app.core.database import init_db
from app.main import app

init_db()
client = TestClient(app)


def _token(username: str, password: str) -> str:
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["data"]["access_token"]


def test_knowledge_chat_accepts_agent_context_without_breaking_legacy_request():
    client.post("/api/demo/seed")
    token = _token("employee", "employee123")
    response = client.post(
        "/api/knowledge/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "scene": "enterprise_guide",
            "role": "employee",
            "question": "新人第一周需要完成什么？",
            "business_context": {"source": "employee_workspace"},
            "action_mode": "draft",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    assert payload["data"]["scene"] == "enterprise_guide"
    assert payload["data"]["request_context"]["role"] == "employee"
    assert payload["data"]["request_context"]["action_mode"] == "draft"


def test_enterprise_chat_returns_draft_for_write_intent():
    client.post("/api/demo/seed")
    token = _token("employee", "employee123")
    response = client.post(
        "/api/enterprise-assistant/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": "帮我录入一个客户：计划一草稿客户，电话 13900007777"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    assert payload["data"]["intent"] == "create_lead"
    assert payload["data"]["requires_confirmation"] is True
    assert payload["data"]["confirmation_endpoint"] == "/api/leads"
