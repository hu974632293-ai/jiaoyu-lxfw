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


def test_employee_agent_chat_persists_scene_session_for_page_restore():
    client.post("/api/demo/seed")
    token = _token("employee", "employee123")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/knowledge/chat",
        headers=headers,
        json={
            "scene": "enterprise_daily",
            "role": "employee",
            "actor_username": "employee",
            "channel": "employee_agent",
            "question": "页面恢复测试：今天跟进了一个客户，帮我整理日报。",
            "business_context": {"source": "employee_agent"},
            "action_mode": "draft",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    session_id = payload["data"]["session_id"]
    assert isinstance(session_id, int)
    assert [item["role"] for item in payload["data"]["messages"]][-2:] == ["user", "assistant"]

    restore_response = client.get(
        "/api/knowledge/sessions/latest",
        headers=headers,
        params={"scene": "enterprise_daily", "channel": "employee_agent", "actor_username": "employee"},
    )
    assert restore_response.status_code == 200
    restored = restore_response.json()
    assert restored["code"] == 0
    assert restored["data"]["session_id"] == session_id
    assert any(item["content"].startswith("页面恢复测试") for item in restored["data"]["messages"])

    other_scene_response = client.get(
        "/api/knowledge/sessions/latest",
        headers=headers,
        params={"scene": "enterprise_org", "channel": "employee_agent", "actor_username": "employee"},
    )
    assert other_scene_response.status_code == 200
    other_scene = other_scene_response.json()
    assert other_scene["code"] == 0
    assert other_scene["data"]["session_id"] is None
    assert other_scene["data"]["messages"] == []


def test_employee_agent_confirm_actions_sync_business_tables_and_are_idempotent():
    client.post("/api/demo/seed")
    token = _token("employee", "employee123")
    headers = {"Authorization": f"Bearer {token}"}

    daily_response = client.post(
        "/api/enterprise-assistant/actions/confirm",
        headers=headers,
        json={
            "action_type": "submit_daily_report",
            "actor_username": "employee",
            "idempotency_key": "agent-daily-contract-001",
            "draft": {"content": "Agent确认日报：今天跟进2个客户，风险是材料不齐，明天补齐清单。"},
        },
    )
    assert daily_response.status_code == 200
    daily_payload = daily_response.json()
    assert daily_payload["code"] == 0
    assert daily_payload["data"]["target_type"] == "work_daily_report"
    daily_id = daily_payload["data"]["target_id"]

    duplicate_daily = client.post(
        "/api/enterprise-assistant/actions/confirm",
        headers=headers,
        json={
            "action_type": "submit_daily_report",
            "actor_username": "employee",
            "idempotency_key": "agent-daily-contract-001",
            "draft": {"content": "Agent确认日报：今天跟进2个客户，风险是材料不齐，明天补齐清单。"},
        },
    )
    assert duplicate_daily.status_code == 200
    assert duplicate_daily.json()["data"]["target_id"] == daily_id
    assert duplicate_daily.json()["data"]["idempotent"] is True

    reports = client.get("/api/enterprise-assistant/daily-reports", headers=headers).json()["data"]
    assert sum(1 for item in reports if item["content"].startswith("Agent确认日报")) == 1

    lead_response = client.post(
        "/api/enterprise-assistant/actions/confirm",
        headers=headers,
        json={
            "action_type": "create_lead",
            "actor_username": "employee",
            "idempotency_key": "agent-lead-contract-001",
            "draft": {
                "customer_name": "Agent确认客户",
                "contact_info": "13900008888",
                "background_info": "高三，关注新加坡本科和预算",
                "source_channel": "企业助手",
            },
        },
    )
    assert lead_response.status_code == 200
    lead_payload = lead_response.json()
    assert lead_payload["code"] == 0
    assert lead_payload["data"]["target_type"] == "crm_lead"
    lead_id = lead_payload["data"]["target_id"]

    status_response = client.post(
        "/api/enterprise-assistant/actions/confirm",
        headers=headers,
        json={
            "action_type": "update_lead_status",
            "actor_username": "employee",
            "idempotency_key": "agent-status-contract-001",
            "draft": {"lead_id": lead_id, "status": "high_potential", "reason": "Agent确认高潜"},
        },
    )
    assert status_response.status_code == 200
    assert status_response.json()["data"]["target_id"] == lead_id

    lead_detail = client.get(f"/api/leads/{lead_id}", headers=headers).json()["data"]
    assert lead_detail["status"] == "high_potential"
