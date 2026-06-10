from pydantic import BaseModel
from datetime import date


class CustomerOperationReportRequest(BaseModel):
    generated_by: str = "system"
    use_llm_polish: bool = False


class ReportGenerateRequest(BaseModel):
    report_type: str
    generated_by: str = "system"
    period_start: date | None = None
    period_end: date | None = None
    use_llm_polish: bool = False
