import json
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.event import EventLecture
from app.models.lead import CrmLead
from app.models.project import CourseProject
from app.models.user import SysUser

ROOT = Path(__file__).resolve().parents[3]


def _load_json(relative_path: str):
    path = ROOT / relative_path
    return json.loads(path.read_text(encoding="utf-8"))


def seed_demo_data(db: Session):
    if not db.query(SysUser).filter_by(username="admin").first():
        db.add(
            SysUser(
                username="admin",
                password_hash="demo",
                real_name="演示管理员",
                user_type="EMPLOYEE",
                role="admin",
            )
        )

    if db.query(CourseProject).count() == 0:
        for item in _load_json("data/demo/projects.json"):
            project_data = item.copy()
            project_data["selling_points"] = json.dumps(item["selling_points"], ensure_ascii=False)
            db.add(CourseProject(**project_data))

    if db.query(EventLecture).count() == 0:
        for item in _load_json("data/demo/events.json"):
            item["start_time"] = datetime.fromisoformat(item["start_time"])
            db.add(EventLecture(**item))

    if db.query(CrmLead).count() == 0:
        for item in _load_json("data/demo/leads.json"):
            db.add(CrmLead(**item, status="新增意向"))

    db.commit()
    return {
        "users": db.query(SysUser).count(),
        "projects": db.query(CourseProject).count(),
        "events": db.query(EventLecture).count(),
        "leads": db.query(CrmLead).count(),
    }
