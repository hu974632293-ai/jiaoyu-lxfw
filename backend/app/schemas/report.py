from pydantic import BaseModel


class CustomerOperationReportRequest(BaseModel):
    generated_by: str = "system"
    use_llm_polish: bool = False
