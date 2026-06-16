"""Agent契约测试 — 批次一 Task 1 失败用例"""
import json
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

from app.core.database import SessionLocal, init_db
from app.main import app
from app.models.assistant import AgentActionLog

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


def test_consultant_agent_natural_language_can_limit_draft_to_follow_up_only():
    client.post("/api/demo/seed")
    token = _token("consultant", "consultant123")
    headers = {"Authorization": f"Bearer {token}"}

    lead_response = client.post(
        "/api/leads",
        headers=headers,
        json={
            "customer_name": "只跟进客户",
            "contact_info": "13900007771",
            "background_info": "家长只想先电话沟通预算，不希望现在变更阶段。",
            "source_channel": "官网咨询",
        },
    )
    assert lead_response.status_code == 200
    lead_id = lead_response.json()["data"]["id"]

    chat_response = client.post(
        "/api/consultant-agent/chat",
        headers=headers,
        json={"lead_id": lead_id, "message": "这次只生成电话跟进记录，不要创建任务，也不要更新阶段。"},
    )

    assert chat_response.status_code == 200
    draft = chat_response.json()["data"]
    assert [item["action_type"] for item in draft["pending_actions"]] == ["create_follow_up"]

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
    assert [item["target_type"] for item in confirm_response.json()["data"]["results"]] == ["crm_follow_up"]

    timeline = client.get(f"/api/leads/{lead_id}/timeline", headers=headers).json()["data"]
    timeline_titles = [item["title"] for item in timeline]
    assert "新增跟进" in timeline_titles
    assert "创建任务" not in timeline_titles
    assert "阶段流转" not in timeline_titles


def test_consultant_agent_natural_language_can_create_tomorrow_afternoon_task_only():
    client.post("/api/demo/seed")
    token = _token("consultant", "consultant123")
    headers = {"Authorization": f"Bearer {token}"}

    lead_response = client.post(
        "/api/leads",
        headers=headers,
        json={
            "customer_name": "只建任务客户",
            "contact_info": "13900007772",
            "background_info": "客户希望明天下午再次电话确认目标专业。",
            "source_channel": "官网咨询",
        },
    )
    assert lead_response.status_code == 200
    lead_id = lead_response.json()["data"]["id"]

    chat_response = client.post(
        "/api/consultant-agent/chat",
        headers=headers,
        json={"lead_id": lead_id, "message": "帮我创建明天下午回访任务，先不要写跟进，也不要更新阶段。"},
    )

    assert chat_response.status_code == 200
    draft = chat_response.json()["data"]
    assert [item["action_type"] for item in draft["pending_actions"]] == ["create_task"]
    task_draft = draft["pending_actions"][0]["draft"]
    assert "回访" in task_draft["title"]
    due_time = datetime.fromisoformat(task_draft["due_time"])
    assert due_time.date() == (datetime.now(UTC).date() + timedelta(days=1))
    assert due_time.hour >= 12


def test_consultant_agent_chat_exposes_orchestration_contract_for_confirmable_tools():
    client.post("/api/demo/seed")
    token = _token("consultant", "consultant123")
    headers = {"Authorization": f"Bearer {token}"}

    lead_response = client.post(
        "/api/leads",
        headers=headers,
        json={
            "customer_name": "编排契约客户",
            "contact_info": "13900007773",
            "background_info": "高三，计划申请英国本科，预算40万，雅思6.5。",
            "source_channel": "官网咨询",
        },
    )
    assert lead_response.status_code == 200
    lead_id = lead_response.json()["data"]["id"]

    chat_response = client.post(
        "/api/consultant-agent/chat",
        headers=headers,
        json={"lead_id": lead_id, "message": "生成电话跟进，并安排回访任务，阶段推进到已初步研判。"},
    )

    assert chat_response.status_code == 200
    data = chat_response.json()["data"]
    orchestration = data["orchestration"]
    assert orchestration["mode"] == "draft_then_confirm"
    assert orchestration["role"] == "consultant"
    assert orchestration["target"] == {"type": "crm_lead", "id": lead_id}
    assert orchestration["context_sources"] == ["crm_lead", "crm_timeline", "conversation_context"]
    assert orchestration["intent"] == data["intent"]
    assert orchestration["requires_confirmation"] is True
    assert [item["tool"] for item in orchestration["business_tools"]] == [
        "create_follow_up",
        "create_task",
        "update_lead_status",
    ]
    assert all(item["execution"] == "after_user_confirmation" for item in orchestration["business_tools"])


