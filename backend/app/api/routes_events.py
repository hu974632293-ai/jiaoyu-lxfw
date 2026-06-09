from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import fail, ok
from app.models.event import EventLecture, EventRegistration
from app.schemas.event import EventRegisterRequest

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("")
def list_events(db: Session = Depends(get_db)):
    events = db.query(EventLecture).order_by(EventLecture.start_time).all()
    return ok(
        [
            {
                "id": item.id,
                "event_name": item.event_name,
                "event_type": item.event_type,
                "start_time": item.start_time.isoformat(),
                "location": item.location,
                "max_participants": item.max_participants,
                "current_participants": item.current_participants,
            }
            for item in events
        ]
    )


@router.post("/{event_id}/registrations")
def register(event_id: int, payload: EventRegisterRequest, db: Session = Depends(get_db)):
    event = db.query(EventLecture).filter(EventLecture.id == event_id).first()
    if not event:
        return fail("活动不存在", 40402)
    registration = EventRegistration(event_id=event_id, lead_id=payload.lead_id)
    event.current_participants += 1
    db.add(registration)
    db.commit()
    db.refresh(registration)
    return ok({"registration_id": registration.id, "event_id": event_id, "lead_id": payload.lead_id})
