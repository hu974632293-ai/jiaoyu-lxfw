from fastapi.testclient import TestClient

from app.core.database import init_db
from app.main import app


init_db()
client = TestClient(app)


def test_enterprise_assistant_chat_daily_org_nl2sql_and_audit_api():
    seed_response = client.post("/api/demo/seed")
    assert seed_response.status_code == 200
    assert seed_response.json()["code"] == 0

    create_lead_response = client.post(
        "/api/enterprise-assistant/chat",
        json={
            "message": "帮我录入一个客户：阶段六企业助手客户，高三，想去新加坡读本科，家长关注费用，电话 13900006666",
            "actor_username": "admin",
        },
    )
    assert create_lead_response.status_code == 200
    create_lead_payload = create_lead_response.json()
    assert create_lead_payload["code"] == 0
    assert create_lead_payload["data"]["intent"] == "create_lead"
    lead_id = create_lead_payload["data"]["result"]["lead_id"]
    assert create_lead_payload["data"]["result"]["customer_name"] == "阶段六企业助手客户"

    query_response = client.post(
        "/api/enterprise-assistant/chat",
        json={"message": "查询客户 阶段六企业助手客户", "actor_username": "admin"},
    )
    assert query_response.status_code == 200
    query_payload = query_response.json()
    assert query_payload["code"] == 0
    assert query_payload["data"]["intent"] == "query_lead"
    assert any(item["id"] == lead_id for item in query_payload["data"]["result"]["leads"])

    update_status_response = client.post(
        "/api/enterprise-assistant/chat",
        json={"message": f"把客户 {lead_id} 状态更新为 high_potential，原因：已确认预算", "actor_username": "admin"},
    )
    assert update_status_response.status_code == 200
    update_status_payload = update_status_response.json()
    assert update_status_payload["code"] == 0
    assert update_status_payload["data"]["intent"] == "update_lead_status"
    assert update_status_payload["data"]["result"]["status"] == "high_potential"

    daily_response = client.post(
        "/api/enterprise-assistant/daily-reports",
        json={
            "content": "今天跟进 8 个客户，2 个高潜进入活动邀约，风险是德国项目材料不齐，明天补齐材料清单。",
            "actor_username": "admin",
        },
    )
    assert daily_response.status_code == 200
    daily_payload = daily_response.json()
    assert daily_payload["code"] == 0
    assert daily_payload["data"]["structured_summary"]["progress"].startswith("今天跟进")
    assert daily_payload["data"]["risks"]

    reports_response = client.get("/api/enterprise-assistant/daily-reports")
    assert reports_response.status_code == 200
    reports_payload = reports_response.json()
    assert reports_payload["code"] == 0
    assert any(item["id"] == daily_payload["data"]["id"] for item in reports_payload["data"])

    summary_response = client.get("/api/enterprise-assistant/daily-reports/summary")
    assert summary_response.status_code == 200
    summary_payload = summary_response.json()
    assert summary_payload["code"] == 0
    assert summary_payload["data"]["report_count"] >= 1
    assert "德国项目材料不齐" in summary_payload["data"]["risks_text"]

    org_response = client.get("/api/enterprise-assistant/org-units")
    assert org_response.status_code == 200
    org_payload = org_response.json()
    assert org_payload["code"] == 0
    assert any(item["unit_name"] == "双元制事业部" for item in org_payload["data"])

    guide_response = client.post(
        "/api/enterprise-assistant/chat",
        json={"message": "查一下双元制事业部负责人和新人入职流程", "actor_username": "admin"},
    )
    assert guide_response.status_code == 200
    guide_payload = guide_response.json()
    assert guide_payload["code"] == 0
    assert guide_payload["data"]["intent"] == "guide_qa"
    assert guide_payload["data"]["status"] == "fallback"
    assert "新人入职" in guide_payload["data"]["answer"]

    nl2sql_response = client.post(
        "/api/enterprise-assistant/nl2sql/query",
        json={"question": "查询本周高潜线索数量", "actor_username": "admin"},
    )
    assert nl2sql_response.status_code == 200
    nl2sql_payload = nl2sql_response.json()
    assert nl2sql_payload["code"] == 0
    assert nl2sql_payload["data"]["status"] == "success"
    assert nl2sql_payload["data"]["sql_template"] == "count_high_potential_leads"

    blocked_response = client.post(
        "/api/enterprise-assistant/nl2sql/query",
        json={"question": "删除所有客户", "actor_username": "admin"},
    )
    assert blocked_response.status_code == 200
    blocked_payload = blocked_response.json()
    assert blocked_payload["code"] == 0
    assert blocked_payload["data"]["status"] == "blocked"

    audit_response = client.get("/api/audit/logs")
    assert audit_response.status_code == 200
    audit_actions = [item["action"] for item in audit_response.json()["data"]]
    assert "企业助手创建客户" in audit_actions
    assert "企业助手更新客户状态" in audit_actions
    assert "提交企业日报" in audit_actions
