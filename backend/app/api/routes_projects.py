from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import ok
from app.models.project import CourseProject

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("")
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(CourseProject).order_by(CourseProject.id).all()
    return ok(
        [
            {
                "id": item.id,
                "project_name": item.project_name,
                "country": item.country,
                "category": item.category,
                "target_audience": item.target_audience,
                "description": item.description,
            }
            for item in projects
        ]
    )
