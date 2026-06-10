from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AssistantConversation(Base):
    __tablename__ = "assistant_conversation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("sys_user.id"))
    student_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("student_profile.id"))
    lead_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("crm_lead.id"))
    assistant_type: Mapped[str] = mapped_column(String(32), nullable=False)
    channel: Mapped[str] = mapped_column(String(32), default="web")
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, default="")
    intent: Mapped[str] = mapped_column(String(64), default="")
    status: Mapped[str] = mapped_column(String(32), default="success")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AssistantIntentLog(Base):
    __tablename__ = "assistant_intent_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("assistant_conversation.id"))
    intent: Mapped[str] = mapped_column(String(64), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0)
    parsed_payload: Mapped[str] = mapped_column(Text, default="{}")
    status: Mapped[str] = mapped_column(String(32), default="识别完成")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Nl2SqlQueryLog(Base):
    __tablename__ = "nl2sql_query_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("sys_user.id"))
    question: Mapped[str] = mapped_column(Text, nullable=False)
    sql_template: Mapped[str] = mapped_column(Text, default="")
    result_json: Mapped[str] = mapped_column(Text, default="{}")
    status: Mapped[str] = mapped_column(String(32), default="success")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class KnowledgeSource(Base):
    __tablename__ = "knowledge_source"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_name: Mapped[str] = mapped_column(String(128), nullable=False)
    source_type: Mapped[str] = mapped_column(String(32), default="document")
    business_domain: Mapped[str] = mapped_column(String(64), default="客服")
    scene: Mapped[str] = mapped_column(String(64), default="customer_service")
    owner: Mapped[str] = mapped_column(String(64), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    file_path: Mapped[str] = mapped_column(String(255), default="")
    dify_dataset_id: Mapped[str] = mapped_column(String(128), default="")
    status: Mapped[str] = mapped_column(String(32), default="待同步")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class KnowledgeSyncJob(Base):
    __tablename__ = "knowledge_sync_job"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("knowledge_source.id"))
    job_type: Mapped[str] = mapped_column(String(32), default="manual")
    status: Mapped[str] = mapped_column(String(32), default="pending")
    message: Mapped[str] = mapped_column(Text, default="")
    finished_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
