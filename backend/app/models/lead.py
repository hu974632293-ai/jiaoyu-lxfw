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
    source_channel: Mapped[str] = mapped_column(String(64), default="")
    owner_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("sys_user.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Customer(Base):
    __tablename__ = "customer"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_name: Mapped[str] = mapped_column(String(64), nullable=False)
    contact_info: Mapped[str] = mapped_column(String(255), default="")
    customer_type: Mapped[str] = mapped_column(String(32), default="潜在客户")
    source_channel: Mapped[str] = mapped_column(String(64), default="")
    owner_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("sys_user.id"))
    student_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("student_profile.id"))
    status: Mapped[str] = mapped_column(String(32), default="待跟进")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Lead(Base):
    __tablename__ = "lead"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("customer.id"))
    customer_name: Mapped[str] = mapped_column(String(64), nullable=False)
    contact_info: Mapped[str] = mapped_column(String(255), default="")
    background_info: Mapped[str] = mapped_column(Text, default="")
    stage: Mapped[str] = mapped_column(String(32), default="新线索")
    source_channel: Mapped[str] = mapped_column(String(64), default="")
    owner_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("sys_user.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LeadSourceFile(Base):
    __tablename__ = "lead_source_file"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    lead_id: Mapped[int] = mapped_column(Integer, ForeignKey("lead.id"), nullable=False)
    source_type: Mapped[str] = mapped_column(String(32), default="text")
    file_name: Mapped[str] = mapped_column(String(255), default="")
    file_path: Mapped[str] = mapped_column(String(255), default="")
    raw_text: Mapped[str] = mapped_column(Text, default="")
    parsed_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


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


class ProfileRule(Base):
    __tablename__ = "profile_rule"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    rule_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    rule_name: Mapped[str] = mapped_column(String(128), nullable=False)
    target_project: Mapped[str] = mapped_column(String(128), default="")
    condition_json: Mapped[str] = mapped_column(Text, default="{}")
    score_weight: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(32), default="启用")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ProfileRuleHit(Base):
    __tablename__ = "profile_rule_hit"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    assessment_id: Mapped[int] = mapped_column(Integer, ForeignKey("lead_profile_assessment.id"), nullable=False)
    rule_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("profile_rule.id"))
    rule_code: Mapped[str] = mapped_column(String(64), default="")
    hit_detail: Mapped[str] = mapped_column(Text, default="{}")
    score: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LeadRecommendation(Base):
    __tablename__ = "lead_recommendation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    lead_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("lead.id"))
    assessment_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("lead_profile_assessment.id"))
    project_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("course_project.id"))
    project_name: Mapped[str] = mapped_column(String(128), nullable=False)
    recommendation_reason: Mapped[str] = mapped_column(Text, default="")
    match_score: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(32), default="待确认")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
