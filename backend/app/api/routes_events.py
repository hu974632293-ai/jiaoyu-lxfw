from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import fail, ok
from app.schemas.event import EventCheckInRequest, EventCreate, EventRegisterRequest, EventUpdate
from app.services.event_service import (
    check_in_registration,
    create_event,
    create_registration,
    get_event,
    list_events as list_event_items,
    list_registrations,
    serialize_event,
    serialize_registration,
    update_event,
)

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("")
def list_events(db: Session = Depends(get_db)):
    return ok(list_event_items(db))


@router.post("")
def create(payload: EventCreate, db: Session = Depends(get_db)):
    event = create_event(db, payload)
    return ok(serialize_event(db, event))


@router.get("/{event_id}")
def detail(event_id: int, db: Session = Depends(get_db)):
    event = get_event(db, event_id)
    if not event:
        return fail("活动不存在", 40402)
    return ok(serialize_event(db, event))


@router.patch("/{event_id}")
def update(event_id: int, payload: EventUpdate, db: Session = Depends(get_db)):
    event = update_event(db, event_id, payload)
    if not event:
        return fail("活动不存在", 40402)
    return ok(serialize_event(db, event))


@router.post("/{event_id}/registrations")
def register(event_id: int, payload: EventRegisterRequest, db: Session = Depends(get_db)):
    registration, error = create_registration(db, event_id, payload)
    if not registration:
        return fail(error or "活动报名失败", 40402)
    return ok(serialize_registration(registration))


@router.get("/{event_id}/registrations")
def registrations(event_id: int, db: Session = Depends(get_db)):
    records = list_registrations(db, event_id)
    if records is None:
        return fail("活动不存在", 40402)
    return ok(records)


@router.post("/{event_id}/check-ins")
def check_in(event_id: int, payload: EventCheckInRequest, db: Session = Depends(get_db)):
    registration, error = check_in_registration(db, event_id, payload)
    if not registration:
        return fail(error or "活动签到失败", 40402)
    return ok(serialize_registration(registration))
