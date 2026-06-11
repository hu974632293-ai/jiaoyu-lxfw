import json
from datetime import date, datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.assistant import AgentPromptConfig, DifyFallbackLog, KnowledgeSource
from app.models.enterprise import (
    DailyReportSummary,
    EmployeeDailyReport,
    EmployeeDirectory,
    EmployeeProfile,
    OrganizationUnit,
)
from app.models.event import EventLecture, EventRegistration
from app.models.knowledge import ChatMessage, ChatSession, KnowledgeChunk
from app.models.lead import Customer, CrmLead, Lead, LeadRecommendation, LeadSourceFile, ProfileRule
from app.models.operation import AuditLog, Notification, TodoItem
from app.models.permission import SysPermission, SysRole
from app.models.project import CourseProject
from app.models.report import ReportGenerationLog, ReportMetric, ReportSnapshot
from app.models.student import (
    StudentAcademicNode,
    StudentAdminService,
    StudentApplicationProgress,
    StudentFeedbackTicket,
    StudentLeaveApproval,
    StudentProfile,
    StudentPsychAlert,
    StudentPsychProfile,
)
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
    admin = db.query(SysUser).filter_by(username="admin").first()
    if not admin:
        admin = SysUser(
            username="admin",
            password_hash="demo",
            real_name="演示管理员",
            user_type="EMPLOYEE",
            role="admin",
        )
        db.add(admin)
        db.flush()

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

    _seed_final_business_models(db, admin)

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
        "customers": db.query(Customer).count(),
        "projects": db.query(CourseProject).count(),
        "events": db.query(EventLecture).count(),
        "leads": db.query(Lead).count() + db.query(CrmLead).count(),
        "employees": db.query(EmployeeProfile).count(),
        "students": db.query(StudentProfile).count(),
        "reports": db.query(ReportSnapshot).count(),
        "knowledge_sources": db.query(KnowledgeSource).count(),
        "organization_units": db.query(OrganizationUnit).count(),
    }


