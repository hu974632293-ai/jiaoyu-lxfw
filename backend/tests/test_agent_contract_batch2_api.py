"""批次二 Agent 契约测试：场景化降级回答和知识源路由"""
from pathlib import Path

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
    token = _token("employee", "employee123")
    response = client.post(
        "/api/knowledge/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={"scene": "enterprise_guide", "question": "入职第一周需要完成什么？"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    assert "入职" in payload["data"]["answer"] or "第一天" in payload["data"]["answer"] or "新人" in payload["data"]["answer"]


def test_student_life_fallback_returns_medical_advice():
    """学生生活降级时返回海外医疗指引"""
    client.post("/api/demo/seed")
    token = _token("student", "student123")
    response = client.post(
        "/api/knowledge/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={"scene": "student_life", "question": "海外学生遇到紧急医疗问题应该怎么求助？"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    assert any(kw in payload["data"]["answer"] for kw in ["急救", "诊所", "医院", "995", "112", "保险"])


def test_student_life_psych_safety_boundary():
    """学生生活场景的心理关怀回复包含安全边界引导"""
    client.post("/api/demo/seed")
    token = _token("student", "student123")
    response = client.post(
        "/api/knowledge/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={"scene": "student_life", "question": "我感觉压力很大，失眠很长时间了"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    answer = payload["data"]["answer"]
    assert "周老师" in answer or "8020" in answer or "心理" in answer


def test_dify_yaml_declares_five_core_scenes():
    """Dify YAML 覆盖客服、新人指南、学生生活、客户研判和报告解释五类核心场景"""
    yaml_path = Path(__file__).resolve().parents[2] / "docs" / "dify" / "education-service-agent.yml"
    yaml_text = yaml_path.read_text(encoding="utf-8")
    for scene in [
        "customer_service",
        "enterprise_guide",
        "student_life",
        "customer_assessment",
        "report_assistant",
    ]:
        assert f'app_id: "{scene}"' in yaml_text
    assert "客户研判" in yaml_text
    assert "报告解释" in yaml_text


def test_seed_knowledge_sources_cover_assessment_and_report_scenes():
    """知识来源治理默认登记客户研判和报告解释资料分类"""
    client.post("/api/demo/seed")
    token = _token("admin", "admin123")
    response = client.get("/api/knowledge/sources", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    scenes = {item["scene"]: item["source_name"] for item in response.json()["data"]}
    assert scenes["customer_assessment"] == "画像研判规则"
    assert scenes["report_assistant"] == "报告解释口径"


def test_internal_agent_scene_requires_login():
    """内部 Agent 场景不能被匿名用户访问"""
    client.post("/api/demo/seed")
    response = client.post(
        "/api/knowledge/chat",
        json={"scene": "customer_assessment", "question": "这个客户适合哪个项目？"},
    )
    assert response.status_code == 401
    assert response.json()["code"] == 40100


def test_customer_assessment_scene_returns_contextual_fallback_for_consultant():
    """顾问访问客户研判场景时，Dify 未配置也返回可解释研判建议和场景 inputs"""
    client.post("/api/demo/seed")
    token = _token("consultant", "consultant123")
    response = client.post(
        "/api/knowledge/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "scene": "customer_assessment",
            "question": "客户高中毕业，想去德国就业，帮我解释适合什么项目",
            "business_context": {"intent": "就业", "country": "德国"},
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    data = payload["data"]
    assert data["scene_label"] == "客户研判"
    assert data["request_context"]["scene"] == "customer_assessment"
    assert data["request_context"]["role"] == "consultant"
    assert data["request_context"]["actor_username"] == "consultant"
    assert any(kw in data["answer"] for kw in ["画像", "规则", "项目", "跟进", "德国"])


def test_report_assistant_scene_rejects_employee_and_allows_manager():
    """报告解释场景仅允许管理者或管理员访问"""
    client.post("/api/demo/seed")
    employee_token = _token("employee", "employee123")
    denied = client.post(
        "/api/knowledge/chat",
        headers={"Authorization": f"Bearer {employee_token}"},
        json={"scene": "report_assistant", "question": "解释本周客户经营报告"},
    )
    assert denied.status_code == 403
    assert denied.json()["code"] == 40300

    manager_token = _token("manager", "manager123")
    allowed = client.post(
        "/api/knowledge/chat",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={
            "scene": "report_assistant",
            "question": "解释本周团队日报和客户经营报告里有哪些风险",
            "business_context": {"report_type": "weekly_operation"},
        },
    )
    assert allowed.status_code == 200
    payload = allowed.json()
    assert payload["code"] == 0
    data = payload["data"]
    assert data["scene_label"] == "报告解释"
    assert data["request_context"]["role"] == "manager"
    assert any(kw in data["answer"] for kw in ["报告", "指标", "风险", "趋势", "建议"])
