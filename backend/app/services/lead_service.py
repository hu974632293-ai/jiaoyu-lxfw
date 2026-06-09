from sqlalchemy.orm import Session

from app.models.lead import CrmLead
from app.schemas.lead import LeadCreate


def create_lead(db: Session, payload: LeadCreate):
    lead = CrmLead(**payload.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def list_leads(db: Session):
    return db.query(CrmLead).order_by(CrmLead.id.desc()).all()


def get_lead(db: Session, lead_id: int):
    return db.query(CrmLead).filter(CrmLead.id == lead_id).first()


def update_lead_status(db: Session, lead_id: int, status: str):
    lead = get_lead(db, lead_id)
    if not lead:
        return None
    lead.status = status
    db.commit()
    db.refresh(lead)
    return lead
