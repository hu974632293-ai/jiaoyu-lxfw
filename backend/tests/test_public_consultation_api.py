from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.database import init_db
from app.main import app


init_db()
client = TestClient(app)


def test_public_consultation_creates_consultant_owned_lead_visible_in_queue():
    token = uuid4().hex[:8]
    customer_name = f"官网咨询访客{token}"

    response = client.post(
        "/api/leads/public-consultations",
        json={
            "customer_name": customer_name,
            "contact_info": f"139{token[:8]}",
            "consultation_direction": "新加坡本科 / 德国双元制",
            "background_info": "高三在读，家长想先判断预算和申请时间线。",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    assert payload["data"]["id"] is not None
    assert payload["data"]["customer_name"] == customer_name
    assert payload["data"]["source_channel"] == "官网咨询"
    assert payload["data"]["owner_id"] is not None

    leads_response = client.get("/api/leads", params={"source_channel": "官网咨询", "keyword": token})
    assert leads_response.status_code == 200
    leads_payload = leads_response.json()
    assert leads_payload["code"] == 0
    assert any(
        item["id"] == payload["data"]["id"]
        and item["customer_name"] == customer_name
        and item["source_channel"] == "官网咨询"
        and item["owner_id"] == payload["data"]["owner_id"]
        for item in leads_payload["data"]
    )


def _auth_headers(username: str = "consultant", password: str = "consultant123") -> dict[str, str]:
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['data']['access_token']}"}


def test_public_consultation_flows_through_consultant_agent_customer360_and_report():
    token = uuid4().hex[:8]
    customer_name = f"官网咨询Agent客户{token}"
    create_response = client.post(
        "/api/leads/public-consultations",
        json={
            "customer_name": customer_name,
            "contact_info": f"138{token[:8]}",
            "consultation_direction": "新加坡本科",
            "background_info": "家长需要确认申请节奏和预算边界。",
        },
    )
    assert create_response.status_code == 200
    lead = create_response.json()["data"]
    lead_id = lead["id"]
    assert lead["source_channel"] == "官网咨询"

    consultant_headers = _auth_headers()
    draft_response = client.post(
        "/api/consultant-agent/chat",
        headers=consultant_headers,
        json={"lead_id": lead_id, "message": "请接住这个官网咨询线索，生成跟进、任务和阶段建议。"},
    )
    assert draft_response.status_code == 200
    draft_payload = draft_response.json()
    assert draft_payload["code"] == 0
    draft = draft_payload["data"]
    assert draft["requires_confirmation"] is True
    assert draft["lead_context"]["id"] == lead_id
    assert draft["lead_context"]["source_channel"] == "官网咨询"
    assert {item["action_type"] for item in draft["pending_actions"]} == {"create_follow_up", "create_task", "update_lead_status"}

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
    confirm_payload = confirm_response.json()
    assert confirm_payload["code"] == 0
    assert {item["action_type"] for item in confirm_payload["data"]["results"]} == {
        "create_follow_up",
        "create_task",
        "update_lead_status",
    }

    timeline_response = client.get(f"/api/leads/{lead_id}/timeline")
    assert timeline_response.status_code == 200
    timeline_payload = timeline_response.json()
    assert timeline_payload["code"] == 0
    timeline_titles = {item["title"] for item in timeline_payload["data"]}
    assert {"新增跟进", "创建任务", "阶段流转"}.issubset(timeline_titles)

    admin_headers = _auth_headers("admin", "admin123")
    report_response = client.post(
        "/api/reports/generate",
        headers=admin_headers,
        json={"report_type": "customer_operation", "generated_by": "admin"},
    )
    assert report_response.status_code == 200
    report_payload = report_response.json()
    assert report_payload["code"] == 0
    report_id = report_payload["data"]["id"]

    detail_response = client.get(f"/api/reports/{report_id}", headers=admin_headers)
    assert detail_response.status_code == 200
    detail_payload = detail_response.json()
    assert detail_payload["code"] == 0
    changes = detail_payload["data"]["content"]["recent_customer_changes"]
    target_change = next(item for item in changes if item["lead_id"] == lead_id)
    assert target_change["customer_name"] == customer_name
    assert target_change["source_channel"] == "官网咨询"
    assert {"新增跟进", "创建任务", "阶段流转"}.issubset(set(target_change["timeline_titles"]))
