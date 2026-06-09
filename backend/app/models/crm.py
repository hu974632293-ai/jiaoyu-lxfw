from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CrmFollowUp(Base):
    __tablename__ = "crm_follow_up"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    lead_id: Mapped[int] = mapped_column(Integer, ForeignKey("crm_lead.id"), nullable=False)
    follow_type: Mapped[str] = mapped_column(String(32), default="电话")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    next_action: Mapped[str] = mapped_column(Text, default="")
    operator_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("sys_user.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CrmTask(Base):
    __tablename__ = "crm_task"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    lead_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("crm_lead.id"))
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    due_time: Mapped[datetime | None] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(32), default="待处理")
    owner_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("sys_user.id"))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CrmStageHistory(Base):
    __tablename__ = "crm_stage_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    lead_id: Mapped[int] = mapped_column(Integer, ForeignKey("crm_lead.id"), nullable=False)
    from_status: Mapped[str] = mapped_column(String(32), default="")
    to_status: Mapped[str] = mapped_column(String(32), nullable=False)
    operator_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("sys_user.id"))
    reason: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
