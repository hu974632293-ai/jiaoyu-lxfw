import json
from typing import Any

from sqlalchemy.orm import Session

from app.models.operation import AuditLog
from app.models.project import CourseProject
from app.models.user import SysUser
from app.schemas.project import ProjectCreate, ProjectUpdate


def list_projects(db: Session) -> list[dict[str, Any]]:
    return [serialize_project(item) for item in db.query(CourseProject).order_by(CourseProject.id).all()]


def get_project(db: Session, project_id: int) -> CourseProject | None:
    return db.query(CourseProject).filter_by(id=project_id).first()


def create_project(db: Session, payload: ProjectCreate) -> CourseProject:
    project = CourseProject(
        project_name=payload.project_name,
        country=payload.country,
        category=payload.category,
        target_audience=payload.target_audience,
        description=payload.description,
        selling_points=json.dumps(payload.selling_points, ensure_ascii=False),
        cost_range=payload.cost_range,
        duration=payload.duration,
        admission_requirements=payload.admission_requirements,
        tags=json.dumps(payload.tags, ensure_ascii=False),
        recommendation_rule=payload.recommendation_rule,
        knowledge_source=payload.knowledge_source,
        status=payload.status,
    )
    db.add(project)
    db.flush()
    _create_audit_log(
        db,
        payload.operator_username,
        "创建项目课程",
        "course_project",
        str(project.id),
        {"project_name": project.project_name, "tags": payload.tags},
    )
    db.commit()
    db.refresh(project)
    return project


def update_project(db: Session, project_id: int, payload: ProjectUpdate) -> CourseProject | None:
    project = get_project(db, project_id)
    if not project:
        return None

    update_data = payload.model_dump(exclude_unset=True)
    operator_username = update_data.pop("operator_username", None)
    for field in ("selling_points", "tags"):
        if field in update_data and update_data[field] is not None:
            update_data[field] = json.dumps(update_data[field], ensure_ascii=False)
    for field, value in update_data.items():
        if value is not None:
            setattr(project, field, value)

    db.flush()
    _create_audit_log(
        db,
        operator_username,
        "更新项目课程",
        "course_project",
        str(project.id),
        {"project_name": project.project_name, "updated_fields": sorted(update_data.keys())},
    )
    db.commit()
    db.refresh(project)
    return project


def list_recommendations(db: Session, tags: list[str]) -> list[dict[str, Any]]:
    requested_tags = [item for item in tags if item]
    projects = db.query(CourseProject).order_by(CourseProject.id).all()
    recommendations = []
    for project in projects:
        project_tags = _parse_json_list(project.tags)
        matched_tags = [tag for tag in requested_tags if tag in project_tags]
        if requested_tags and not matched_tags:
            continue
        recommendations.append(
            {
                "project_id": project.id,
                "project_name": project.project_name,
                "matched_tags": matched_tags,
                "match_score": len(matched_tags),
                "recommendation_rule": project.recommendation_rule or "根据项目标签和客户画像标签匹配推荐。",
            }
        )
    return sorted(recommendations, key=_recommendation_sort_key, reverse=True)



def _recommendation_sort_key(item: dict[str, Any]) -> int:
    return int(item["match_score"])

def serialize_project(item: CourseProject) -> dict[str, Any]:
    return {
        "id": item.id,
        "project_name": item.project_name,
        "country": item.country,
        "category": item.category,
        "target_audience": item.target_audience,
        "description": item.description,
        "selling_points": _parse_json_list(item.selling_points),
        "cost_range": item.cost_range,
        "duration": item.duration,
        "admission_requirements": item.admission_requirements,
        "tags": _parse_json_list(item.tags),
        "recommendation_rule": item.recommendation_rule,
        "knowledge_source": item.knowledge_source,
        "status": item.status,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def _parse_json_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        return []
    return value if isinstance(value, list) else []


def _create_audit_log(
    db: Session,
    actor_username: str | None,
    action: str,
    resource_type: str,
    resource_id: str,
    detail: dict[str, Any],
) -> None:
    actor = db.query(SysUser).filter_by(username=actor_username).first() if actor_username else None
    db.add(
        AuditLog(
            actor_user_id=actor.id if actor else None,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            detail=json.dumps(detail, ensure_ascii=False),
        )
    )
