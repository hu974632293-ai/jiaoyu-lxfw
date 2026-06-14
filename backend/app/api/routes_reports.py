from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import require_token_permission
from app.core.response import fail, ok
from app.models.report import ReportSnapshot
from app.schemas.report import CustomerOperationReportRequest, ReportGenerateRequest
from app.services.report_service import (
    export_report_snapshot,
    generate_customer_operation_report,
    generate_report_snapshot,
    serialize_report_detail,
    serialize_report_summary,
)

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("/customer-operation")
def customer_operation(
    payload: CustomerOperationReportRequest,
    _permission: None = Depends(require_token_permission("report:snapshot:read")),
    db: Session = Depends(get_db),
):
    report = generate_customer_operation_report(db, generated_by=payload.generated_by)
    return ok({"id": report.id, "title": report.title, "generation_mode": report.generation_mode})


@router.post("/generate")
def generate(
    payload: ReportGenerateRequest,
    _permission: None = Depends(require_token_permission("report:snapshot:read")),
    db: Session = Depends(get_db),
):
    try:
        return ok(serialize_report_summary(generate_report_snapshot(db, payload)))
    except ValueError as exc:
        return fail(str(exc), 40001)


@router.get("")
def list_reports(_permission: None = Depends(require_token_permission("report:snapshot:read")), db: Session = Depends(get_db)):
    reports = db.query(ReportSnapshot).order_by(ReportSnapshot.id.desc()).all()
    return ok([serialize_report_summary(item) for item in reports])


@router.get("/{report_id}")
def detail(report_id: int, _permission: None = Depends(require_token_permission("report:snapshot:read")), db: Session = Depends(get_db)):
    report = db.query(ReportSnapshot).filter(ReportSnapshot.id == report_id).first()
    if not report:
        return fail("报告不存在", 40403)
    return ok(serialize_report_detail(report))


@router.get("/{report_id}/export")
def export(
    report_id: int,
    format: str = "pdf",
    current_user=Depends(require_token_permission("report:snapshot:read")),
    db: Session = Depends(get_db),
):
    try:
        return ok(export_report_snapshot(db, report_id, format, current_user.username))
    except ValueError as exc:
        return fail(str(exc), 40001)
    except LookupError as exc:
        return fail(str(exc), 40403)