def test_consultant_agent_can_start_from_public_lead_queue_without_selected_customer():
    client.post("/api/demo/seed")
    token = _token("consultant", "consultant123")
    headers = {"Authorization": f"Bearer {token}"}

    lead_response = client.post(
        "/api/leads",
        headers=headers,
        json={
            "customer_name": "入口闭环官网线索",
            "contact_info": "13900007776",
            "background_info": "官网咨询客户，计划申请英国本科，预算40万，家长关注录取把握。",
            "source_channel": "官网咨询",
        },
    )
    assert lead_response.status_code == 200
    lead_id = lead_response.json()["data"]["id"]

    chat_response = client.post(
        "/api/consultant-agent/chat",
        headers=headers,
        json={"message": "官网今天来的线索有哪些？我应该先处理谁？"},
    )

    assert chat_response.status_code == 200
    data = chat_response.json()["data"]
    assert data["intent"] == "consultant_object_discovery"
    assert data["requires_confirmation"] is False
    assert data["requires_more_info"] is False
    assert data["pending_actions"] == []
    assert data["lead_context"] is None
    assert data["candidate_leads"][0]["id"] == lead_id
    assert data["candidate_leads"][0]["customer_name"] == "入口闭环官网线索"
    assert data["candidate_leads"][0]["source_channel"] == "官网咨询"
    assert "官网咨询" in data["answer"]
    orchestration = data["orchestration"]
    assert orchestration["mode"] == "object_discovery"
    assert orchestration["target"] == {"type": "crm_lead_queue", "id": None}
    assert orchestration["context_sources"] == ["crm_lead_queue", "crm_task"]
    assert orchestration["next_step"] == "select_customer_or_refine_query"


def test_consultant_agent_returns_candidate_cards_for_ambiguous_customer_name():
    client.post("/api/demo/seed")
    token = _token("consultant", "consultant123")
    headers = {"Authorization": f"Bearer {token}"}

    for name, phone, background in [
        ("张明", "13900007777", "高三，目标英国本科，预算35万。"),
        ("张明宇", "13900007778", "大一，计划转学美国本科，预算45万。"),
    ]:
        response = client.post(
            "/api/leads",
            headers=headers,
            json={
                "customer_name": name,
                "contact_info": phone,
                "background_info": background,
                "source_channel": "官网咨询",
            },
        )
        assert response.status_code == 200

    chat_response = client.post(
        "/api/consultant-agent/chat",
        headers=headers,
        json={"message": "张明最近怎么样？"},
    )

    assert chat_response.status_code == 200
    data = chat_response.json()["data"]
    assert data["intent"] == "consultant_object_discovery"
    assert data["requires_confirmation"] is False
    assert data["pending_actions"] == []
    assert data["lead_context"] is None
    names = [item["customer_name"] for item in data["candidate_leads"]]
    assert "张明" in names
    assert "张明宇" in names
    assert "请选择" in data["answer"]
    assert data["orchestration"]["next_step"] == "select_customer_or_refine_query"


def test_consultant_agent_can_start_from_consultant_todo_queue():
    client.post("/api/demo/seed")
    token = _token("consultant", "consultant123")
    headers = {"Authorization": f"Bearer {token}"}

    lead_response = client.post(
        "/api/leads",
        headers=headers,
        json={
            "customer_name": "待办入口客户",
            "contact_info": "13900007780",
            "background_info": "客户等待顾问回访确认申请节奏。",
            "source_channel": "官网咨询",
        },
    )
    assert lead_response.status_code == 200
    lead_id = lead_response.json()["data"]["id"]
    task_response = client.post(
        "/api/crm/tasks",
        headers=headers,
        json={"lead_id": lead_id, "title": "今天回访待办入口客户", "owner_username": "consultant"},
    )
    assert task_response.status_code == 200

    chat_response = client.post(
        "/api/consultant-agent/chat",
        headers=headers,
        json={"message": "我今天有哪些客户待办需要优先处理？"},
    )

    assert chat_response.status_code == 200
    data = chat_response.json()["data"]
    assert data["intent"] == "consultant_object_discovery"
    assert data["pending_actions"] == []
    assert data["candidate_leads"][0]["id"] == lead_id
    assert data["candidate_leads"][0]["open_task_count"] >= 1
    assert "待办" in data["answer"]
    assert data["orchestration"]["context_sources"] == ["crm_lead_queue", "crm_task"]


