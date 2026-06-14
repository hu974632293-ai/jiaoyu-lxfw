from datetime import datetime, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.database import init_db
from app.core.database import SessionLocal
from app.main import app
from app.models.user import SysUser


init_db()
client = TestClient(app)


def _auth_headers(username: str = "admin", password: str = "admin123") -> dict[str, str]:
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['data']['access_token']}"}


def test_crm_follow_up_task_stage_timeline_and_audit_api():
    seed_response = client.post("/api/demo/seed")
    assert seed_response.status_code == 200
    assert seed_response.json()["code"] == 0
    client.headers.update(_auth_headers())

    create_lead_response = client.post(
        "/api/leads",
        json={
            "customer_name": "阶段三CRM测试客户",
            "contact_info": "13800000003",
            "background_info": "家长关注新加坡本科申请，需要顾问持续跟进。",
        },
    )
    assert create_lead_response.status_code == 200
    lead_id = create_lead_response.json()["data"]["id"]

    follow_response = client.post(
        f"/api/leads/{lead_id}/follow-ups",
        json={
            "follow_type": "电话",
            "content": "已沟通申请预算和时间线，家长希望预约周末说明会。",
            "next_action": "创建说明会邀约任务",
            "operator_username": "admin",
        },
    )
    assert follow_response.status_code == 200
    follow_payload = follow_response.json()
    assert follow_payload["code"] == 0
    assert follow_payload["data"]["lead_id"] == lead_id
    assert follow_payload["data"]["content"] == "已沟通申请预算和时间线，家长希望预约周末说明会。"

    task_response = client.post(
        "/api/crm/tasks",
        json={
            "lead_id": lead_id,
            "title": "邀约客户参加新加坡本科说明会",
            "owner_username": "admin",
        },
    )
    assert task_response.status_code == 200
    task_payload = task_response.json()
    assert task_payload["code"] == 0
    task_id = task_payload["data"]["id"]
    assert task_payload["data"]["status"] == "待处理"

    complete_response = client.patch(
        f"/api/crm/tasks/{task_id}/complete",
        json={"operator_username": "admin"},
    )
    assert complete_response.status_code == 200
    complete_payload = complete_response.json()
    assert complete_payload["code"] == 0
    assert complete_payload["data"]["status"] == "已完成"
    assert complete_payload["data"]["completed_at"]

    status_response = client.patch(
        f"/api/leads/{lead_id}/status",
        json={
            "status": "converted",
            "reason": "客户确认报名服务包",
            "operator_username": "admin",
        },
    )
    assert status_response.status_code == 200
    assert status_response.json()["data"]["status"] == "converted"

    timeline_response = client.get(f"/api/leads/{lead_id}/timeline")
    assert timeline_response.status_code == 200
    timeline_payload = timeline_response.json()
    assert timeline_payload["code"] == 0
    timeline_types = {item["type"] for item in timeline_payload["data"]}
    assert {"lead_created", "follow_up", "task", "stage_history"}.issubset(timeline_types)
    assert any(item["title"] == "新增跟进" for item in timeline_payload["data"])
    assert any(item["title"] == "完成任务" for item in timeline_payload["data"])
    assert any(item["title"] == "阶段流转" and item["meta"]["to_status"] == "converted" for item in timeline_payload["data"])

    audit_response = client.get("/api/audit/logs")
    assert audit_response.status_code == 200
    audit_actions = [item["action"] for item in audit_response.json()["data"]]
    assert "新增CRM跟进" in audit_actions
    assert "完成CRM任务" in audit_actions
    assert "更新CRM阶段" in audit_actions


def test_leads_support_keyword_status_owner_source_and_time_filters():
    seed_response = client.post("/api/demo/seed")
    assert seed_response.status_code == 200
    client.headers.update(_auth_headers())

    db = SessionLocal()
    try:
        admin = db.query(SysUser).filter_by(username="admin").first()
        assert admin is not None
        owner_id = admin.id
    finally:
        db.close()

    now = datetime.utcnow()
    created_from = (now - timedelta(days=1)).date().isoformat()
    created_to = (now + timedelta(days=1)).date().isoformat()
    unique_token = uuid4().hex[:8]
    target_name = f"阶段四筛选目标客户{unique_token}"
    source_channel = f"官网咨询{unique_token}"

    target_response = client.post(
        "/api/leads",
        json={
            "customer_name": target_name,
            "contact_info": "filter-target",
            "background_info": "关注新加坡本科申请，需要顾问持续跟进。",
            "owner_id": owner_id,
            "source_channel": source_channel,
        },
    )
    assert target_response.status_code == 200
    target_id = target_response.json()["data"]["id"]

    other_response = client.post(
        "/api/leads",
        json={
            "customer_name": "阶段四筛选干扰客户",
            "contact_info": "filter-other",
            "background_info": "同样关注申请，但来源和负责人不同。",
            "source_channel": "活动报名",
        },
    )
    assert other_response.status_code == 200
    other_id = other_response.json()["data"]["id"]

    for lead_id in (target_id, other_id):
        status_response = client.patch(
            f"/api/leads/{lead_id}/status",
            json={
                "status": "high_potential",
                "reason": "阶段四筛选测试",
                "operator_username": "admin",
            },
        )
        assert status_response.status_code == 200

    filtered_response = client.get(
        "/api/leads",
        params={
            "keyword": unique_token,
            "status": "high_potential",
            "owner_id": owner_id,
            "source_channel": source_channel,
            "created_from": created_from,
            "created_to": created_to,
        },
    )
    assert filtered_response.status_code == 200
    payload = filtered_response.json()
    assert payload["code"] == 0
    assert payload["data"] == [
        {
            "id": target_id,
            "customer_name": target_name,
            "status": "high_potential",
            "owner_id": owner_id,
            "source_channel": source_channel,
        }
    ]
