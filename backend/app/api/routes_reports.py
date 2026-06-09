import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import fail, ok
from app.models.report import ReportSnapshot
from app.schemas.report import CustomerOperationReportRequest
from app.services.report_service import generate_customer_operation_report

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("/customer-operation")
def customer_operation(payload: CustomerOperationReportRequest, db: Session = Depends(get_db)):
    report = generate_customer_operation_report(db, generated_by=payload.generated_by)
    return ok({"id": report.id, "title": report.title, "generation_mode": report.generation_mode})


@router.get("")
def list_reports(db: Session = Depends(get_db)):
    reports = db.query(ReportSnapshot).order_by(ReportSnapshot.id.desc()).all()
    return ok([{"id": item.id, "title": item.title, "report_type": item.report_type} for item in reports])


@router.get("/{report_id}")
def detail(report_id: int, db: Session = Depends(get_db)):
    report = db.query(ReportSnapshot).filter(ReportSnapshot.id == report_id).first()
    if not report:
        return fail("报告不存在", 40403)
    return ok(
        {
            "id": report.id,
            "title": report.title,
            "report_type": report.report_type,
            "content": json.loads(report.content_json),
            "generation_mode": report.generation_mode,
        }
    )
