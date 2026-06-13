"""批次二 Agent 契约测试：场景化降级回答和知识源路由"""
from fastapi.testclient import TestClient

from app.core.database import init_db
from app.main import app

init_db()
client = TestClient(app)


def _token(username: str, password: str) -> str:
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["data"]["access_token"]


def test_customer_service_fallback_returns_business_answer():
    """客服场景降级时返回有业务价值的答案而非占位话术"""
    client.post("/api/demo/seed")
    response = client.post(
        "/api/knowledge/chat",
        json={"scene": "customer_service", "question": "澜桥国际教育提供哪些服务？"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    # fallback 答案应包含业务关键词
    assert any(kw in payload["data"]["answer"] for kw in ["新加坡", "德国", "双元制", "升学"])


def test_enterprise_guide_fallback_returns_onboarding_info():
    """企业新人指南降级时返回入职流程信息"""
    client.post("/api/demo/seed")
    response = client.post(
        "/api/knowledge/chat",
        json={"scene": "enterprise_guide", "question": "入职第一周需要完成什么？"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    assert "入职" in payload["data"]["answer"] or "第一天" in payload["data"]["answer"] or "新人" in payload["data"]["answer"]


def test_student_life_fallback_returns_medical_advice():
    """学生生活降级时返回海外医疗指引"""
    client.post("/api/demo/seed")
    response = client.post(
        "/api/knowledge/chat",
        json={"scene": "student_life", "question": "海外学生遇到紧急医疗问题应该怎么求助？"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    assert any(kw in payload["data"]["answer"] for kw in ["急救", "诊所", "医院", "995", "112", "保险"])


def test_student_life_psych_safety_boundary():
    """学生生活场景的心理关怀回复包含安全边界引导"""
    client.post("/api/demo/seed")
    response = client.post(
        "/api/knowledge/chat",
        json={"scene": "student_life", "question": "我感觉压力很大，失眠很长时间了"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    answer = payload["data"]["answer"]
    assert "周老师" in answer or "8020" in answer or "心理" in answer
