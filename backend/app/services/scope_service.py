"""数据范围服务：顾问/老师/学生权限范围校验"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.lead import CrmLead
from app.models.student import StudentProfile
from app.models.user import SysUser


class DataScopeError(Exception):
    """数据范围越权异常"""
    pass


def ensure_can_access_lead(db: Session, user: SysUser, lead_id: int) -> CrmLead:
    lead = db.query(CrmLead).filter_by(id=lead_id).first()
    if not lead:
        raise ValueError("客户不存在")
    if user.role in {"admin", "manager"}:
        return lead
    if user.role == "consultant" and lead.owner_id == user.id:
        return lead
    raise DataScopeError()


def ensure_can_access_student(db: Session, user: SysUser, student_id: int) -> StudentProfile:
    student = db.query(StudentProfile).filter_by(id=student_id).first()
    if not student:
        raise ValueError("学生不存在")
    if user.role in {"admin", "manager"}:
        return student
    if user.role == "teacher" and student.advisor_user_id == user.id:
        return student
    if user.role == "student" and student.contact_info in {user.username, f"{user.username}@example.com"}:
        return student
    raise DataScopeError()
