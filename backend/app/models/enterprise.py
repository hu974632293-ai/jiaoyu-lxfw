from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class EmployeeProfile(Base):
    __tablename__ = "employee_profile"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("sys_user.id"), nullable=False)
    employee_no: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    department: Mapped[str] = mapped_column(String(64), default="")
    position: Mapped[str] = mapped_column(String(64), default="")
    phone: Mapped[str] = mapped_column(String(64), default="")
    status: Mapped[str] = mapped_column(String(32), default="在职")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class OrganizationUnit(Base):
    __tablename__ = "organization_unit"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    parent_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("organization_unit.id"))
    unit_name: Mapped[str] = mapped_column(String(128), nullable=False)
    unit_type: Mapped[str] = mapped_column(String(32), default="部门")
    leader_user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("sys_user.id"))
    contact_info: Mapped[str] = mapped_column(String(255), default="")
    responsibilities: Mapped[str] = mapped_column(Text, default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class WorkDailyReport(Base):
    __tablename__ = "work_daily_report"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("sys_user.id"), nullable=False)
    report_date: Mapped[date] = mapped_column(Date, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    structured_summary: Mapped[str] = mapped_column(Text, default="{}")
    risks: Mapped[str] = mapped_column(Text, default="[]")
    status: Mapped[str] = mapped_column(String(32), default="已提交")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeDailyReport(Base):
    __tablename__ = "employee_daily_report"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("sys_user.id"), nullable=False)
    report_date: Mapped[date] = mapped_column(Date, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    structured_summary: Mapped[str] = mapped_column(Text, default="{}")
    risks: Mapped[str] = mapped_column(Text, default="[]")
    status: Mapped[str] = mapped_column(String(32), default="已提交")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DailyReportSummary(Base):
    __tablename__ = "daily_report_summary"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    summary_type: Mapped[str] = mapped_column(String(32), default="daily")
    period_start: Mapped[date | None] = mapped_column(Date)
    period_end: Mapped[date | None] = mapped_column(Date)
    summary_json: Mapped[str] = mapped_column(Text, default="{}")
    generated_by: Mapped[str] = mapped_column(String(64), default="system")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeDirectory(Base):
    __tablename__ = "employee_directory"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    employee_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("employee_profile.id"))
    organization_unit_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("organization_unit.id"))
    display_name: Mapped[str] = mapped_column(String(64), nullable=False)
    role_title: Mapped[str] = mapped_column(String(64), default="")
    contact_info: Mapped[str] = mapped_column(String(255), default="")
    responsibilities: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="启用")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
