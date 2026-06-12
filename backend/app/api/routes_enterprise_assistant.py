from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import require_permission
from app.core.response import ok
from app.schemas.enterprise import DailyReportCreate, EnterpriseChatRequest, Nl2SqlQueryRequest, VoiceDraftRequest
from app.services.enterprise_service import (
    build_voice_draft,
    create_daily_report,
    daily_report_summary,
    get_daily_report,
    get_directory_contact,
    handle_enterprise_chat,
    list_directory_contacts,
    list_daily_reports,
    list_org_units,
    run_controlled_nl2sql,
)

router = APIRouter(prefix="/api/enterprise-assistant", tags=["enterprise-assistant"])


@router.post("/chat")
def chat(payload: EnterpriseChatRequest, _permission: None = Depends(require_permission("assistant:enterprise:use")), db: Session = Depends(get_db)):
    return ok(handle_enterprise_chat(db, payload))


@router.post("/daily-reports")
def create_report(
    payload: DailyReportCreate,
    _permission: None = Depends(require_permission("assistant:enterprise:use")),
    db: Session = Depends(get_db),
):
    return ok(create_daily_report(db, payload))


@router.post("/voice-drafts")
def voice_draft(
    payload: VoiceDraftRequest,
    _permission: None = Depends(require_permission("assistant:enterprise:use")),
):
    return ok(build_voice_draft(payload))


@router.get("/daily-reports")
def reports(
    start_date: date | None = None,
    end_date: date | None = None,
    employee: str | None = None,
    department: str | None = None,
    _permission: None = Depends(require_permission("assistant:enterprise:use")),
    db: Session = Depends(get_db),
):
    return ok(list_daily_reports(db, start_date, end_date, employee, department))


@router.get("/daily-reports/summary")
def report_summary(
    summary_type: str = "daily",
    date: date | None = None,
    week_start: date | None = None,
    department: str | None = None,
    _permission: None = Depends(require_permission("assistant:enterprise:use")),
    db: Session = Depends(get_db),
):
    return ok(daily_report_summary(db, summary_type, date, week_start, department))


@router.get("/daily-reports/{report_id}")
def report_detail(
    report_id: int,
    _permission: None = Depends(require_permission("assistant:enterprise:use")),
    db: Session = Depends(get_db),
):
    return ok(get_daily_report(db, report_id))


@router.get("/org-units")
def org_units(
    keyword: str | None = None,
    _permission: None = Depends(require_permission("assistant:enterprise:use")),
    db: Session = Depends(get_db),
):
    return ok(list_org_units(db, keyword))


@router.get("/directory")
def directory(
    keyword: str | None = None,
    department: str | None = None,
    _permission: None = Depends(require_permission("assistant:enterprise:use")),
    db: Session = Depends(get_db),
):
    return ok(list_directory_contacts(db, keyword, department))


@router.get("/directory/{contact_id}")
def directory_detail(
    contact_id: int,
    _permission: None = Depends(require_permission("assistant:enterprise:use")),
    db: Session = Depends(get_db),
):
    return ok(get_directory_contact(db, contact_id))


@router.post("/nl2sql/query")
def nl2sql_query(
    payload: Nl2SqlQueryRequest,
    _permission: None = Depends(require_permission("assistant:enterprise:use")),
    db: Session = Depends(get_db),
):
    return ok(run_controlled_nl2sql(db, payload))
