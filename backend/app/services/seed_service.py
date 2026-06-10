import json
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.assistant import KnowledgeSource
from app.models.enterprise import OrganizationUnit
from app.models.event import EventLecture
from app.models.lead import CrmLead
from app.models.operation import AuditLog, Notification
from app.models.permission import SysPermission, SysRole
from app.models.project import CourseProject
from app.models.user import SysUser
from app.services.admin_service import ensure_default_admin_data

ROOT = Path(__file__).resolve().parents[3]

DEFAULT_KNOWLEDGE_SOURCES = [
    ("公司信息", "customer_service", "客服咨询", "运营部", "公司介绍、服务范围和常见咨询口径。", "启用"),
    ("公司业务", "customer_service", "客服咨询", "运营部", "项目、活动和客户服务流程。", "启用"),
    ("留学政策", "policy", "留学政策", "教研部", "新加坡、德国等方向政策资料。", "启用"),
    ("新人指南", "enterprise_guide", "企业新人指南", "人事部", "入职流程、组织架构和制度说明。", "待同步"),
    ("海外生活", "student_life", "学生生活支持", "学生服务部", "海外医疗、交通和紧急求助说明。", "待同步"),
]

DEFAULT_ORG_UNITS = [
    ("总经理办公室", "部门", "总部统筹 / 8000", 1),
    ("升学规划部", "部门", "升学咨询 / 8010", 2),
    ("双元制事业部", "部门", "赵凯 / 企业微信 / 8012", 3),
    ("学生服务部", "部门", "周老师 / 企业微信 / 8020", 4),
]


def _load_json(relative_path: str):
    path = ROOT / relative_path
    return json.loads(path.read_text(encoding="utf-8"))


def seed_demo_data(db: Session):
    if not db.query(SysUser).filter_by(username="admin").first():
        db.add(
            SysUser(
                username="admin",
                password_hash="demo",
                real_name="演示管理员",
                user_type="EMPLOYEE",
                role="admin",
            )
        )

    if db.query(CourseProject).count() == 0:
        for item in _load_json("data/demo/projects.json"):
            project_data = item.copy()
            project_data["selling_points"] = json.dumps(item["selling_points"], ensure_ascii=False)
            db.add(CourseProject(**project_data))

    if db.query(EventLecture).count() == 0:
        for item in _load_json("data/demo/events.json"):
            item["start_time"] = datetime.fromisoformat(item["start_time"])
            db.add(EventLecture(**item))

    if db.query(CrmLead).count() == 0:
        for item in _load_json("data/demo/leads.json"):
            db.add(CrmLead(**item, status="新增意向"))

    if db.query(KnowledgeSource).count() == 0:
        for source_name, scene, domain, owner, description, status in DEFAULT_KNOWLEDGE_SOURCES:
            db.add(
                KnowledgeSource(
                    source_name=source_name,
                    scene=scene,
                    business_domain=domain,
                    owner=owner,
                    description=description,
                    status=status,
                )
            )

    if db.query(OrganizationUnit).count() == 0:
        for unit_name, unit_type, contact_info, sort_order in DEFAULT_ORG_UNITS:
            db.add(
                OrganizationUnit(
                    unit_name=unit_name,
                    unit_type=unit_type,
                    contact_info=contact_info,
                    sort_order=sort_order,
                )
            )

    db.commit()
    ensure_default_admin_data(db)
    return {
        "users": db.query(SysUser).count(),
        "roles": db.query(SysRole).count(),
        "permissions": db.query(SysPermission).count(),
        "notifications": db.query(Notification).count(),
        "audit_logs": db.query(AuditLog).count(),
        "projects": db.query(CourseProject).count(),
        "events": db.query(EventLecture).count(),
        "leads": db.query(CrmLead).count(),
        "knowledge_sources": db.query(KnowledgeSource).count(),
        "organization_units": db.query(OrganizationUnit).count(),
    }
