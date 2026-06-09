import json
from collections import Counter

from sqlalchemy.orm import Session

from app.models.lead import CrmLead, LeadProfileAssessment
from app.models.report import ReportSnapshot


def generate_customer_operation_report(db: Session, generated_by: str = "system"):
    leads = db.query(CrmLead).all()
    assessments = db.query(LeadProfileAssessment).all()

    project_counter = Counter(item.matched_project for item in assessments if item.matched_project)
    high_value = [
        {
            "assessment_id": item.id,
            "matched_project": item.matched_project,
            "singapore_score": item.singapore_score,
            "germany_score": item.germany_score,
        }
        for item in assessments
        if max(item.singapore_score, item.germany_score) >= 70
    ]

    content = {
        "summary": {
            "lead_count": len(leads),
            "assessment_count": len(assessments),
            "high_value_count": len(high_value),
        },
        "project_distribution": dict(project_counter),
        "high_value_leads": high_value,
        "suggestions": [
            "优先跟进画像评分超过 70 分的客户",
            "对缺少联系方式或学历信息的客户进行二次补充",
            "将新加坡升学意向客户导流到线上说明会",
            "将德国职业教育意向客户安排顾问确认德语和职业方向",
        ],
    }

    report = ReportSnapshot(
        report_type="customer_operation",
        title="客户经营分析报告",
        content_json=json.dumps(content, ensure_ascii=False),
        generated_by=generated_by,
        generation_mode="template",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
