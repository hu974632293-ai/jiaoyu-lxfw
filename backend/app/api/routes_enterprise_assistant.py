from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import ok
from app.schemas.enterprise import DailyReportCreate, EnterpriseChatRequest, Nl2SqlQueryRequest
from app.services.enterprise_service import (
    create_daily_report,
    daily_report_summary,
    handle_enterprise_chat,
    list_daily_reports,
    list_org_units,
    run_controlled_nl2sql,
)

router = APIRouter(prefix="/api/enterprise-assistant", tags=["enterprise-assistant"])


@router.post("/chat")
def chat(payload: EnterpriseChatRequest, db: Session = Depends(get_db)):
    return ok(handle_enterprise_chat(db, payload))


@router.post("/daily-reports")
def create_report(payload: DailyReportCreate, db: Session = Depends(get_db)):
    return ok(create_daily_report(db, payload))


@router.get("/daily-reports")
def reports(db: Session = Depends(get_db)):
    return ok(list_daily_reports(db))


@router.get("/daily-reports/summary")
def report_summary(db: Session = Depends(get_db)):
    return ok(daily_report_summary(db))


@router.get("/org-units")
def org_units(db: Session = Depends(get_db)):
    return ok(list_org_units(db))


@router.post("/nl2sql/query")
def nl2sql_query(payload: Nl2SqlQueryRequest, db: Session = Depends(get_db)):
    return ok(run_controlled_nl2sql(db, payload))
