import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import ok
from app.models.lead import LeadProfileAssessment
from app.schemas.profile import ProfileAssessRequest
from app.services.profile_rules import assess_profile

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.post("/assess")
def assess(request: ProfileAssessRequest, db: Session = Depends(get_db)):
    result = assess_profile(request.raw_input)
    record = LeadProfileAssessment(
        lead_id=request.lead_id,
        source_type=request.source_type,
        raw_input=request.raw_input,
        extracted_profile=json.dumps(result["extracted_profile"], ensure_ascii=False),
        singapore_score=result["singapore_score"],
        germany_score=result["germany_score"],
        matched_project=result["matched_project"],
        reasons=json.dumps(result["reasons"], ensure_ascii=False),
        missing_fields=json.dumps(result["missing_fields"], ensure_ascii=False),
        suggested_actions=json.dumps(result["suggested_actions"], ensure_ascii=False),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return ok({"assessment_id": record.id, **result})
