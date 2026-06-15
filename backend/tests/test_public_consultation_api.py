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
