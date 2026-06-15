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


def test_enterprise_agent_base_permission_allows_internal_roles_to_confirm_daily_report():
    client.post("/api/demo/seed")
    internal_accounts = [
        ("admin", "admin123"),
        ("manager", "manager123"),
        ("consultant", "consultant123"),
        ("employee", "employee123"),
        ("teacher", "teacher123"),
    ]

    for username, password in internal_accounts:
        token = _token(username, password)
        response = client.post(
            "/api/enterprise-assistant/actions/confirm",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "action_type": "submit_daily_report",
                "actor_username": username,
                "idempotency_key": f"agent-daily-base-permission-{username}",
                "draft": {"content": f"{username} 企业版基础权限日报确认。"},
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["code"] == 0
        assert payload["data"]["target_type"] == "work_daily_report"

    student_token = _token("student", "student123")
    student_response = client.post(
        "/api/enterprise-assistant/actions/confirm",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "action_type": "submit_daily_report",
            "actor_username": "student",
            "idempotency_key": "agent-daily-base-permission-student",
            "draft": {"content": "学生不应使用企业版日报确认。"},
        },
    )
    assert student_response.status_code == 403
    assert "assistant:enterprise:use" in student_response.json()["msg"]


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

    employee_lead_response = client.post(
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
    assert employee_lead_response.status_code == 403
    assert "crm:lead:write" in employee_lead_response.json()["msg"]

    consultant_token = _token("consultant", "consultant123")
    consultant_headers = {"Authorization": f"Bearer {consultant_token}"}
    lead_response = client.post(
        "/api/enterprise-assistant/actions/confirm",
        headers=consultant_headers,
        json={
            "action_type": "create_lead",
            "actor_username": "consultant",
            "idempotency_key": "agent-lead-contract-consultant-001",
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
        headers=consultant_headers,
        json={
            "action_type": "update_lead_status",
            "actor_username": "consultant",
            "idempotency_key": "agent-status-contract-consultant-001",
            "draft": {"lead_id": lead_id, "status": "high_potential", "reason": "Agent确认高潜"},
        },
    )
    assert status_response.status_code == 200
    assert status_response.json()["data"]["target_id"] == lead_id

    lead_detail = client.get(f"/api/leads/{lead_id}", headers=headers).json()["data"]
    assert lead_detail["status"] == "high_potential"


def test_consultant_agent_golden_path_creates_confirmable_actions_and_timeline_records():
    client.post("/api/demo/seed")
    token = _token("consultant", "consultant123")
    headers = {"Authorization": f"Bearer {token}"}

    lead_response = client.post(
        "/api/leads",
        headers=headers,
        json={
            "customer_name": "黄金链路客户",
            "contact_info": "13900006666",
            "background_info": "高三，计划申请英国本科，预算35万，雅思6.0，家长关注安全和就业。",
            "source_channel": "官网报名",
        },
    )
    assert lead_response.status_code == 200
    lead_id = lead_response.json()["data"]["id"]

    chat_response = client.post(
        "/api/consultant-agent/chat",
        headers=headers,
        json={
            "lead_id": lead_id,
            "message": "帮我给这个客户准备今天的跟进，并安排三天后回访，阶段如果合适就推进到已初步研判。",
        },
    )
    assert chat_response.status_code == 200
    chat_payload = chat_response.json()
    assert chat_payload["code"] == 0
    draft = chat_payload["data"]
    assert draft["intent"] == "consultant_followup"
    assert draft["idempotency_key"].startswith(f"consultant-agent-{lead_id}-")
    assert draft["requires_confirmation"] is True
    assert draft["lead_context"]["id"] == lead_id
    assert draft["lead_context"]["customer_name"] == "黄金链路客户"
    assert [item["action_type"] for item in draft["pending_actions"]] == [
        "create_follow_up",
        "create_task",
        "update_lead_status",
    ]

    confirm_response = client.post(
        "/api/consultant-agent/actions/confirm",
        headers=headers,
        json={
            "lead_id": lead_id,
            "idempotency_key": draft["idempotency_key"],
            "pending_actions": draft["pending_actions"],
        },
    )
    assert confirm_response.status_code == 200
    confirm_payload = confirm_response.json()
    assert confirm_payload["code"] == 0
    assert confirm_payload["data"]["lead_id"] == lead_id
    assert [item["target_type"] for item in confirm_payload["data"]["results"]] == [
        "crm_follow_up",
        "crm_task",
        "crm_lead",
    ]

    duplicate_response = client.post(
        "/api/consultant-agent/actions/confirm",
        headers=headers,
        json={
            "lead_id": lead_id,
            "idempotency_key": draft["idempotency_key"],
            "pending_actions": draft["pending_actions"],
        },
    )
    assert duplicate_response.status_code == 200
    assert duplicate_response.json()["data"]["idempotent"] is True

    timeline = client.get(f"/api/leads/{lead_id}/timeline", headers=headers).json()["data"]
    timeline_titles = [item["title"] for item in timeline]
    assert "新增跟进" in timeline_titles
    assert "创建任务" in timeline_titles
    assert "阶段流转" in timeline_titles


def test_employee_agent_knowledge_chat_returns_structured_read_results():
    client.post("/api/demo/seed")
    token = _token("employee", "employee123")
    headers = {"Authorization": f"Bearer {token}"}

    customer_response = client.post(
        "/api/knowledge/chat",
        headers=headers,
        json={
            "scene": "enterprise_customer",
            "role": "employee",
            "actor_username": "employee",
            "channel": "employee_agent",
            "question": "查询本周高潜客户数量，并告诉我需要跟进的重点。",
            "business_context": {"agent_scene": "customer"},
            "action_mode": "draft",
        },
    )
    assert customer_response.status_code == 200
    customer = customer_response.json()["data"]
    assert customer["action_type"] == "query_customer_summary"
    assert customer["action_status"] == "suggested"
    assert customer["requires_confirmation"] is False
    assert customer["draft"] is None
    assert customer["target_type"] == "crm_lead"
    assert isinstance(customer["business_result"]["high_potential_count"], int)
    assert "高潜客户" in customer["answer"]
    assert "暂时无法回答" not in customer["answer"]

    org_response = client.post(
        "/api/knowledge/chat",
        headers=headers,
        json={
            "scene": "enterprise_org",
            "role": "employee",
            "actor_username": "employee",
            "channel": "employee_agent",
            "question": "学生服务投诉现在谁负责？请给出处理入口和下一步。",
            "business_context": {"agent_scene": "org"},
            "action_mode": "draft",
        },
    )
    assert org_response.status_code == 200
    org = org_response.json()["data"]
    assert org["action_type"] == "query_org_contact"
    assert org["action_status"] == "suggested"
    assert org["requires_confirmation"] is False
    assert org["draft"] is None
    assert org["target_type"] == "employee_directory"
    assert org["business_result"]["display_name"]
    assert "负责" in org["answer"]
    assert "学生服务" in org["answer"]
    assert "暂时无法回答" not in org["answer"]


def test_employee_agent_knowledge_chat_only_returns_draft_for_write_intent():
    client.post("/api/demo/seed")
    token = _token("employee", "employee123")
    headers = {"Authorization": f"Bearer {token}"}

    greeting_response = client.post(
        "/api/knowledge/chat",
        headers=headers,
        json={
            "scene": "enterprise_daily",
            "role": "employee",
            "actor_username": "employee",
            "channel": "employee_agent",
            "question": "你好",
            "business_context": {"agent_scene": "daily"},
            "action_mode": "draft",
        },
    )
    assert greeting_response.status_code == 200
    greeting = greeting_response.json()["data"]
    assert greeting["action_type"] == "answer"
    assert greeting["action_status"] == "suggested"
    assert greeting["requires_confirmation"] is False
    assert greeting["draft"] is None

    daily_response = client.post(
        "/api/knowledge/chat",
        headers=headers,
        json={
            "scene": "enterprise_daily",
            "role": "employee",
            "actor_username": "employee",
            "channel": "employee_agent",
            "question": "今天跟进了王同学申请材料，风险是签证材料还缺资产证明，明天补齐清单。帮我生成日报草稿。",
            "business_context": {"agent_scene": "daily"},
            "action_mode": "draft",
        },
    )
    assert daily_response.status_code == 200
    daily = daily_response.json()["data"]
    assert daily["action_type"] == "submit_daily_report"
    assert daily["action_status"] == "waiting_confirmation"
    assert daily["requires_confirmation"] is True
    assert daily["target_type"] == "work_daily_report"
    assert daily["draft"]["content"].startswith("今天跟进了王同学")
    assert daily["idempotency_key"]

    restore_response = client.get(
        "/api/knowledge/sessions/latest",
        headers=headers,
        params={"scene": "enterprise_daily", "channel": "employee_agent", "actor_username": "employee"},
    )
    assert restore_response.status_code == 200
    restored = restore_response.json()["data"]
    assert restored["latest_action"]["action_type"] == "submit_daily_report"
    assert restored["latest_action"]["action_status"] == "waiting_confirmation"
    assert restored["latest_action"]["draft"]["content"].startswith("今天跟进了王同学")

    confirm_response = client.post(
        "/api/enterprise-assistant/actions/confirm",
        headers=headers,
        json={
            "action_type": "submit_daily_report",
            "actor_username": "employee",
            "idempotency_key": daily["idempotency_key"],
            "draft": daily["draft"],
            "session_id": daily["session_id"],
        },
    )
    assert confirm_response.status_code == 200

    confirmed_restore_response = client.get(
        "/api/knowledge/sessions/latest",
        headers=headers,
        params={"scene": "enterprise_daily", "channel": "employee_agent", "actor_username": "employee"},
    )
    assert confirmed_restore_response.status_code == 200
    assert confirmed_restore_response.json()["data"]["latest_action"] is None


def test_consultant_agent_customer_write_intents_return_backend_drafts():
    client.post("/api/demo/seed")
    token = _token("consultant", "consultant123")
    headers = {"Authorization": f"Bearer {token}"}

    create_response = client.post(
        "/api/knowledge/chat",
        headers=headers,
        json={
            "scene": "enterprise_customer",
            "role": "consultant",
            "actor_username": "consultant",
            "channel": "employee_agent",
            "question": "帮我新增客户：后端草稿客户，电话 13900009999，关注新加坡本科。",
            "business_context": {"agent_scene": "customer"},
            "action_mode": "draft",
        },
    )
    assert create_response.status_code == 200
    create_data = create_response.json()["data"]
    assert create_data["action_type"] == "create_lead"
    assert create_data["action_status"] == "waiting_confirmation"
    assert create_data["requires_confirmation"] is True
    assert create_data["draft"]["customer_name"] == "后端草稿客户"
    assert create_data["draft"]["contact_info"] == "13900009999"

    confirm_create = client.post(
        "/api/enterprise-assistant/actions/confirm",
        headers=headers,
        json={
            "action_type": "create_lead",
            "actor_username": "consultant",
            "idempotency_key": create_data["idempotency_key"],
            "draft": create_data["draft"],
            "session_id": create_data["session_id"],
        },
    )
    assert confirm_create.status_code == 200
    lead_id = confirm_create.json()["data"]["target_id"]

    update_response = client.post(
        "/api/knowledge/chat",
        headers=headers,
        json={
            "scene": "enterprise_customer",
            "role": "consultant",
            "actor_username": "consultant",
            "channel": "employee_agent",
            "question": f"把客户 {lead_id} 状态更新为 high_potential，原因是预算明确。",
            "business_context": {"agent_scene": "customer"},
            "action_mode": "draft",
        },
    )
    assert update_response.status_code == 200
    update_data = update_response.json()["data"]
    assert update_data["action_type"] == "update_lead_status"
    assert update_data["action_status"] == "waiting_confirmation"
    assert update_data["requires_confirmation"] is True
    assert update_data["draft"]["lead_id"] == lead_id
    assert update_data["draft"]["status"] == "high_potential"
