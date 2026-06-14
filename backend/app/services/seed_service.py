import json
from datetime import date, datetime, timedelta
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.assistant import (
    AgentActionLog,
    AgentIntentLog,
    AgentPromptConfig,
    AssistantConversation,
    AssistantIntentLog,
    ControlledQueryLog,
    DifyFallbackLog,
    KnowledgeSource,
    KnowledgeSyncJob,
    Nl2SqlQueryLog,
)
from app.models.enterprise import (
    DailyReportSummary,
    EmployeeDailyReport,
    EmployeeDirectory,
    EmployeeProfile,
    OrganizationUnit,
    WorkDailyReport,
)
from app.models.event import EventLecture, EventRegistration
from app.models.crm import CrmFollowUp, CrmStageHistory, CrmTask, LeadFollowUp, LeadStageHistory, LeadTask
from app.models.knowledge import ChatMessage, ChatSession, KnowledgeChatLog, KnowledgeChunk
from app.models.lead import (
    Customer,
    CrmLead,
    Lead,
    LeadProfileAssessment,
    LeadRecommendation,
    LeadSourceFile,
    ProfileRule,
    ProfileRuleHit,
)
from app.models.operation import AuditLog, EventCheckIn, Notification, TodoItem
from app.models.permission import SysPermission, SysRole
from app.models.project import CourseProject, ProjectMaterial, ProjectPathway, ProjectRule, ProjectTag
from app.models.report import RecommendationLog, ReportGenerationLog, ReportMetric, ReportSnapshot
from app.models.student import (
    PsychFollowUp,
    StudentAcademicEvent,
    StudentAcademicNode,
    StudentAdminService,
    StudentApplicationProgress,
    StudentFeedbackTicket,
    StudentGrade,
    StudentLeaveApproval,
    StudentLeaveRequest,
    StudentProfile,
    StudentPsychAlert,
    StudentPsychProfile,
)
from app.models.user import SysUser
from app.services.admin_service import ensure_default_admin_data

ROOT = Path(__file__).resolve().parents[3]


def _now() -> datetime:
    return datetime.now()


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


DEFAULT_KNOWLEDGE_SOURCES = [
    ("公司信息", "customer_service", "客服咨询", "运营支持部", "公司介绍、服务范围、服务承诺和常见咨询口径。", "启用"),
    ("公司业务", "customer_service", "客服咨询", "运营支持部", "升学规划、双元制项目、活动报名和客户服务流程。", "启用"),
    ("留学政策", "policy", "留学政策", "教研部", "新加坡、德国及亚洲本科申请政策资料。", "启用"),
    ("新人指南", "enterprise_guide", "企业新人指南", "人事部", "入职流程、组织架构、制度说明和内部协作规范。", "待同步"),
    ("海外生活", "student_life", "学生生活支持", "学生服务部", "海外医疗、住宿、交通和紧急求助说明。", "待同步"),
    ("画像研判规则", "customer_assessment", "客户研判", "升学规划部", "用户画像研判规则、项目匹配规则和推荐解释口径。", "待同步"),
    ("报告解释口径", "report_assistant", "报告解释", "经营管理部", "客户经营、日报、心理健康和投诉处理报告指标说明。", "待同步"),
]

