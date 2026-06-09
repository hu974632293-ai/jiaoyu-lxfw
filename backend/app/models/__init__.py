from app.models.user import SysUser
from app.models.lead import CrmLead, LeadProfileAssessment
from app.models.project import CourseProject
from app.models.event import EventLecture, EventRegistration
from app.models.knowledge import KnowledgeChatLog
from app.models.report import ReportSnapshot

__all__ = [
    "SysUser",
    "CrmLead",
    "LeadProfileAssessment",
    "CourseProject",
    "EventLecture",
    "EventRegistration",
    "KnowledgeChatLog",
    "ReportSnapshot",
]
