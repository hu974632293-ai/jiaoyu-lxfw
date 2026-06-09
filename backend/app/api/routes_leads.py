from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import fail, ok
from app.schemas.lead import LeadCreate, LeadStatusUpdate
from app.services.lead_service import create_lead, get_lead, list_leads, update_lead_status

router = APIRouter(prefix="/api/leads", tags=["leads"])


@router.post("")
def create(payload: LeadCreate, db: Session = Depends(get_db)):
    lead = create_lead(db, payload)
    return ok({"id": lead.id})


@router.get("")
def list_all(db: Session = Depends(get_db)):
    leads = list_leads(db)
    return ok([{"id": item.id, "customer_name": item.customer_name, "status": item.status} for item in leads])


@router.get("/{lead_id}")
def detail(lead_id: int, db: Session = Depends(get_db)):
    lead = get_lead(db, lead_id)
    if not lead:
        return fail("客户不存在", 40401)
    return ok(
        {
            "id": lead.id,
            "customer_name": lead.customer_name,
            "contact_info": lead.contact_info,
            "background_info": lead.background_info,
            "status": lead.status,
        }
    )


@router.patch("/{lead_id}/status")
def update_status(lead_id: int, payload: LeadStatusUpdate, db: Session = Depends(get_db)):
    lead = update_lead_status(db, lead_id, payload.status)
    if not lead:
        return fail("客户不存在", 40401)
    return ok({"id": lead.id, "status": lead.status})
