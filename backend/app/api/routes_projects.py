from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import fail, ok
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services.project_service import (
    create_project,
    get_project,
    list_projects,
    list_recommendations,
    serialize_project,
    update_project,
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("")
def list_all(db: Session = Depends(get_db)):
    return ok(list_projects(db))


@router.post("")
def create(payload: ProjectCreate, db: Session = Depends(get_db)):
    project = create_project(db, payload)
    return ok(serialize_project(project))


@router.get("/recommendations")
def recommendations(tags: list[str] = Query(default=[]), db: Session = Depends(get_db)):
    return ok(list_recommendations(db, tags))


@router.get("/{project_id}")
def detail(project_id: int, db: Session = Depends(get_db)):
    project = get_project(db, project_id)
    if not project:
        return fail("项目不存在", 40405)
    return ok(serialize_project(project))


@router.patch("/{project_id}")
def update(project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db)):
    project = update_project(db, project_id, payload)
    if not project:
        return fail("项目不存在", 40405)
    return ok(serialize_project(project))
