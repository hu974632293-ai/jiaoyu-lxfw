from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CourseProject(Base):
    __tablename__ = "course_project"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_name: Mapped[str] = mapped_column(String(128), nullable=False)
    country: Mapped[str] = mapped_column(String(32), nullable=False)
    category: Mapped[str] = mapped_column(String(64), default="")
    target_audience: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    selling_points: Mapped[str] = mapped_column(Text, default="[]")
    cost_range: Mapped[str] = mapped_column(String(64), default="")
    duration: Mapped[str] = mapped_column(String(64), default="")
    admission_requirements: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[str] = mapped_column(Text, default="[]")
    recommendation_rule: Mapped[str] = mapped_column(Text, default="")
    knowledge_source: Mapped[str] = mapped_column(String(128), default="")
    status: Mapped[str] = mapped_column(String(32), default="招生中")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ProjectPathway(Base):
    __tablename__ = "project_pathway"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("course_project.id"), nullable=False)
    pathway_name: Mapped[str] = mapped_column(String(128), nullable=False)
    pathway_type: Mapped[str] = mapped_column(String(64), default="")
    duration: Mapped[str] = mapped_column(String(64), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ProjectTag(Base):
    __tablename__ = "project_tag"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("course_project.id"), nullable=False)
    tag_name: Mapped[str] = mapped_column(String(64), nullable=False)
    tag_type: Mapped[str] = mapped_column(String(32), default="业务")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ProjectRule(Base):
    __tablename__ = "project_rule"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("course_project.id"), nullable=False)
    rule_name: Mapped[str] = mapped_column(String(128), nullable=False)
    condition_json: Mapped[str] = mapped_column(Text, default="{}")
    priority: Mapped[int] = mapped_column(Integer, default=0)
    score_weight: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(32), default="启用")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ProjectMaterial(Base):
    __tablename__ = "project_material"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("course_project.id"), nullable=False)
    material_name: Mapped[str] = mapped_column(String(128), nullable=False)
    material_type: Mapped[str] = mapped_column(String(32), default="公开资料")
    file_path: Mapped[str] = mapped_column(String(255), default="")
    content: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="启用")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
