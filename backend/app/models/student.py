from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class StudentProfile(Base):
    __tablename__ = "student_profile"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_name: Mapped[str] = mapped_column(String(64), nullable=False)
    contact_info: Mapped[str] = mapped_column(String(255), default="")
    enrollment_project: Mapped[str] = mapped_column(String(128), default="")
    advisor_user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("sys_user.id"))
    status: Mapped[str] = mapped_column(String(32), default="在读")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class StudentLeaveRequest(Base):
    __tablename__ = "student_leave_request"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("student_profile.id"), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="待审批")
    approver_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("sys_user.id"))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class StudentGrade(Base):
    __tablename__ = "student_grade"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("student_profile.id"), nullable=False)
    course_name: Mapped[str] = mapped_column(String(128), nullable=False)
    score: Mapped[float | None] = mapped_column(Float)
    exam_time: Mapped[datetime | None] = mapped_column(DateTime)
    remark: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class StudentAcademicEvent(Base):
    __tablename__ = "student_academic_event"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("student_profile.id"), nullable=False)
    event_name: Mapped[str] = mapped_column(String(128), nullable=False)
    event_type: Mapped[str] = mapped_column(String(32), default="考务")
    due_time: Mapped[datetime | None] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(32), default="未完成")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class StudentApplicationProgress(Base):
    __tablename__ = "student_application_progress"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("student_profile.id"), nullable=False)
    stage: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="进行中")
    description: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class StudentFeedbackTicket(Base):
    __tablename__ = "student_feedback_ticket"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("student_profile.id"), nullable=False)
    category: Mapped[str] = mapped_column(String(64), default="建议")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="待处理")
    handler_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("sys_user.id"))
    resolution: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class StudentPsychProfile(Base):
    __tablename__ = "student_psych_profile"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("student_profile.id"), nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, default=0)
    emotion_tags: Mapped[str] = mapped_column(Text, default="[]")
    summary: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class StudentPsychAlert(Base):
    __tablename__ = "student_psych_alert"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("student_profile.id"), nullable=False)
    risk_level: Mapped[str] = mapped_column(String(32), nullable=False)
    trigger_reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="待跟进")
    handler_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("sys_user.id"))
    handled_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