def test_consultant_agent_reads_selected_customer_context_without_creating_pending_action():
    client.post("/api/demo/seed")
    token = _token("consultant", "consultant123")
    headers = {"Authorization": f"Bearer {token}"}

    lead_response = client.post(
        "/api/leads",
        headers=headers,
        json={
            "customer_name": "上下文查询客户",
            "contact_info": "13900007779",
            "background_info": "官网咨询客户，计划申请英国本科，预算38万。",
            "source_channel": "官网咨询",
        },
    )
    assert lead_response.status_code == 200
    lead_id = lead_response.json()["data"]["id"]

    follow_response = client.post(
        f"/api/leads/{lead_id}/follow-ups",
        headers=headers,
        json={"follow_type": "电话", "content": "已确认预算和目标国家，卡在语言成绩。", "next_action": "补交雅思成绩"},
    )
    assert follow_response.status_code == 200

    chat_response = client.post(
        "/api/consultant-agent/chat",
        headers=headers,
        json={"lead_id": lead_id, "message": "这个客户最近跟进了什么？现在卡在哪里？"},
    )

    assert chat_response.status_code == 200
    data = chat_response.json()["data"]
    assert data["intent"] == "consultant_context_query"
    assert data["requires_confirmation"] is False
    assert data["requires_more_info"] is False
    assert data["pending_actions"] == []
    assert data["lead_context"]["id"] == lead_id
    assert "已确认预算和目标国家" in data["answer"]
    assert "语言成绩" in data["answer"]
    assert data["orchestration"]["mode"] == "read_context"
    assert data["orchestration"]["business_tools"] == []
    assert data["orchestration"]["next_step"] == "suggest_followup_or_task_if_needed"


def test_consultant_agent_asks_follow_up_when_project_assessment_lacks_budget():
    client.post("/api/demo/seed")
    token = _token("consultant", "consultant123")
    headers = {"Authorization": f"Bearer {token}"}

    lead_response = client.post(
        "/api/leads",
        headers=headers,
        json={
            "customer_name": "待追问客户",
            "contact_info": "13900007774",
            "background_info": "高三在读，目标新加坡本科，家长想先判断方向。",
            "source_channel": "官网咨询",
        },
    )
    assert lead_response.status_code == 200
    lead_id = lead_response.json()["data"]["id"]

    chat_response = client.post(
        "/api/consultant-agent/chat",
        headers=headers,
        json={"lead_id": lead_id, "message": "帮我判断这个客户适合哪个项目。"},
    )

    assert chat_response.status_code == 200
    data = chat_response.json()["data"]
    assert data["requires_confirmation"] is False
    assert data["requires_more_info"] is True
    assert data["pending_actions"] == []
    assert any("预算" in question for question in data["follow_up_questions"])
    assert data["lead_context"]["id"] == lead_id
    orchestration = data["orchestration"]
    assert orchestration["mode"] == "ask_more_info"
    assert orchestration["requires_confirmation"] is False
    assert orchestration["business_tools"] == []
    assert orchestration["next_step"] == "collect_missing_customer_context"


def test_consultant_agent_uses_follow_up_context_for_same_lead_after_user_adds_budget():
    client.post("/api/demo/seed")
    token = _token("consultant", "consultant123")
    headers = {"Authorization": f"Bearer {token}"}

    lead_response = client.post(
        "/api/leads",
        headers=headers,
        json={
            "customer_name": "连续补充客户",
            "contact_info": "13900007775",
            "background_info": "高三在读，目标新加坡本科，家长想先判断方向。",
            "source_channel": "官网咨询",
        },
    )
    assert lead_response.status_code == 200
    lead_id = lead_response.json()["data"]["id"]

    chat_response = client.post(
        "/api/consultant-agent/chat",
        headers=headers,
        json={
            "lead_id": lead_id,
            "message": "预算30万，雅思6.0，继续为这个客户生成电话跟进草稿。",
            "conversation_context": ["上一轮追问：预算范围、语言成绩和目标入学时间还不完整。"],
        },
    )

    assert chat_response.status_code == 200
    data = chat_response.json()["data"]
    assert data["requires_more_info"] is False
    assert data["lead_context"]["id"] == lead_id
    assert data["lead_context"]["conversation_context"][0].startswith("上一轮追问")
    assert [item["action_type"] for item in data["pending_actions"]] == ["create_follow_up"]
    assert "预算30万" in data["pending_actions"][0]["draft"]["content"]
    assert "雅思6.0" in data["pending_actions"][0]["draft"]["content"]


