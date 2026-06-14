from pathlib import Path

from app.core.config import parse_cors_origins


def test_cors_origins_are_read_from_environment_style_value():
    origins = parse_cors_origins("https://crm.example.com, https://admin.example.com,")

    assert origins == ["https://crm.example.com", "https://admin.example.com"]


def test_deployment_delivery_runbook_covers_required_operations():
    project_root = Path(__file__).resolve().parents[2]
    runbook_path = project_root / "docs" / "deployment-delivery-runbook.md"

    assert runbook_path.exists()
    content = runbook_path.read_text(encoding="utf-8")
    for required_text in [
        "后端启动",
        "前端启动",
        "环境变量",
        "Dify",
        "MySQL",
        "Alembic",
        "健康检查",
        "生产初始化",
        "演示 seed",
        "备份",
        "恢复",
        "CORS",
    ]:
        assert required_text in content