DEFAULT_ORG_UNITS = [
    ("总经理办公室", "部门", "总部统筹 / 8000", 1),
    ("升学规划部", "部门", "升学咨询 / 8010", 2),
    ("双元制事业部", "部门", "德国项目 / 企业微信 / 8012", 3),
    ("学生服务部", "部门", "服务老师 / 企业微信 / 8020", 4),
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

    _reset_demo_business_data(db)
    _ensure_demo_projects(db)
    _ensure_demo_profile_rules(db)
    _seed_realistic_demo_data(db, admin)

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

    _ensure_demo_agent_data(db)

    # Task 3: ??????????????
    _hash_demo_passwords(db)

    # Task 3: ?????????
    _ensure_test_accounts(db)

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


def _reset_demo_business_data(db: Session) -> None:
    reset_models = [
        AssistantIntentLog,
        AssistantConversation,
        AgentIntentLog,
        AgentActionLog,
        AgentPromptConfig,
        ControlledQueryLog,
        Nl2SqlQueryLog,
        DifyFallbackLog,
        ChatMessage,
        ChatSession,
        KnowledgeChatLog,
        KnowledgeSyncJob,
        KnowledgeChunk,
        KnowledgeSource,
        AuditLog,
        EventCheckIn,
        EventRegistration,
        CrmFollowUp,
        CrmTask,
        CrmStageHistory,
        LeadFollowUp,
        LeadTask,
        LeadStageHistory,
        ProfileRuleHit,
        LeadProfileAssessment,
        LeadRecommendation,
        RecommendationLog,
        LeadSourceFile,
        ProfileRule,
        Lead,
        Customer,
        StudentLeaveApproval,
        PsychFollowUp,
        StudentPsychAlert,
        StudentPsychProfile,
        StudentFeedbackTicket,
        StudentApplicationProgress,
        StudentAcademicNode,
        StudentAcademicEvent,
        StudentGrade,
        StudentAdminService,
        StudentLeaveRequest,
        StudentProfile,
        ReportMetric,
        ReportGenerationLog,
        ReportSnapshot,
        DailyReportSummary,
        EmployeeDailyReport,
        WorkDailyReport,
        EmployeeDirectory,
        EmployeeProfile,
        ProjectMaterial,
        ProjectRule,
        ProjectTag,
        ProjectPathway,
        CourseProject,
        EventLecture,
        CrmLead,
        TodoItem,
        Notification,
    ]
    for model in reset_models:
        db.query(model).delete(synchronize_session=False)
    reset_model_set = set(reset_models)
    for instance in list(db.identity_map.values()):
        if type(instance) in reset_model_set:
            db.expunge(instance)


def _ensure_demo_projects(db: Session) -> list[CourseProject]:
    project_items = [
        (
            "新加坡本科升学规划",
            "新加坡",
            "升学规划",
            "高二、高三及中职学生",
            "面向希望进入新加坡本科或桥梁课程的学生，覆盖语言、材料、面试和院校选择。",
            ["路径清晰", "学制短", "就业衔接强", "适合预算中等家庭"],
            "28-45万",
            "12-30个月",
            "高中或同等学历，英语基础达标，需完成材料评估。",
            ["新加坡", "本科", "升学", "英语强化"],
        ),
        (
            "新加坡 O-Level 低龄衔接",
            "新加坡",
            "低龄留学",
            "初二至高一学生",
            "为低龄学生提供 O-Level 备考、住宿监护、升学规划和生活适应支持。",
            ["低龄路径", "监护支持", "阶段测评", "家校沟通"],
            "22-36万",
            "18-36个月",
            "初中或高一在读，需通过英语与数学基础评估。",
            ["新加坡", "O-Level", "低龄", "家校沟通"],
        ),
        (
            "德国双元制机电人才计划",
            "德国",
            "职业教育",
            "高中、中职及大专学生",
            "结合德语培训、企业面试和德国双元制岗位匹配，面向就业导向学生。",
            ["带薪培训", "岗位匹配", "就业导向", "可继续升学"],
            "16-28万",
            "24-42个月",
            "18-30 岁，具备高中或同等学历，愿意学习德语。",
            ["德国", "双元制", "机电", "就业"],
        ),
        (
            "德国护理双元制项目",
            "德国",
            "职业教育",
            "高中毕业生及护理相关学生",
            "面向护理方向学生，提供德语、专业预备、企业面试和海外服务支持。",
            ["岗位需求稳定", "职业路径明确", "服务闭环", "家长可跟踪"],
            "15-25万",
            "24-42个月",
            "高中及以上学历，身心状态适合护理学习和实践。",
            ["德国", "护理", "双元制", "德语"],
        ),
        (
            "亚洲本科与奖学金申请",
            "新加坡/香港/马来西亚",
            "升学规划",
            "国际课程和普高学生",
            "覆盖亚洲多地区本科申请、奖学金策略、背景提升和面试训练。",
            ["多地区比较", "奖学金策略", "背景提升", "面试训练"],
            "30-55万",
            "9-24个月",
            "高中阶段成绩稳定，需补充语言或活动背景。",
            ["亚洲", "本科", "奖学金", "面试"],
        ),
        (
            "国际课程转轨与学术衔接",
            "中国/海外",
            "课程衔接",
            "普高转国际课程学生",
            "帮助体制内学生完成英语、数学、学习方法和课程路径转轨。",
            ["转轨评估", "学术衔接", "阶段反馈", "家长沟通"],
            "12-26万",
            "6-18个月",
            "初三至高二学生，需完成学术水平和适应力评估。",
            ["转轨", "国际课程", "学术衔接", "评估"],
        ),
    ]
    projects: list[CourseProject] = []
    for index, (
        name,
        country,
        category,
        audience,
        description,
        selling_points,
        cost_range,
        duration,
        requirements,
        tags,
    ) in enumerate(project_items, start=1):
        project = CourseProject(
            project_name=name,
            country=country,
            category=category,
            target_audience=audience,
            description=description,
            selling_points=json.dumps(selling_points, ensure_ascii=False),
            cost_range=cost_range,
            duration=duration,
            admission_requirements=requirements,
            tags=json.dumps(tags, ensure_ascii=False),
            recommendation_rule=f"优先匹配标签：{','.join(tags[:3])}",
            knowledge_source="真实业务演示",
            status="招生中",
        )
        db.add(project)
        db.flush()
        db.add_all(
            [
                ProjectPathway(
                    project_id=project.id,
                    pathway_name=f"{name}标准路径",
                    pathway_type="标准路径",
                    duration=duration,
                    description="评估、规划、材料、申请和后续服务按阶段推进。",
                ),
                ProjectTag(project_id=project.id, tag_name=tags[0], tag_type="国家/地区"),
                ProjectTag(project_id=project.id, tag_name=tags[1], tag_type="项目方向"),
                ProjectRule(
                    project_id=project.id,
                    rule_name=f"{name}画像匹配规则",
                    condition_json=json.dumps({"tags": tags, "priority": index}, ensure_ascii=False),
                    priority=index,
                    score_weight=80 - index,
                    status="启用",
                ),
                ProjectMaterial(
                    project_id=project.id,
                    material_name=f"{name}项目说明",
                    material_type="公开资料",
                    content=description,
                    status="启用",
                ),
            ]
        )
        projects.append(project)
    return projects


def _ensure_demo_profile_rules(db: Session) -> None:
    db.add_all(
        [
            ProfileRule(
                rule_code="singapore_undergraduate",
                rule_name="新加坡本科升学匹配",
                target_project="新加坡本科升学规划",
                condition_json=json.dumps({"年龄": "16-24", "意向": "升学"}, ensure_ascii=False),
                score_weight=85,
            ),
            ProfileRule(
                rule_code="germany_dual_system",
                rule_name="德国双元制匹配",
                target_project="德国双元制机电人才计划",
                condition_json=json.dumps({"年龄": "18-30", "意向": "就业"}, ensure_ascii=False),
                score_weight=82,
            ),
            ProfileRule(
                rule_code="low_age_transition",
                rule_name="低龄与转轨匹配",
                target_project="新加坡 O-Level 低龄衔接",
                condition_json=json.dumps({"阶段": "初中/高一", "需求": "转轨"}, ensure_ascii=False),
                score_weight=76,
            ),
        ]
    )


def _ensure_demo_agent_data(db: Session) -> None:
    db.add_all(
        [
            AgentPromptConfig(
                scene="customer_service",
                prompt_name="官网客服 Agent",
                prompt_text="回答公司、业务、政策、项目、活动和 FAQ 问题，不暴露内部 CRM 数据。",
                version="v1",
                status="启用",
            ),
            AgentPromptConfig(
                scene="student_life",
                prompt_name="学生生活支持 Agent",
                prompt_text="提供生活支持、申请进度和情绪陪伴建议，心理风险只做辅助识别，不替代专业心理诊断。",
                version="v1",
                status="启用",
            ),
            DifyFallbackLog(
                scene="customer_service",
                request_text="Dify 未配置时如何回答公开咨询？",
                fallback_reason="未配置 Dify",
                fallback_answer="使用本地业务模板回答公开咨询问题，不阻断报名和 CRM 主流程。",
                status="fallback",
            ),
            DifyFallbackLog(
                scene="student_life",
                request_text="学生询问海外生活支持。",
                fallback_reason="未配置 Dify",
                fallback_answer="使用学生生活支持模板给出安全边界内的建议。",
                status="fallback",
            ),
        ]
    )


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


def _seed_realistic_demo_data(db: Session, admin: SysUser) -> None:
    consultants = _ensure_demo_staff(db, admin)
    org_units = _ensure_demo_org_units(db)
    events = _ensure_demo_events(db)
    crm_leads, leads = _ensure_demo_customers_and_leads(db, consultants)
    _ensure_demo_crm_activity(db, crm_leads, leads, consultants)
    students = _ensure_demo_students(db, consultants)
    _ensure_demo_student_records(db, students, consultants)
    _ensure_demo_event_registrations(db, events, crm_leads, admin)
    _ensure_demo_daily_reports(db, consultants)
    _ensure_demo_employee_directory(db, consultants, org_units)
    _ensure_demo_reports(db)
    _ensure_demo_operation_items(db, admin, crm_leads, students)


def _ensure_demo_staff(db: Session, admin: SysUser) -> list[SysUser]:
    staff_items = [
        ("demo_consultant_01", "林晓顾问", "consultant", "升学规划部", "资深升学顾问", "EMP-DEMO-001"),
        ("demo_consultant_02", "周明顾问", "consultant", "升学规划部", "项目规划顾问", "EMP-DEMO-002"),
        ("demo_consultant_03", "陈雨顾问", "consultant", "双元制事业部", "德国项目顾问", "EMP-DEMO-003"),
        ("demo_teacher_01", "赵老师", "teacher", "学生服务部", "学生服务老师", "EMP-DEMO-004"),
        ("demo_teacher_02", "王老师", "teacher", "学生服务部", "心理支持老师", "EMP-DEMO-005"),
        ("demo_staff_01", "何运营", "staff", "运营支持部", "活动运营", "EMP-DEMO-006"),
        ("demo_manager_01", "沈经理", "manager", "经营管理部", "运营经理", "EMP-DEMO-007"),
        ("demo_admin_01", "许治理", "admin", "系统治理部", "系统管理员", "EMP-DEMO-008"),
    ]
    users: list[SysUser] = []
    for username, real_name, role, department, position, employee_no in staff_items:
        user = db.query(SysUser).filter_by(username=username).first()
        if not user:
            user = SysUser(
                username=username,
                password_hash="demo",
                real_name=real_name,
                user_type="EMPLOYEE",
                role=role,
            )
            db.add(user)
            db.flush()
        else:
            user.real_name = real_name
            user.role = role
            user.user_type = "EMPLOYEE"

        profile = db.query(EmployeeProfile).filter_by(employee_no=employee_no).first()
        if not profile:
            db.add(
                EmployeeProfile(
                    user_id=user.id,
                    employee_no=employee_no,
                    department=department,
                    position=position,
                    phone=f"18{employee_no[-3:]}0000{employee_no[-1]}",
                )
            )
        else:
            profile.user_id = user.id
            profile.department = department
            profile.position = position
            profile.status = "在职"
        users.append(user)

    admin_profile = db.query(EmployeeProfile).filter_by(employee_no="EMP-DEMO-000").first()
    if not admin_profile:
        db.add(
            EmployeeProfile(
                user_id=admin.id,
                employee_no="EMP-DEMO-000",
                department="系统治理部",
                position="演示管理员",
                phone="8000",
            )
        )
    return users


def _ensure_demo_org_units(db: Session) -> list[OrganizationUnit]:
    unit_items = [
        ("总经理办公室", "总部统筹、经营复盘、跨部门协调", 1),
        ("升学规划部", "潜在客户评估、项目推荐、签约转化", 2),
        ("双元制事业部", "德国双元制项目咨询、企业岗位匹配", 3),
        ("学生服务部", "请假审批、反馈处理、申请进度和心理辅助跟进", 4),
        ("运营支持部", "活动运营、客服 Agent 知识维护、报名转化", 5),
        ("系统治理部", "用户权限、审计、通知、知识来源和系统状态", 6),
    ]
    units: list[OrganizationUnit] = []
    for unit_name, responsibilities, sort_order in unit_items:
        unit = db.query(OrganizationUnit).filter_by(unit_name=unit_name).first()
        if not unit:
            unit = OrganizationUnit(
                unit_name=unit_name,
                unit_type="部门",
                contact_info=f"企业微信 / 80{sort_order:02d}",
                responsibilities=responsibilities,
                sort_order=sort_order,
            )
            db.add(unit)
            db.flush()
        else:
            unit.responsibilities = responsibilities
            unit.sort_order = sort_order
        units.append(unit)
    return units


def _ensure_demo_events(db: Session) -> list[EventLecture]:
    base_time = _now().replace(hour=19, minute=30, second=0, microsecond=0)
    event_items = [
        ("新加坡本科申请规划公开课", "线上", 3, "初三至高三家庭", "林晓顾问", "招生中"),
        ("德国双元制职业路径说明会", "线下", 6, "中职、高中毕业生及家长", "陈雨顾问", "招生中"),
        ("亚洲留学预算与奖学金讲座", "线上", 10, "关注预算控制的家庭", "周明顾问", "招生中"),
        ("国际课程转轨评估沙龙", "线下", 14, "国际学校和普高转轨学生", "赵老师", "招生中"),
        ("学生海外生活适应家长会", "线上", 20, "已签约学生家庭", "王老师", "报名中"),
        ("春季申请材料冲刺营", "线下", 27, "申请季学生", "何运营", "报名中"),
    ]
    events: list[EventLecture] = []
    for index, (name, event_type, offset_days, audience, speaker, status) in enumerate(event_items, start=1):
        event = db.query(EventLecture).filter_by(event_name=name).first()
        if not event:
            event = EventLecture(
                event_name=name,
                event_type=event_type,
                start_time=base_time + timedelta(days=offset_days),
                location="腾讯会议" if event_type == "线上" else "上海徐汇学习中心",
                max_participants=80 + index * 10,
                current_participants=0,
                target_audience=audience,
                speaker=speaker,
                status=status,
                description=f"{name}，覆盖政策解读、案例拆解和报名答疑。",
            )
            db.add(event)
            db.flush()
        else:
            event.start_time = base_time + timedelta(days=offset_days)
            event.target_audience = audience
            event.speaker = speaker
            event.status = status
        events.append(event)
    return events


def _ensure_demo_customers_and_leads(db: Session, consultants: list[SysUser]) -> tuple[list[CrmLead], list[Lead]]:
    lead_items = [
        ("真实演示客户-陈同学家庭", "上海", "新加坡本科", "28-35万", "新线索", "官网咨询", "高三在读，雅思 6.0，目标商科，需要确认申请时间线。"),
        ("真实演示客户-李同学家庭", "苏州", "德国双元制", "18-25万", "已联系", "活动报名", "中职机电方向，家长关注企业岗位和德语学习。"),
        ("真实演示客户-王同学家庭", "杭州", "新加坡 O-Level", "20-30万", "已评估", "客服 Agent", "初三学生，数学较好，英语基础一般，需要桥梁课程建议。"),
        ("真实演示客户-赵同学家庭", "南京", "亚洲本科申请", "35-45万", "方案沟通", "转介绍", "高二国际课程，目标新加坡和香港，关注奖学金。"),
        ("真实演示客户-周同学家庭", "宁波", "德国护理双元制", "15-22万", "待回访", "官网咨询", "高中毕业，想走就业导向，需评估德语学习周期。"),
        ("真实演示客户-吴同学家庭", "无锡", "新加坡硕士预备", "30-40万", "已联系", "电话咨询", "大三商科，绩点 3.1，想了解文书和实习补强。"),
        ("真实演示客户-徐同学家庭", "成都", "国际课程转轨", "25-35万", "新线索", "小红书私信", "高一普高，考虑转国际体系，家长担心适应问题。"),
        ("真实演示客户-孙同学家庭", "武汉", "新加坡理工路径", "20-28万", "已评估", "活动报名", "高三理科，英语 105，想比较理工学院和本科预科。"),
        ("真实演示客户-胡同学家庭", "长沙", "德国酒店管理", "16-24万", "方案沟通", "官网咨询", "中职旅游方向，期待毕业后留德就业。"),
        ("真实演示客户-朱同学家庭", "青岛", "新加坡艺术方向", "35-50万", "已联系", "客服 Agent", "高二美术方向，需要作品集和语言规划。"),
        ("真实演示客户-高同学家庭", "郑州", "亚洲低龄留学", "40-55万", "待回访", "转介绍", "初二学生，家庭希望先了解监护和住宿安全。"),
        ("真实演示客户-林同学家庭", "厦门", "德国机电双元制", "18-26万", "已评估", "电话咨询", "中专毕业，有汽修实习经历，德语零基础。"),
        ("真实演示客户-梁同学家庭", "广州", "新加坡本科", "30-45万", "方案沟通", "官网咨询", "高三，A-Level 预估 AAB，目标计算机方向。"),
        ("真实演示客户-何同学家庭", "佛山", "国际课程转轨", "25-32万", "新线索", "活动报名", "高一，想从体制内转轨，需评估英语和数学衔接。"),
        ("真实演示客户-马同学家庭", "天津", "德国护理双元制", "15-22万", "已联系", "客服 Agent", "高中毕业，家长关注薪资和签证风险。"),
        ("真实演示客户-罗同学家庭", "重庆", "新加坡本科", "28-38万", "已评估", "官网咨询", "高二，目标传媒，缺少活动背景。"),
        ("真实演示客户-许同学家庭", "西安", "亚洲硕士预备", "32-45万", "待回访", "转介绍", "大四，计划跨专业申请教育方向。"),
        ("真实演示客户-宋同学家庭", "合肥", "德国双元制", "16-24万", "方案沟通", "活动报名", "普高毕业，动手能力强，关注汽车制造岗位。"),
        ("真实演示客户-唐同学家庭", "昆明", "新加坡 O-Level", "22-32万", "新线索", "官网咨询", "初二，家长希望提前锁定低龄规划路线。"),
        ("真实演示客户-彭同学家庭", "南昌", "国际课程转轨", "24-34万", "已联系", "电话咨询", "高一，托福 70，想冲亚洲排名靠前院校。"),
        ("真实演示客户-魏同学家庭", "沈阳", "德国酒店管理", "15-23万", "已评估", "客服 Agent", "中职酒店方向，有实习经历，想了解企业面试。"),
        ("真实演示客户-蒋同学家庭", "福州", "新加坡理工路径", "20-30万", "方案沟通", "官网咨询", "高三，理科稳定，预算中等，希望就业导向。"),
        ("真实演示客户-袁同学家庭", "济南", "亚洲本科申请", "35-48万", "待回访", "转介绍", "国际课程，目标金融，需要补竞赛和面试训练。"),
        ("真实演示客户-邓同学家庭", "哈尔滨", "德国机电双元制", "16-25万", "已联系", "活动报名", "中专机械方向，家长关注德语和住宿管理。"),
    ]
    crm_leads: list[CrmLead] = []
    leads: list[Lead] = []
    for index, (name, city, intent, budget, status, source, background) in enumerate(lead_items):
        owner = consultants[index % len(consultants)]
        contact = f"{city} / 1{index + 31:02d}0000{index + 1000}"
        customer = (
            db.query(Customer)
            .filter(Customer.customer_name == name, Customer.source_channel == "真实业务演示")
            .first()
        )
        if not customer:
            customer = Customer(
                customer_name=name,
                contact_info=contact,
                customer_type="潜在客户",
                source_channel="真实业务演示",
                owner_id=owner.id,
                status=status,
            )
            db.add(customer)
            db.flush()
        else:
            customer.contact_info = contact
            customer.owner_id = owner.id
            customer.status = status

        background_info = f"{background} 城市：{city}；预算：{budget}；意向：{intent}。"
        lead = (
            db.query(Lead)
            .filter(Lead.customer_name == name, Lead.source_channel == "真实业务演示")
            .first()
        )
        if not lead:
            lead = Lead(
                customer_id=customer.id,
                customer_name=name,
                contact_info=contact,
                background_info=background_info,
                stage=status,
                source_channel="真实业务演示",
                owner_id=owner.id,
            )
            db.add(lead)
            db.flush()
        else:
            lead.customer_id = customer.id
            lead.background_info = background_info
            lead.stage = status
            lead.owner_id = owner.id

        if not db.query(LeadSourceFile).filter_by(lead_id=lead.id, source_type="text").first():
            db.add(
                LeadSourceFile(
                    lead_id=lead.id,
                    source_type="text",
                    raw_text=background_info,
                    parsed_json=json.dumps(
                        {"城市": city, "意向": intent, "预算": budget, "来源": source},
                        ensure_ascii=False,
                    ),
                )
            )

        crm_lead = (
            db.query(CrmLead)
            .filter(CrmLead.customer_name == name, CrmLead.source_channel == "真实业务演示")
            .first()
        )
        if not crm_lead:
            crm_lead = CrmLead(
                customer_name=name,
                contact_info=contact,
                background_info=background_info,
                status=status,
                source_channel="真实业务演示",
                owner_id=owner.id,
            )
            db.add(crm_lead)
            db.flush()
        else:
            crm_lead.contact_info = contact
            crm_lead.background_info = background_info
            crm_lead.status = status
            crm_lead.owner_id = owner.id

        crm_leads.append(crm_lead)
        leads.append(lead)
    return crm_leads, leads


def _ensure_demo_crm_activity(
    db: Session,
    crm_leads: list[CrmLead],
    leads: list[Lead],
    consultants: list[SysUser],
) -> None:
    stages = ["新线索", "已联系", "已评估", "方案沟通", "待回访", "签约推进"]
    for index, crm_lead in enumerate(crm_leads):
        owner = consultants[index % len(consultants)]
        if not db.query(CrmFollowUp).filter_by(lead_id=crm_lead.id).first():
            db.add(
                CrmFollowUp(
                    lead_id=crm_lead.id,
                    follow_type="电话" if index % 2 == 0 else "企业微信",
                    content=f"确认{crm_lead.customer_name}的家庭预算、目标国家和最近一次考试情况。",
                    next_action="发送项目对比表并预约 30 分钟方案沟通。",
                    operator_id=owner.id,
                    created_at=_now() - timedelta(days=index % 7),
                )
            )
        if index < 16 and not db.query(CrmTask).filter_by(lead_id=crm_lead.id).first():
            db.add(
                CrmTask(
                    lead_id=crm_lead.id,
                    title=f"跟进{crm_lead.customer_name}项目方案确认",
                    due_time=_now() + timedelta(days=(index % 5) + 1),
                    status="已完成" if index % 5 == 0 else "待处理",
                    owner_id=owner.id,
                    completed_at=_now() if index % 5 == 0 else None,
                )
            )
        if not db.query(CrmStageHistory).filter_by(lead_id=crm_lead.id).first():
            db.add(
                CrmStageHistory(
                    lead_id=crm_lead.id,
                    from_status="新线索",
                    to_status=stages[index % len(stages)],
                    operator_id=owner.id,
                    reason="真实业务演示数据初始化阶段流转记录",
                )
            )

    first_project = db.query(CourseProject).order_by(CourseProject.id).first()
    for index, lead in enumerate(leads):
        owner = consultants[index % len(consultants)]
        if not db.query(LeadFollowUp).filter_by(lead_id=lead.id).first():
            db.add(
                LeadFollowUp(
                    lead_id=lead.id,
                    follow_type="方案沟通",
                    content="根据客户资料补充画像，确认项目匹配点和风险点。",
                    next_action="生成推荐项目并同步给顾问。",
                    operator_id=owner.id,
                )
            )
        if index < 16 and not db.query(LeadTask).filter_by(lead_id=lead.id).first():
            db.add(
                LeadTask(
                    lead_id=lead.id,
                    title=f"补齐{lead.customer_name}画像材料",
                    due_time=_now() + timedelta(days=(index % 6) + 1),
                    status="待处理",
                    owner_id=owner.id,
                )
            )
        if not db.query(LeadStageHistory).filter_by(lead_id=lead.id).first():
            db.add(
                LeadStageHistory(
                    lead_id=lead.id,
                    from_stage="新线索",
                    to_stage=lead.stage,
                    operator_id=owner.id,
                    reason="演示客户进入当前跟进阶段",
                )
            )
        if first_project and not db.query(LeadRecommendation).filter_by(lead_id=lead.id).first():
            db.add(
                LeadRecommendation(
                    lead_id=lead.id,
                    project_id=first_project.id,
                    project_name=first_project.project_name,
                    recommendation_reason="画像中的预算、目标地区和学习阶段与项目规则匹配。",
                    match_score=70 + (index % 25),
                    status="待确认" if index % 3 else "已发送",
                )
            )
        if not db.query(RecommendationLog).filter_by(subject_type="lead", subject_id=lead.id).first():
            db.add(
                RecommendationLog(
                    subject_type="lead",
                    subject_id=lead.id,
                    recommendation_type="project",
                    recommendation_text=f"{lead.customer_name}建议优先比较新加坡路径和德国双元制路径。",
                    source="rule",
                    status="已生成",
                )
            )


def _ensure_demo_students(db: Session, consultants: list[SysUser]) -> list[StudentProfile]:
    student_items = [
        ("真实演示学生-陈安琪", "新加坡本科申请", "在读", 0.18),
        ("真实演示学生-李泽宇", "德国双元制机电", "申请中", 0.42),
        ("真实演示学生-王若琳", "新加坡 O-Level", "在读", 0.28),
        ("真实演示学生-赵嘉言", "亚洲本科申请", "材料准备", 0.35),
        ("真实演示学生-周子航", "德国护理双元制", "在读", 0.62),
        ("真实演示学生-吴欣然", "新加坡硕士预备", "申请中", 0.24),
        ("真实演示学生-徐嘉禾", "国际课程转轨", "在读", 0.55),
        ("真实演示学生-孙一鸣", "新加坡理工路径", "录取待确认", 0.22),
        ("真实演示学生-胡可欣", "德国酒店管理", "在读", 0.48),
        ("真实演示学生-梁启明", "新加坡本科申请", "申请中", 0.31),
    ]
    students: list[StudentProfile] = []
    for index, (name, project, status, risk_score) in enumerate(student_items, start=1):
        advisor = consultants[index % len(consultants)]
        contact = f"student{index:02d}@student.demo"
        student = db.query(StudentProfile).filter_by(contact_info=contact).first()
        if not student:
            student = StudentProfile(
                student_name=name,
                contact_info=contact,
                enrollment_project=project,
                advisor_user_id=advisor.id,
                status=status,
            )
            db.add(student)
            db.flush()
        else:
            student.student_name = name
            student.enrollment_project = project
            student.advisor_user_id = advisor.id
            student.status = status

        psych_profile = db.query(StudentPsychProfile).filter_by(student_id=student.id).first()
        if not psych_profile:
            db.add(
                StudentPsychProfile(
                    student_id=student.id,
                    risk_score=risk_score,
                    emotion_tags=json.dumps(["适应中", "学业压力"] if risk_score >= 0.4 else ["稳定"], ensure_ascii=False),
                    summary="心理辅助识别结果仅用于服务跟进，不替代专业心理诊断。",
                )
            )
        else:
            psych_profile.risk_score = risk_score
            psych_profile.summary = "心理辅助识别结果仅用于服务跟进，不替代专业心理诊断。"
        students.append(student)
    return students


def _ensure_demo_student_records(db: Session, students: list[StudentProfile], consultants: list[SysUser]) -> None:
    for index, student in enumerate(students):
        advisor = consultants[index % len(consultants)]
        leave = (
            db.query(StudentLeaveRequest)
            .filter(StudentLeaveRequest.student_id == student.id, StudentLeaveRequest.reason.like("真实业务演示%"))
            .first()
        )
        if not leave:
            leave = StudentLeaveRequest(
                student_id=student.id,
                reason=f"真实业务演示：{student.student_name}因签证材料递交和线上面试申请请假。",
                start_time=_now() + timedelta(days=(index % 4) + 1, hours=9),
                end_time=_now() + timedelta(days=(index % 4) + 1, hours=12),
                status=["待审批", "已同意", "待补充"][index % 3],
                approver_id=advisor.id,
                approved_at=_now() if index % 3 == 1 else None,
            )
            db.add(leave)
            db.flush()
        if not db.query(StudentLeaveApproval).filter_by(leave_request_id=leave.id).first():
            db.add(
                StudentLeaveApproval(
                    leave_request_id=leave.id,
                    approver_id=advisor.id,
                    approval_status=leave.status,
                    approval_comment="根据申请材料和课程安排处理。",
                    approved_at=leave.approved_at,
                )
            )

        if not db.query(StudentAdminService).filter_by(student_id=student.id, title="签证材料递交协助").first():
            db.add(
                StudentAdminService(
                    student_id=student.id,
                    service_type="申请支持",
                    title="签证材料递交协助",
                    content="确认资金证明、在读证明和预约时间。",
                    status="处理中" if index % 2 else "待处理",
                    handler_id=advisor.id,
                )
            )

        if not db.query(StudentFeedbackTicket).filter_by(student_id=student.id).first():
            db.add(
                StudentFeedbackTicket(
                    student_id=student.id,
                    category=["课程", "住宿", "申请", "生活支持"][index % 4],
                    content=f"{student.student_name}反馈希望更清楚了解下一阶段材料和课程安排。",
                    summary="学生希望获得更明确的阶段计划。",
                    status=["待处理", "处理中", "已解决"][index % 3],
                    handler_id=advisor.id,
                    resolution="已安排服务老师一对一说明。" if index % 3 == 2 else "",
                )
            )

        grade_names = ["英语强化", "数学衔接", "专业导论"]
        for grade_index, course_name in enumerate(grade_names):
            if not db.query(StudentGrade).filter_by(student_id=student.id, course_name=course_name).first():
                db.add(
                    StudentGrade(
                        student_id=student.id,
                        course_name=course_name,
                        score=72 + ((index + grade_index) * 5) % 24,
                        exam_time=_now() - timedelta(days=grade_index * 12 + index),
                        remark="学习状态稳定，建议继续补强口语表达。" if course_name == "英语强化" else "按计划推进。",
                    )
                )

        event_names = ["语言考试报名", "材料截止提醒"]
        for event_index, event_name in enumerate(event_names):
            if not db.query(StudentAcademicEvent).filter_by(student_id=student.id, event_name=event_name).first():
                db.add(
                    StudentAcademicEvent(
                        student_id=student.id,
                        event_name=event_name,
                        event_type="考务" if event_index == 0 else "申请节点",
                        due_time=_now() + timedelta(days=7 + index + event_index * 10),
                        status=["未完成", "进行中", "已完成"][(index + event_index) % 3],
                    )
                )
            node_name = f"{event_name}节点"
            if not db.query(StudentAcademicNode).filter_by(student_id=student.id, node_name=node_name).first():
                db.add(
                    StudentAcademicNode(
                        student_id=student.id,
                        node_name=node_name,
                        node_type="考务" if event_index == 0 else "申请",
                        due_time=_now() + timedelta(days=5 + index + event_index * 8),
                        status=["未完成", "进行中", "已完成"][(index + event_index) % 3],
                    )
                )

        progress_items = [
            ("背景评估", "已完成", "已完成基础材料梳理和目标项目初筛。"),
            ("材料准备", "进行中", "正在补充成绩单、推荐信和资金证明。"),
            ("签证材料", "进行中", "待补充资金证明、在读证明和预约确认信息。"),
            ("申请递交", "待开始", "等待材料审核完成后统一递交。"),
        ]
        for stage, status, description in progress_items:
            progress = db.query(StudentApplicationProgress).filter_by(student_id=student.id, stage=stage).first()
            if not progress:
                db.add(
                    StudentApplicationProgress(
                        student_id=student.id,
                        stage=stage,
                        status=status,
                        description=description,
                    )
                )
            else:
                progress.status = status
                progress.description = description

        if index < 6 and not db.query(StudentPsychAlert).filter_by(student_id=student.id).first():
            alert = StudentPsychAlert(
                student_id=student.id,
                risk_level=["中", "中", "高", "中", "高", "中"][index],
                trigger_reason="学生近期表达睡眠压力、申请焦虑或跨文化适应担忧。",
                status="已跟进" if index % 2 else "待跟进",
                handler_id=advisor.id,
                handled_at=_now() if index % 2 else None,
            )
            db.add(alert)
            db.flush()
            db.add(
                PsychFollowUp(
                    alert_id=alert.id,
                    handler_id=advisor.id,
                    follow_up_content="已安排服务老师沟通学习节奏和生活支持资源。",
                    next_step="三天后复访，必要时建议家长陪同沟通。",
                    status="已记录",
                )
            )


def _ensure_demo_event_registrations(
    db: Session,
    events: list[EventLecture],
    crm_leads: list[CrmLead],
    admin: SysUser,
) -> None:
    if not events or not crm_leads:
        return
    for index, crm_lead in enumerate(crm_leads[:24]):
        event = events[index % len(events)]
        registration = (
            db.query(EventRegistration)
            .filter_by(event_id=event.id, subject_type="lead", subject_id=crm_lead.id, source_channel="官网活动报名")
            .first()
        )
        if not registration:
            registration = EventRegistration(
                event_id=event.id,
                lead_id=crm_lead.id,
                subject_type="lead",
                subject_id=crm_lead.id,
                subject_name=crm_lead.customer_name,
                contact_info=crm_lead.contact_info or "",
                source_channel="官网活动报名",
                status="已签到" if index % 4 == 0 else "已报名",
                checked_in_at=_now() - timedelta(days=1) if index % 4 == 0 else None,
            )
            db.add(registration)
            db.flush()
        if registration.status == "已签到" and not db.query(EventCheckIn).filter_by(registration_id=registration.id).first():
            db.add(EventCheckIn(event_id=event.id, registration_id=registration.id, operator_id=admin.id))

    for event in events:
        event.current_participants = db.query(EventRegistration).filter_by(event_id=event.id).count()


def _ensure_demo_daily_reports(db: Session, consultants: list[SysUser]) -> None:
    for index, user in enumerate(consultants):
        for day_offset in range(2):
            report_date = date.today() - timedelta(days=day_offset)
            exists = (
                db.query(EmployeeDailyReport)
                .filter_by(user_id=user.id, report_date=report_date)
                .first()
            )
            if exists:
                continue
            db.add(
                EmployeeDailyReport(
                    user_id=user.id,
                    report_date=report_date,
                    content=f"{user.real_name}完成客户跟进、学生服务处理和活动报名转化记录。",
                    structured_summary=json.dumps(
                        {
                            "follow_up_count": 3 + (index % 4),
                            "student_service_count": 1 + (index % 3),
                            "event_invite_count": 2 + day_offset,
                        },
                        ensure_ascii=False,
                    ),
                    risks=json.dumps(["高潜客户需经理协同", "学生材料需补充"][: 1 + (index % 2)], ensure_ascii=False),
                    status="已提交",
                )
            )

    summary_key = {"type": "realistic_demo", "report_count": len(consultants) * 2}
    if not db.query(DailyReportSummary).filter(DailyReportSummary.summary_json.like("%realistic_demo%")).first():
        db.add(
            DailyReportSummary(
                summary_type="daily",
                period_start=date.today() - timedelta(days=1),
                period_end=date.today(),
                summary_json=json.dumps(summary_key, ensure_ascii=False),
                generated_by="system",
            )
        )


def _ensure_demo_employee_directory(
    db: Session,
    consultants: list[SysUser],
    org_units: list[OrganizationUnit],
) -> None:
    if not org_units:
        return
    profiles = db.query(EmployeeProfile).filter(EmployeeProfile.employee_no.like("EMP-DEMO-%")).all()
    user_by_id = {user.id: user for user in consultants}
    for index, profile in enumerate(profiles):
        user = user_by_id.get(profile.user_id)
        display_name = user.real_name if user else profile.employee_no
        if db.query(EmployeeDirectory).filter_by(employee_id=profile.id).first():
            continue
        db.add(
            EmployeeDirectory(
                employee_id=profile.id,
                organization_unit_id=org_units[index % len(org_units)].id,
                display_name=display_name,
                role_title=profile.position,
                contact_info=profile.phone,
                responsibilities=f"{profile.department}：{profile.position}日常业务处理。",
                status="启用",
            )
        )


def _ensure_demo_reports(db: Session) -> None:
    report_items = [
        ("customer_operation", "客户经营分析周报", {"new_leads": 24, "high_potential": 9, "follow_up_pending": 16}),
        ("daily_summary", "员工日报汇总周报", {"report_count": 16, "risk_count": 6, "manager_attention": 3}),
        ("student_psych_weekly", "学生心理辅助预警周报", {"alert_count": 6, "high_risk": 2, "followed": 3}),
        ("feedback_weekly", "投诉反馈处理周报", {"ticket_count": 10, "resolved": 3, "processing": 4}),
    ]
    for report_type, title, metrics in report_items:
        report = (
            db.query(ReportSnapshot)
            .filter_by(report_type=report_type, title=title, generation_mode="realistic_demo")
            .first()
        )
        if not report:
            report = ReportSnapshot(
                report_type=report_type,
                title=title,
                period_start=date.today() - timedelta(days=7),
                period_end=date.today(),
                content_json=json.dumps({"summary": metrics, "source": "真实业务演示"}, ensure_ascii=False),
                generated_by="system",
                generation_mode="realistic_demo",
            )
            db.add(report)
            db.flush()
        else:
            report.content_json = json.dumps({"summary": metrics, "source": "真实业务演示"}, ensure_ascii=False)

        for metric_key, metric_value in metrics.items():
            metric = db.query(ReportMetric).filter_by(report_id=report.id, metric_key=metric_key).first()
            if not metric:
                db.add(
                    ReportMetric(
                        report_id=report.id,
                        metric_key=metric_key,
                        metric_name=metric_key,
                        metric_value=float(metric_value),
                        dimension="真实业务演示",
                    )
                )
            else:
                metric.metric_value = float(metric_value)

        if not db.query(ReportGenerationLog).filter_by(report_id=report.id, report_type=report_type).first():
            db.add(
                ReportGenerationLog(
                    report_id=report.id,
                    report_type=report_type,
                    generated_by="system",
                    status="success",
                    message="真实业务演示数据初始化生成",
                )
            )


def _ensure_demo_operation_items(
    db: Session,
    admin: SysUser,
    crm_leads: list[CrmLead],
    students: list[StudentProfile],
) -> None:
    todo_targets = [
        ("consultant", "今日回访高潜客户", "crm_lead", crm_leads[0].id if crm_leads else None),
        ("teacher", "处理学生请假与反馈", "student_profile", students[0].id if students else None),
        ("manager", "查看本周经营报告", "report_snapshot", None),
        ("admin", "复核新员工权限配置", "sys_user", admin.id),
    ]
    for role_code, title, target_type, target_id in todo_targets:
        if db.query(TodoItem).filter_by(role_code=role_code, title=title).first():
            continue
        db.add(
            TodoItem(
                owner_id=admin.id,
                role_code=role_code,
                title=title,
                content="真实业务演示待办，用于支撑角色工作台查看。",
                target_type=target_type,
                target_id=target_id,
                status="待处理",
                due_time=_now() + timedelta(days=1),
            )
        )

    if not db.query(AuditLog).filter(AuditLog.action == "初始化真实业务演示数据").first():
        db.add(
            AuditLog(
                actor_user_id=admin.id,
                action="初始化真实业务演示数据",
                resource_type="demo_seed",
                resource_id="realistic_demo",
                detail=json.dumps({"source": "api/demo/seed"}, ensure_ascii=False),
            )
        )


def _hash_demo_passwords(db):
    from app.core.security import hash_password
    users = db.query(SysUser).all()
    for user in users:
        if "$" not in user.password_hash and len(user.password_hash) < 40:
            user.password_hash = hash_password(user.password_hash)
    db.flush()


_TEST_ACCOUNTS = [
    ("admin", "admin123", "?????", "admin"),
    ("manager", "manager123", "?????", "manager"),
    ("consultant", "consultant123", "????", "consultant"),
    ("employee", "employee123", "????", "employee"),
    ("teacher", "teacher123", "????", "teacher"),
    ("student", "student123", "????", "student"),
    ("test", "test123", "???????", "admin"),
]


def _ensure_test_accounts(db):
    from app.core.security import hash_password
    for username, password, real_name, role in _TEST_ACCOUNTS:
        user = db.query(SysUser).filter_by(username=username).first()
        if not user:
            user = SysUser(
                username=username,
                password_hash=hash_password(password),
                real_name=real_name,
                user_type="EMPLOYEE",
                role=role,
            )
            db.add(user)
            db.flush()
        else:
            user.password_hash = hash_password(password)
            user.real_name = real_name
            user.role = role
    db.flush()
