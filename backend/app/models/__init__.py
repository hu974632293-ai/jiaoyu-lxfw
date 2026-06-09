from app.models.assistant import (
    AssistantConversation,
    AssistantIntentLog,
    KnowledgeSource,
    KnowledgeSyncJob,
    Nl2SqlQueryLog,
)
from app.models.crm import CrmFollowUp, CrmStageHistory, CrmTask
from app.models.enterprise import EmployeeProfile, OrganizationUnit, WorkDailyReport
from app.models.user import SysUser
from app.models.lead import CrmLead, LeadProfileAssessment
from app.models.project import CourseProject
from app.models.event import EventLecture, EventRegistration
from app.models.knowledge import KnowledgeChatLog
from app.models.operation import AuditLog, EventCheckIn, Notification, ReportJob
from app.models.permission import SysPermission, SysRole, SysRolePermission, SysUserRole
from app.models.report import ReportSnapshot
from app.models.student import (
    StudentAcademicEvent,
    StudentApplicationProgress,
    StudentFeedbackTicket,
    StudentGrade,
    StudentLeaveRequest,
    StudentProfile,
    StudentPsychAlert,
    StudentPsychProfile,
)

__all__ = [
    "AssistantConversation",
    "AssistantIntentLog",
    "KnowledgeSource",
    "KnowledgeSyncJob",
    "Nl2SqlQueryLog",
    "CrmFollowUp",
    "CrmStageHistory",
    "CrmTask",
    "EmployeeProfile",
    "OrganizationUnit",
    "WorkDailyReport",
    "SysUser",
    "CrmLead",
    "LeadProfileAssessment",
    "CourseProject",
    "EventLecture",
    "EventRegistration",
    "KnowledgeChatLog",
    "AuditLog",
    "EventCheckIn",
    "Notification",
    "ReportJob",
    "SysPermission",
    "SysRole",
    "SysRolePermission",
    "SysUserRole",
    "ReportSnapshot",
    "StudentAcademicEvent",
    "StudentApplicationProgress",
    "StudentFeedbackTicket",
    "StudentGrade",
    "StudentLeaveRequest",
    "StudentProfile",
    "StudentPsychAlert",
    "StudentPsychProfile",
]
