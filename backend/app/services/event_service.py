import json
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.event import EventLecture, EventRegistration
from app.models.lead import CrmLead
from app.models.operation import AuditLog, EventCheckIn
from app.models.user import SysUser
from app.schemas.event import EventCheckInRequest, EventCreate, EventRegisterRequest, EventUpdate


def list_events(db: Session) -> list[dict[str, Any]]:
    events = db.query(EventLecture).order_by(EventLecture.start_time).all()
    return [serialize_event(db, item) for item in events]


def get_event(db: Session, event_id: int) -> EventLecture | None:
    return db.query(EventLecture).filter_by(id=event_id).first()


def create_event(db: Session, payload: EventCreate) -> EventLecture:
    event = EventLecture(
        event_name=payload.event_name,
        event_type=payload.event_type,
        start_time=payload.start_time,
        location=payload.location,
        max_participants=payload.max_participants,
        target_audience=payload.target_audience,
        speaker=payload.speaker,
        status=payload.status,
        description=payload.description,
    )
    db.add(event)
    db.flush()
    _create_audit_log(
        db,
        payload.operator_username,
        "创建活动",
        "event_lecture",
        str(event.id),
        {"event_name": event.event_name, "status": event.status},
    )
    db.commit()
    db.refresh(event)
    return event


def update_event(db: Session, event_id: int, payload: EventUpdate) -> EventLecture | None:
    event = get_event(db, event_id)
    if not event:
        return None

    update_data = payload.model_dump(exclude_unset=True)
    operator_username = update_data.pop("operator_username", None)
    for field, value in update_data.items():
        if value is not None:
            setattr(event, field, value)

    db.flush()
    _create_audit_log(
        db,
        operator_username,
        "更新活动",
        "event_lecture",
        str(event.id),
        {"event_name": event.event_name, "updated_fields": sorted(update_data.keys())},
    )
    db.commit()
    db.refresh(event)
    return event


def create_registration(db: Session, event_id: int, payload: EventRegisterRequest) -> tuple[EventRegistration | None, str | None]:
    event = get_event(db, event_id)
    if not event:
        return None, "活动不存在"
    if event.current_participants >= event.max_participants:
        return None, "活动人数已满"

    subject_type = payload.subject_type or "lead"
    subject_id = payload.subject_id or payload.lead_id
    lead_id = payload.lead_id if subject_type == "lead" else None
    if subject_type == "lead":
        lead_id = subject_id
        lead = db.query(CrmLead).filter_by(id=lead_id).first() if lead_id else None
        if not lead:
            return None, "线索不存在"
        subject_name = payload.subject_name or lead.customer_name
        contact_info = payload.contact_info or lead.contact_info or ""
    else:
        subject_name = payload.subject_name or f"学生{subject_id or ''}".strip()
        contact_info = payload.contact_info

    registration = EventRegistration(
        event_id=event_id,
        lead_id=lead_id or 0,
        subject_type=subject_type,
        subject_id=subject_id,
        subject_name=subject_name,
        contact_info=contact_info,
        source_channel=payload.source_channel,
        status="已报名",
    )
    event.current_participants += 1
    db.add(registration)
    db.flush()
    _create_audit_log(
        db,
        payload.operator_username,
        "活动报名",
        "event_registration",
        str(registration.id),
        {
            "event_id": event_id,
            "event_name": event.event_name,
            "subject_type": subject_type,
            "subject_id": subject_id,
            "subject_name": subject_name,
        },
    )
    db.commit()
    db.refresh(registration)
    return registration, None


def list_registrations(db: Session, event_id: int) -> list[dict[str, Any]] | None:
    if not get_event(db, event_id):
        return None
    records = db.query(EventRegistration).filter_by(event_id=event_id).order_by(EventRegistration.id).all()
    return [serialize_registration(item) for item in records]


def check_in_registration(db: Session, event_id: int, payload: EventCheckInRequest) -> tuple[EventRegistration | None, str | None]:
    event = get_event(db, event_id)
    if not event:
        return None, "活动不存在"
    registration = db.query(EventRegistration).filter_by(id=payload.registration_id, event_id=event_id).first()
    if not registration:
        return None, "报名记录不存在"

    operator = _get_operator(db, payload.operator_username)
    now = datetime.utcnow()
    registration.status = "已签到"
    registration.checked_in_at = now
    db.add(
        EventCheckIn(
            event_id=event_id,
            registration_id=registration.id,
            operator_id=operator.id if operator else None,
            check_in_time=now,
        )
    )
    db.flush()
    _create_audit_log(
        db,
        payload.operator_username,
        "活动签到",
        "event_registration",
        str(registration.id),
        {
            "event_id": event_id,
            "event_name": event.event_name,
            "subject_type": registration.subject_type,
            "subject_name": registration.subject_name,
        },
    )
    db.commit()
    db.refresh(registration)
    return registration, None


def serialize_event(db: Session, item: EventLecture) -> dict[str, Any]:
    checked_in_count = db.query(EventRegistration).filter_by(event_id=item.id, status="已签到").count()
    return {
        "id": item.id,
        "event_name": item.event_name,
        "event_type": item.event_type,
        "start_time": item.start_time.isoformat() if item.start_time else None,
        "location": item.location,
        "max_participants": item.max_participants,
        "current_participants": item.current_participants,
        "target_audience": item.target_audience,
        "speaker": item.speaker,
        "status": item.status,
        "description": item.description,
        "checked_in_count": checked_in_count,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def serialize_registration(item: EventRegistration) -> dict[str, Any]:
    return {
        "id": item.id,
        "registration_id": item.id,
        "event_id": item.event_id,
        "lead_id": item.lead_id,
        "subject_type": item.subject_type,
        "subject_id": item.subject_id,
        "subject_name": item.subject_name,
        "contact_info": item.contact_info,
        "source_channel": item.source_channel,
        "status": item.status,
        "checked_in_at": item.checked_in_at.isoformat() if item.checked_in_at else None,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def _get_operator(db: Session, username: str | None) -> SysUser | None:
    if not username:
        return None
    return db.query(SysUser).filter_by(username=username).first()


def _create_audit_log(
    db: Session,
    actor_username: str | None,
    action: str,
    resource_type: str,
    resource_id: str,
    detail: dict[str, Any],
) -> None:
    actor = _get_operator(db, actor_username)
    db.add(
        AuditLog(
            actor_user_id=actor.id if actor else None,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            detail=json.dumps(detail, ensure_ascii=False),
        )
    )
