from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import require_permission
from app.core.response import ok
from app.models.permission import SysRole
from app.schemas.admin import AuditLogCreate, RoleCreate, RolePermissionUpdate
from app.services.admin_service import (
    create_audit_log,
    create_role,
    ensure_default_admin_data,
    list_permissions,
    list_roles,
    serialize_role,
    set_role_permissions,
)

router = APIRouter(prefix="/api/roles", tags=["roles"])


@router.get("")
def list_all(_permission: None = Depends(require_permission("system:role:manage")), db: Session = Depends(get_db)):
    ensure_default_admin_data(db)
    return ok(list_roles(db))


@router.post("")
def create(payload: RoleCreate, _permission: None = Depends(require_permission("system:role:manage")), db: Session = Depends(get_db)):
    ensure_default_admin_data(db)
    role = create_role(db, payload)
    create_audit_log(
        db,
        AuditLogCreate(
            actor_username="admin",
            action="维护角色权限",
            resource_type="sys_role",
            resource_id=role.role_code,
            detail={"permission_codes": payload.permission_codes},
        ),
    )
    return ok(serialize_role(db, role))


@router.get("/permissions")
def permissions(_permission: None = Depends(require_permission("system:role:manage")), db: Session = Depends(get_db)):
    ensure_default_admin_data(db)
    return ok(list_permissions(db))


@router.post("/{role_id}/permissions")
def update_permissions(
    role_id: int,
    payload: RolePermissionUpdate,
    _permission: None = Depends(require_permission("system:role:manage")),
    db: Session = Depends(get_db),
):
    ensure_default_admin_data(db)
    role = db.query(SysRole).filter(SysRole.id == role_id).first()
    if not role:
        return ok(None, msg="角色不存在")
    set_role_permissions(db, role, payload.permission_codes)
    db.commit()
    create_audit_log(
        db,
        AuditLogCreate(
            actor_username="admin",
            action="更新角色权限",
            resource_type="sys_role",
            resource_id=role.role_code,
            detail={"permission_codes": payload.permission_codes},
        ),
    )
    return ok(serialize_role(db, role))
