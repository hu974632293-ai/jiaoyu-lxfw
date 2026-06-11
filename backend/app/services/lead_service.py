from datetime import datetime, time

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.lead import CrmLead
from app.schemas.lead import LeadCreate
from app.services.crm_service import create_stage_history


def create_lead(db: Session, payload: LeadCreate):
    lead = CrmLead(**payload.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def list_leads(
    db: Session,
    keyword: str | None = None,
    status: str | None = None,
    owner_id: int | None = None,
    source_channel: str | None = None,
    created_from: str | None = None,
    created_to: str | None = None,
):
    query = db.query(CrmLead)
    if keyword:
        like_keyword = f"%{keyword.strip()}%"
        query = query.filter(
            or_(
                CrmLead.customer_name.like(like_keyword),
                CrmLead.contact_info.like(like_keyword),
                CrmLead.background_info.like(like_keyword),
            )
        )
    if status:
        status_values = _expand_status_filter(status)
        query = query.filter(CrmLead.status.in_(status_values))
    if owner_id is not None:
        query = query.filter(CrmLead.owner_id == owner_id)
    if source_channel:
        query = query.filter(CrmLead.source_channel == source_channel)
    from_time = _parse_date_boundary(created_from, is_end=False)
    if from_time:
        query = query.filter(CrmLead.created_at >= from_time)
    to_time = _parse_date_boundary(created_to, is_end=True)
    if to_time:
        query = query.filter(CrmLead.created_at <= to_time)
    return query.order_by(CrmLead.id.desc()).all()


def get_lead(db: Session, lead_id: int):
    return db.query(CrmLead).filter(CrmLead.id == lead_id).first()


def update_lead_status(db: Session, lead_id: int, status: str, reason: str = "", operator_username: str | None = None):
    lead = get_lead(db, lead_id)
    if not lead:
        return None
    from_status = lead.status
    lead.status = status
    create_stage_history(db, lead, from_status, status, reason, operator_username)
    db.commit()
    db.refresh(lead)
    return lead


def _parse_date_boundary(raw_value: str | None, is_end: bool) -> datetime | None:
    if not raw_value:
        return None
    try:
        parsed_date = datetime.fromisoformat(raw_value).date()
    except ValueError:
        return None
    return datetime.combine(parsed_date, time.max if is_end else time.min)


def _expand_status_filter(status: str) -> list[str]:
    status_aliases = {
        "new": ["new", "新增意向"],
        "converted": ["converted", "已转化", "已成交"],
        "lost": ["lost", "流失", "暂缓/流失"],
    }
    return status_aliases.get(status, [status])
