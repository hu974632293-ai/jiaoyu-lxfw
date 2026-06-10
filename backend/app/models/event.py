from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class EventLecture(Base):
    __tablename__ = "event_lecture"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_name: Mapped[str] = mapped_column(String(128), nullable=False)
    event_type: Mapped[str] = mapped_column(String(32), default="线上")
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    location: Mapped[str] = mapped_column(String(255), default="")
    max_participants: Mapped[int] = mapped_column(Integer, default=100)
    current_participants: Mapped[int] = mapped_column(Integer, default=0)
    target_audience: Mapped[str] = mapped_column(String(255), default="")
    speaker: Mapped[str] = mapped_column(String(64), default="")
    status: Mapped[str] = mapped_column(String(32), default="草稿")
    description: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Event(Base):
    __tablename__ = "event"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_name: Mapped[str] = mapped_column(String(128), nullable=False)
    event_type: Mapped[str] = mapped_column(String(32), default="线上")
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    location: Mapped[str] = mapped_column(String(255), default="")
    max_participants: Mapped[int] = mapped_column(Integer, default=100)
    current_participants: Mapped[int] = mapped_column(Integer, default=0)
    target_audience: Mapped[str] = mapped_column(String(255), default="")
    speaker: Mapped[str] = mapped_column(String(64), default="")
    status: Mapped[str] = mapped_column(String(32), default="草稿")
    description: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EventRegistration(Base):
    __tablename__ = "event_registration"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("event_lecture.id"), nullable=False)
    lead_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("crm_lead.id"))
    subject_type: Mapped[str] = mapped_column(String(32), default="lead")
    subject_id: Mapped[int | None] = mapped_column(Integer)
    subject_name: Mapped[str] = mapped_column(String(64), default="")
    contact_info: Mapped[str] = mapped_column(String(255), default="")
    source_channel: Mapped[str] = mapped_column(String(64), default="")
    status: Mapped[str] = mapped_column(String(32), default="已报名")
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EventCheckin(Base):
    __tablename__ = "event_checkin"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("event.id"), nullable=False)
    registration_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("event_registration.id"))
    operator_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("sys_user.id"))
    checkin_time: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String(32), default="已签到")
