from fastapi.testclient import TestClient

from app.core.database import init_db
from app.main import app


init_db()
client = TestClient(app)


def _auth_headers(username: str = "admin", password: str = "admin123") -> dict[str, str]:
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['data']['access_token']}"}


def test_knowledge_sources_sync_jobs_scene_logs_and_fallback_api():
    seed_response = client.post("/api/demo/seed")
    assert seed_response.status_code == 200
    assert seed_response.json()["code"] == 0
    client.headers.update(_auth_headers())

    chat_response = client.post(
        "/api/knowledge/chat",
        json={
            "scene": "student_life",
            "question": "海外学生遇到紧急医疗问题应该怎么求助？",
            "lead_id": None,
            "conversation_id": None,
        },
    )
    assert chat_response.status_code == 200
    chat_payload = chat_response.json()
    assert chat_payload["code"] == 0
    assert chat_payload["data"]["scene"] == "student_life"
    assert chat_payload["data"]["status"] == "fallback"
    assert "Dify 未配置" in chat_payload["data"]["fallback_reason"]

    source_response = client.post(
        "/api/knowledge/sources",
        json={
            "source_name": "阶段八海外生活知识",
            "source_type": "document",
            "scene": "student_life",
            "owner": "学生服务部",
            "description": "用于验证学生生活支持场景的知识来源管理。",
            "status": "启用",
            "operator_username": "admin",
        },
    )
    assert source_response.status_code == 200
    source_payload = source_response.json()
    assert source_payload["code"] == 0
    source_id = source_payload["data"]["id"]
    assert source_payload["data"]["scene"] == "student_life"
    assert source_payload["data"]["status"] == "启用"

    sources_response = client.get("/api/knowledge/sources?scene=student_life")
    assert sources_response.status_code == 200
    sources_payload = sources_response.json()
    assert sources_payload["code"] == 0
    assert any(item["id"] == source_id for item in sources_payload["data"])

    sync_response = client.post(
        "/api/knowledge/sync-jobs",
        json={
            "source_id": source_id,
            "job_type": "manual_record",
            "triggered_by": "admin",
        },
    )
    assert sync_response.status_code == 200
    sync_payload = sync_response.json()
    assert sync_payload["code"] == 0
    assert sync_payload["data"]["source_id"] == source_id
    assert sync_payload["data"]["status"] == "fallback_recorded"
    assert "未执行真实 Dify 同步" in sync_payload["data"]["message"]

    health_response = client.get("/api/knowledge/dify-health")
    assert health_response.status_code == 200
    health_payload = health_response.json()
    assert health_payload["code"] == 0
    assert health_payload["data"]["configured"] is False
    assert "dify_api_key" in health_payload["data"]["missing"]

    retry_response = client.post(f"/api/knowledge/sync-jobs/{sync_payload['data']['id']}/retry", json={"triggered_by": "admin"})
    assert retry_response.status_code == 200
    retry_payload = retry_response.json()
    assert retry_payload["code"] == 0
    assert retry_payload["data"]["status"] == "retry_fallback_recorded"
    assert "Dify 配置未完成" in retry_payload["data"]["message"]

    jobs_response = client.get("/api/knowledge/sync-jobs")
    assert jobs_response.status_code == 200
    jobs_payload = jobs_response.json()
    assert jobs_payload["code"] == 0
    assert any(item["source_id"] == source_id for item in jobs_payload["data"])

    logs_response = client.get("/api/knowledge/logs?scene=student_life")
    assert logs_response.status_code == 200
    logs_payload = logs_response.json()
    assert logs_payload["code"] == 0
    assert any(item["scene"] == "student_life" and item["status"] == "fallback" for item in logs_payload["data"])

    audit_response = client.get("/api/audit/logs")
    assert audit_response.status_code == 200
    audit_actions = [item["action"] for item in audit_response.json()["data"]]
    assert "创建知识来源" in audit_actions
    assert "记录知识同步任务" in audit_actions
