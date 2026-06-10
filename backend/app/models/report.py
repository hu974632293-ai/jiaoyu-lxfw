from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ReportSnapshot(Base):
    __tablename__ = "report_snapshot"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_type: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    period_start: Mapped[date | None] = mapped_column(Date)
    period_end: Mapped[date | None] = mapped_column(Date)
    content_json: Mapped[str] = mapped_column(Text, nullable=False)
    generated_by: Mapped[str] = mapped_column(String(64), default="system")
    generation_mode: Mapped[str] = mapped_column(String(32), default="template")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ReportMetric(Base):
    __tablename__ = "report_metric"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("report_snapshot.id"))
    metric_key: Mapped[str] = mapped_column(String(128), nullable=False)
    metric_name: Mapped[str] = mapped_column(String(128), nullable=False)
    metric_value: Mapped[float] = mapped_column(Float, default=0)
    dimension: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ReportGenerationLog(Base):
    __tablename__ = "report_generation_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("report_snapshot.id"))
    report_type: Mapped[str] = mapped_column(String(64), nullable=False)
    generated_by: Mapped[str] = mapped_column(String(64), default="system")
    status: Mapped[str] = mapped_column(String(32), default="success")
    message: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RecommendationLog(Base):
    __tablename__ = "recommendation_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    subject_type: Mapped[str] = mapped_column(String(32), nullable=False)
    subject_id: Mapped[int | None] = mapped_column(Integer)
    recommendation_type: Mapped[str] = mapped_column(String(64), default="project")
    recommendation_text: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(64), default="rule")
    status: Mapped[str] = mapped_column(String(32), default="已生成")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
