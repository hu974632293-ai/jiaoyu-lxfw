from fastapi.testclient import TestClient

from app.core.database import init_db
from app.main import app


init_db()
client = TestClient(app)


def _auth_headers(username: str = "admin", password: str = "admin123") -> dict[str, str]:
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['data']['access_token']}"}


def test_project_course_management_and_recommendation_api():
    seed_response = client.post("/api/demo/seed")
    assert seed_response.status_code == 200
    assert seed_response.json()["code"] == 0
    client.headers.update(_auth_headers())

    create_response = client.post(
        "/api/projects",
        json={
            "project_name": "阶段四项目管理测试计划",
            "country": "新加坡",
            "category": "升学规划",
            "target_audience": "高中毕业生、专科升学人群",
            "description": "用于验证项目课程真实 API 闭环。",
            "cost_range": "12-18 万/年",
            "duration": "2-4 年",
            "admission_requirements": "基础成绩达标，材料完整，可参加语言衔接。",
            "tags": ["升学", "低风险", "短学制"],
            "recommendation_rule": "当客户关注升学、短学制和低风险时优先推荐。",
            "knowledge_source": "新加坡项目手册",
            "operator_username": "admin",
        },
    )
    assert create_response.status_code == 200
    create_payload = create_response.json()
    assert create_payload["code"] == 0
    project_id = create_payload["data"]["id"]
    assert create_payload["data"]["cost_range"] == "12-18 万/年"
    assert "低风险" in create_payload["data"]["tags"]

    detail_response = client.get(f"/api/projects/{project_id}")
    assert detail_response.status_code == 200
    detail_payload = detail_response.json()
    assert detail_payload["code"] == 0
    assert detail_payload["data"]["project_name"] == "阶段四项目管理测试计划"
    assert detail_payload["data"]["admission_requirements"].startswith("基础成绩达标")

    update_response = client.patch(
        f"/api/projects/{project_id}",
        json={
            "cost_range": "10-16 万/年",
            "tags": ["升学", "低成本", "短学制"],
            "recommendation_rule": "当客户关注升学、低成本和短学制时优先推荐。",
            "operator_username": "admin",
        },
    )
    assert update_response.status_code == 200
    update_payload = update_response.json()
    assert update_payload["code"] == 0
    assert update_payload["data"]["cost_range"] == "10-16 万/年"
    assert "低成本" in update_payload["data"]["tags"]

    recommendation_response = client.get("/api/projects/recommendations?tags=升学&tags=低成本")
    assert recommendation_response.status_code == 200
    recommendation_payload = recommendation_response.json()
    assert recommendation_payload["code"] == 0
    assert any(item["project_id"] == project_id for item in recommendation_payload["data"])

    audit_response = client.get("/api/audit/logs")
    assert audit_response.status_code == 200
    audit_actions = [item["action"] for item in audit_response.json()["data"]]
    assert "创建项目课程" in audit_actions
    assert "更新项目课程" in audit_actions
