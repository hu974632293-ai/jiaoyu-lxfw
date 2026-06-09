from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import ok
from app.models.assistant import AssistantConversation, KnowledgeSource, Nl2SqlQueryLog
from app.models.crm import CrmFollowUp, CrmTask
from app.models.enterprise import OrganizationUnit, WorkDailyReport
from app.models.operation import AuditLog, Notification, ReportJob
from app.models.permission import SysPermission, SysRole
from app.models.student import StudentFeedbackTicket, StudentLeaveRequest, StudentProfile, StudentPsychAlert

router = APIRouter(prefix="/api/phase2", tags=["phase2"])


@router.get("/overview")
def overview(db: Session = Depends(get_db)):
    return ok(
        {
            "modules": [
                {"key": "enterprise_assistant", "name": "企业助手", "status": "foundation_ready"},
                {"key": "student_assistant", "name": "学生助手", "status": "foundation_ready"},
                {"key": "crm", "name": "完整 CRM", "status": "foundation_ready"},
                {"key": "knowledge", "name": "Dify 知识库增强", "status": "foundation_ready"},
                {"key": "reports", "name": "报告中心扩展", "status": "foundation_ready"},
                {"key": "permissions", "name": "权限/角色", "status": "foundation_ready"},
            ],
            "counts": {
                "roles": db.query(SysRole).count(),
                "permissions": db.query(SysPermission).count(),
                "crm_follow_ups": db.query(CrmFollowUp).count(),
                "crm_tasks": db.query(CrmTask).count(),
                "daily_reports": db.query(WorkDailyReport).count(),
                "organization_units": db.query(OrganizationUnit).count(),
                "students": db.query(StudentProfile).count(),
                "leave_requests": db.query(StudentLeaveRequest).count(),
                "feedback_tickets": db.query(StudentFeedbackTicket).count(),
                "psych_alerts": db.query(StudentPsychAlert).count(),
                "assistant_conversations": db.query(AssistantConversation).count(),
                "nl2sql_logs": db.query(Nl2SqlQueryLog).count(),
                "knowledge_sources": db.query(KnowledgeSource).count(),
                "report_jobs": db.query(ReportJob).count(),
                "notifications": db.query(Notification).count(),
                "audit_logs": db.query(AuditLog).count(),
            },
        }
    )
