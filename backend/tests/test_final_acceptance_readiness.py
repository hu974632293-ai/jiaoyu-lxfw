from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def read_doc(relative_path: str) -> str:
    return (PROJECT_ROOT / relative_path).read_text(encoding="utf-8")


def test_business_flow_plan_keeps_b1_to_b12_acceptance_cases():
    content = read_doc("docs/business-flow-test-plan.md")

    for index in range(1, 13):
        assert f"| B{index} |" in content


def test_final_acceptance_checklist_covers_execution_modes_and_delivery_scope():
    checklist_path = PROJECT_ROOT / "docs" / "verification-checklist.md"

    assert checklist_path.exists()
    content = checklist_path.read_text(encoding="utf-8")

    for required_text in [
        "B1-B12",
        "自动化验证",
        "人工浏览器验收",
        "SQLite 验收",
        "MySQL 验收",
        "不能把 SQLite 通过写成 MySQL 通过",
        "Dify 未配置 fallback",
        "真实 Dify 验收",
        "登录",
        "官网",
        "顾问",
        "CRM",
        "员工",
        "学生",
        "老师",
        "报告",
        "权限",
        "审计",
        "通知",
        "Dify",
        "导出",
        "部署",
    ]:
        assert required_text in content


def test_status_documents_record_final_acceptance_readiness_batch():
    audit = read_doc("docs/v3-current-consistency-audit.md")
    design = read_doc("docs/superpowers/specs/2026-06-13-agent-requirement-coverage-design.md")

    for content in [audit, design]:
        assert "最终 B1-B12 验收准备" in content
        assert "docs/verification-checklist.md" in content
        assert "docs/v3-final-acceptance-readiness.md" in content


def test_final_acceptance_readiness_document_covers_risk_and_configuration_matrix():
    readiness_path = PROJECT_ROOT / "docs" / "v3-final-acceptance-readiness.md"

    assert readiness_path.exists()
    content = readiness_path.read_text(encoding="utf-8")

    for flow_id in [f"B{index}" for index in range(1, 13)]:
        assert flow_id in content

    for required_text in [
        "已自动验证",
        "需人工验收",
        "上线后配置项",
        "角色边界",
        "前端入口",
        "API/对象",
        "自动验证命令",
        "人工验收项",
        "上线配置项",
        "已知风险",
        "Dify key/app/dataset",
        "SQLite",
        "MySQL",
    ]:
        assert required_text in content