def test_consultant_agent_confirm_audits_selected_and_edited_drafts():
    client.post("/api/demo/seed")
    token = _token("consultant", "consultant123")
    headers = {"Authorization": f"Bearer {token}"}

    lead_response = client.post(
        "/api/leads",
        headers=headers,
        json={
            "customer_name": "部分确认客户",
            "contact_info": "13900007773",
            "background_info": "客户需要先电话确认预算，任务和阶段稍后再处理。",
            "source_channel": "官网咨询",
        },
    )
    assert lead_response.status_code == 200
    lead_id = lead_response.json()["data"]["id"]

    chat_response = client.post(
        "/api/consultant-agent/chat",
        headers=headers,
        json={"lead_id": lead_id, "message": "生成跟进、任务和阶段建议，我先挑一部分确认。"},
    )
    assert chat_response.status_code == 200
    draft = chat_response.json()["data"]
    selected_follow_up = next(item for item in draft["pending_actions"] if item["action_type"] == "create_follow_up")
    selected_follow_up["draft"]["content"] = "用户修改后的电话跟进内容：先确认预算和目标专业。"
    selected_follow_up["draft"]["next_action"] = "周五前补齐预算范围。"

    confirm_response = client.post(
        "/api/consultant-agent/actions/confirm",
        headers=headers,
        json={
            "lead_id": lead_id,
            "idempotency_key": draft["idempotency_key"],
            "pending_actions": [selected_follow_up],
        },
    )
    assert confirm_response.status_code == 200
    confirm_payload = confirm_response.json()["data"]
    assert [item["action_type"] for item in confirm_payload["results"]] == ["create_follow_up"]

    db = SessionLocal()
    try:
        action_log = db.query(AgentActionLog).filter(AgentActionLog.id == confirm_payload["action_log_id"]).one()
        payload = json.loads(action_log.payload_json)
    finally:
        db.close()

    assert payload["confirmed_actions"][0]["action_type"] == "create_follow_up"
    assert payload["confirmed_actions"][0]["draft"]["content"] == "用户修改后的电话跟进内容：先确认预算和目标专业。"

    timeline = client.get(f"/api/leads/{lead_id}/timeline", headers=headers).json()["data"]
    timeline_titles = [item["title"] for item in timeline]
    assert "新增跟进" in timeline_titles
    assert "创建任务" not in timeline_titles
    assert "阶段流转" not in timeline_titles


def test_consultant_agent_confirmed_changes_are_traceable_in_manager_customer_report():
    client.post("/api/demo/seed")
    consultant_token = _token("consultant", "consultant123")
    consultant_headers = {"Authorization": f"Bearer {consultant_token}"}
    manager_token = _token("manager", "manager123")
    manager_headers = {"Authorization": f"Bearer {manager_token}"}

    lead_response = client.post(
        "/api/leads",
        headers=consultant_headers,
        json={
            "customer_name": "端到端闭环客户",
            "contact_info": "13900006555",
            "background_info": "官网报名客户，计划申请新加坡本科，家长关注费用和录取把握。",
            "source_channel": "官网报名",
        },
    )
    assert lead_response.status_code == 200
    lead_id = lead_response.json()["data"]["id"]

    chat_response = client.post(
        "/api/consultant-agent/chat",
        headers=consultant_headers,
        json={
            "lead_id": lead_id,
            "message": "请为官网报名客户生成跟进、三天后回访任务，并推进到已初步研判。",
        },
    )
    assert chat_response.status_code == 200
    draft = chat_response.json()["data"]

    confirm_response = client.post(
        "/api/consultant-agent/actions/confirm",
        headers=consultant_headers,
        json={
            "lead_id": lead_id,
            "idempotency_key": draft["idempotency_key"],
            "pending_actions": draft["pending_actions"],
        },
    )
    assert confirm_response.status_code == 200

    report_response = client.post(
        "/api/reports/generate",
        headers=manager_headers,
        json={"report_type": "customer_operation", "generated_by": "manager"},
    )
    assert report_response.status_code == 200
    report_id = report_response.json()["data"]["id"]

    detail_response = client.get(f"/api/reports/{report_id}", headers=manager_headers)
    assert detail_response.status_code == 200
    content = detail_response.json()["data"]["content"]
    recent_changes = content["recent_customer_changes"]
    target_change = next(item for item in recent_changes if item["lead_id"] == lead_id)
    assert target_change["customer_name"] == "端到端闭环客户"
    assert target_change["source_channel"] == "官网报名"
    assert target_change["status"] == "已初步研判"
    assert {"阶段流转", "创建任务", "新增跟进"}.issubset(set(target_change["timeline_titles"]))


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
