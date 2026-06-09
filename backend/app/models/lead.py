from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CrmLead(Base):
    __tablename__ = "crm_lead"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_name: Mapped[str] = mapped_column(String(64), nullable=False)
    contact_info: Mapped[str | None] = mapped_column(String(255))
    background_info: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="新增意向")
    owner_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("sys_user.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LeadProfileAssessment(Base):
    __tablename__ = "lead_profile_assessment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    lead_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("crm_lead.id"))
    source_type: Mapped[str] = mapped_column(String(32), default="text")
    raw_input: Mapped[str] = mapped_column(Text, nullable=False)
    extracted_profile: Mapped[str] = mapped_column(Text, nullable=False)
    singapore_score: Mapped[float] = mapped_column(Float, default=0)
    germany_score: Mapped[float] = mapped_column(Float, default=0)
    matched_project: Mapped[str] = mapped_column(String(128), default="")
    reasons: Mapped[str] = mapped_column(Text, default="[]")
    missing_fields: Mapped[str] = mapped_column(Text, default="[]")
    suggested_actions: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