def _seed_final_business_models(db: Session, admin: SysUser) -> None:
    lead_items = _load_json("data/demo/leads.json")
    if db.query(Customer).count() == 0:
        for item in lead_items:
            customer = Customer(
                customer_name=item["customer_name"],
                contact_info=item.get("contact_info", ""),
                customer_type="潜在客户",
                source_channel="演示数据",
                owner_id=admin.id,
                status="待跟进",
            )
            db.add(customer)
            db.flush()
            lead = Lead(
                customer_id=customer.id,
                customer_name=item["customer_name"],
                contact_info=item.get("contact_info", ""),
                background_info=item.get("background_info", ""),
                stage="新线索",
                source_channel="演示数据",
                owner_id=admin.id,
            )
            db.add(lead)
            db.flush()
            db.add(
                LeadSourceFile(
                    lead_id=lead.id,
                    source_type="text",
                    raw_text=item.get("background_info", ""),
                    parsed_json=json.dumps({"来源": "客户资料文本"}, ensure_ascii=False),
                )
            )

    if db.query(ProfileRule).count() == 0:
        db.add_all(
            [
                ProfileRule(
                    rule_code="singapore_undergraduate",
                    rule_name="新加坡本科升学匹配",
                    target_project="新加坡国际本硕升学计划",
                    condition_json=json.dumps({"年龄": "16-24", "意向": "升学"}, ensure_ascii=False),
                    score_weight=80,
                ),
                ProfileRule(
                    rule_code="germany_dual_system",
                    rule_name="德国双元制匹配",
                    target_project="中德精英人才共建计划",
                    condition_json=json.dumps({"年龄": "18-35", "意向": "就业"}, ensure_ascii=False),
                    score_weight=75,
                ),
            ]
        )

    first_lead = db.query(Lead).order_by(Lead.id).first()
    first_project = db.query(CourseProject).order_by(CourseProject.id).first()
    if first_lead and first_project and db.query(LeadRecommendation).count() == 0:
        db.add(
            LeadRecommendation(
                lead_id=first_lead.id,
                project_id=first_project.id,
                project_name=first_project.project_name,
                recommendation_reason="客户年龄和升学意向匹配。",
                match_score=82,
                status="待确认",
            )
        )


    first_lecture = db.query(EventLecture).order_by(EventLecture.id).first()
    first_crm_lead = db.query(CrmLead).order_by(CrmLead.id).first()
    if first_lecture and first_crm_lead and db.query(EventRegistration).count() == 0:
        db.add(
            EventRegistration(
                event_id=first_lecture.id,
                lead_id=first_crm_lead.id,
                subject_type="lead",
                subject_id=first_crm_lead.id,
                subject_name=first_crm_lead.customer_name,
                contact_info=first_crm_lead.contact_info or "",
                source_channel="官网报名",
                status="已报名",
            )
        )

    if db.query(EmployeeProfile).count() == 0:
        db.add(
            EmployeeProfile(
                user_id=admin.id,
                employee_no="EMP-DEMO-001",
                department="升学规划部",
                position="演示顾问",
                phone="8000",
            )
        )
    if db.query(EmployeeDailyReport).count() == 0:
        db.add(
            EmployeeDailyReport(
                user_id=admin.id,
                report_date=date.today(),
                content="今日完成高潜客户回访、活动邀约和学生服务跟进。",
                structured_summary=json.dumps({"progress": "客户回访与活动邀约完成"}, ensure_ascii=False),
                risks=json.dumps(["1 个客户资料待补充"], ensure_ascii=False),
            )
        )
    if db.query(DailyReportSummary).count() == 0:
        db.add(
            DailyReportSummary(
                summary_type="daily",
                period_start=date.today(),
                period_end=date.today(),
                summary_json=json.dumps({"report_count": 1, "risk_count": 1}, ensure_ascii=False),
            )
        )

    first_org = db.query(OrganizationUnit).order_by(OrganizationUnit.id).first()
    if first_org and db.query(EmployeeDirectory).count() == 0:
        db.add(
            EmployeeDirectory(
                organization_unit_id=first_org.id,
                display_name="演示管理员",
                role_title="系统治理",
                contact_info="8000",
                responsibilities="权限、审计、知识来源和演示控制。",
            )
        )

    if db.query(StudentProfile).count() == 0:
        student = StudentProfile(
            student_name="阶段七演示学生",
            contact_info="student@example.com",
            enrollment_project="新加坡本科申请",
            advisor_user_id=admin.id,
            status="在读",
        )
        db.add(student)
        db.flush()
        service = StudentAdminService(
            student_id=student.id,
            service_type="请假",
            title="课程请假申请",
            content="因签证材料办理请假半天。",
            status="待审批",
            handler_id=admin.id,
        )
        db.add(service)
        db.flush()
        db.add_all(
            [
                StudentLeaveApproval(service_id=service.id, approver_id=admin.id, approval_status="待审批"),
                StudentFeedbackTicket(student_id=student.id, category="建议", content="希望补充签证材料清单。", summary="签证材料说明待补充"),
                StudentAcademicNode(student_id=student.id, node_name="语言考试报名确认", node_type="考务", status="未完成"),
                StudentApplicationProgress(student_id=student.id, stage="签证材料", status="进行中", description="待补充资金证明。"),
                StudentPsychProfile(student_id=student.id, risk_score=0.2, emotion_tags=json.dumps(["适应中"], ensure_ascii=False), summary="低风险，持续关注。"),
                StudentPsychAlert(student_id=student.id, risk_level="中", trigger_reason="学生表达睡眠压力。", status="待跟进", handler_id=admin.id),
            ]
        )

    first_source = db.query(KnowledgeSource).order_by(KnowledgeSource.id).first()
    if first_source and db.query(KnowledgeChunk).count() == 0:
        db.add(KnowledgeChunk(source_id=first_source.id, chunk_index=1, content="公司提供国际教育、智慧教育和学生服务。"))
    if db.query(ChatSession).count() == 0:
        session = ChatSession(user_id=admin.id, scene="customer_service", channel="web")
        db.add(session)
        db.flush()
        db.add_all(
            [
                ChatMessage(session_id=session.id, role="user", content="新加坡项目适合谁？"),
                ChatMessage(session_id=session.id, role="assistant", content="适合有升学需求的初高中和中职学生。"),
            ]
        )
    if db.query(AgentPromptConfig).count() == 0:
        db.add(
            AgentPromptConfig(
                scene="customer_service",
                prompt_name="官网客服 Agent",
                prompt_text="回答公司、业务、政策、项目、活动和 FAQ 问题，不暴露内部 CRM 数据。",
            )
        )
    if db.query(DifyFallbackLog).count() == 0:
        db.add(
            DifyFallbackLog(
                scene="customer_service",
                request_text="Dify 未配置时如何回答？",
                fallback_reason="未配置 Dify",
                fallback_answer="使用本地模板回答公开咨询问题。",
            )
        )

    if db.query(ReportSnapshot).count() == 0:
        report = ReportSnapshot(
            report_type="customer_operation",
            title="客户经营分析报告",
            period_start=date.today(),
            period_end=date.today(),
            content_json=json.dumps({"summary": {"lead_count": len(lead_items)}}, ensure_ascii=False),
            generated_by="system",
        )
        db.add(report)
        db.flush()
        db.add_all(
            [
                ReportMetric(report_id=report.id, metric_key="lead_count", metric_name="线索数", metric_value=len(lead_items)),
                ReportGenerationLog(report_id=report.id, report_type="customer_operation", generated_by="system", status="success"),
            ]
        )

    if first_lead and db.query(TodoItem).count() == 0:
        db.add(TodoItem(owner_id=admin.id, role_code="consultant", title="回访高潜客户", target_type="lead", target_id=first_lead.id))
