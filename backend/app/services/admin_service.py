import json
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.operation import AuditLog, Notification
from app.models.permission import SysPermission, SysRole, SysRolePermission, SysUserRole
from app.models.user import SysUser
from app.schemas.admin import AuditLogCreate, RoleCreate

DEFAULT_PERMISSIONS = [
    ("dashboard:read", "查看总览", "总览", "查看运营总览和二期业务状态"),
    ("crm:lead:read", "查看 CRM 线索", "CRM", "查看线索列表、详情和时间线"),
    ("crm:lead:write", "维护 CRM 线索", "CRM", "新增线索、跟进和状态流转"),
    ("project:course:read", "查看项目课程", "项目/课程", "查看项目标签和推荐说明"),
    ("event:operation:write", "维护活动运营", "活动运营", "创建活动、报名和签到"),
    ("assistant:enterprise:use", "使用企业助手", "企业助手", "客户录入、日报和组织架构查询"),
    ("assistant:student:use", "使用学生助手", "学生助手", "请假、反馈、进度和生活支持"),
    ("student:leave:approve", "审批学生请假", "学生助手", "老师审批请假和处理反馈"),
    ("knowledge:chat:use", "使用知识库问答", "知识库", "调用 Dify 或 fallback 问答"),
    ("report:snapshot:read", "查看报告快照", "报告中心", "查看报告详情和 JSON 快照"),
    ("system:user:manage", "管理用户", "系统管理", "维护用户和角色绑定"),
    ("system:role:manage", "管理角色权限", "系统管理", "维护角色和权限点"),
    ("system:audit:read", "查看审计日志", "系统管理", "查看关键操作审计"),
]

DEFAULT_ROLES = [
    ("admin", "管理员", "系统治理、权限、审计", [item[0] for item in DEFAULT_PERMISSIONS]),
    (
        "manager",
        "管理者",
        "经营报告、团队日报、风险",
        ["dashboard:read", "crm:lead:read", "assistant:enterprise:use", "report:snapshot:read", "system:audit:read"],
    ),
    (
        "consultant",
        "顾问",
        "CRM、跟进、活动报名",
        [
            "dashboard:read",
            "crm:lead:read",
            "crm:lead:write",
            "project:course:read",
            "event:operation:write",
            "assistant:enterprise:use",
            "knowledge:chat:use",
        ],
    ),
    ("employee", "员工", "企业助手、日报、新人指南", ["dashboard:read", "assistant:enterprise:use", "knowledge:chat:use"]),
    (
        "teacher",
        "老师",
        "学生服务、审批、预警",
        ["dashboard:read", "assistant:enterprise:use", "assistant:student:use", "student:leave:approve", "knowledge:chat:use", "report:snapshot:read"],
    ),
    ("student", "学生", "请假、反馈、进度、生活支持", ["assistant:student:use", "knowledge:chat:use"]),
]

DEFAULT_NOTIFICATIONS = [
    ("高潜客户需要今日回访", "CRM 线索 #1 需要顾问今天回访", "crm_lead", 1),
    ("学生心理辅助预警待跟进", "学生助手记录了中高风险辅助提示，请老师跟进", "student_psych_alert", 1),
    ("日报周汇总已生成", "员工日报周汇总报告已生成，可在报告中心查看", "report_snapshot", 1),
]


def ensure_default_admin_data(db: Session) -> None:
    for code, name, module, description in DEFAULT_PERMISSIONS:
        permission = db.query(SysPermission).filter_by(permission_code=code).first()
        if not permission:
            db.add(
                SysPermission(
                    permission_code=code,
                    permission_name=name,
                    module=module,
                    description=description,
                )
            )

    db.flush()

    for code, name, description, permission_codes in DEFAULT_ROLES:
        role = db.query(SysRole).filter_by(role_code=code).first()
        if not role:
            role = SysRole(role_code=code, role_name=name, description=description)
            db.add(role)
            db.flush()
        current_permission_codes = {
            permission.permission_code
            for permission in (
                db.query(SysPermission)
                .join(SysRolePermission, SysRolePermission.permission_id == SysPermission.id)
                .filter(SysRolePermission.role_id == role.id)
                .all()
            )
        }
        for permission_code in permission_codes:
            if permission_code in current_permission_codes:
                continue
            permission = db.query(SysPermission).filter_by(permission_code=permission_code).first()
            if permission:
                db.add(SysRolePermission(role_id=role.id, permission_id=permission.id))

    admin = db.query(SysUser).filter_by(username="admin").first()
    admin_role = db.query(SysRole).filter_by(role_code="admin").first()
    if admin and admin_role and not db.query(SysUserRole).filter_by(user_id=admin.id, role_id=admin_role.id).first():
        db.add(SysUserRole(user_id=admin.id, role_id=admin_role.id))

    for title, content, target_type, target_id in DEFAULT_NOTIFICATIONS:
        notification = db.query(Notification).filter_by(title=title, target_type=target_type, target_id=target_id).first()
        if notification:
            notification.content = content
            notification.status = "未读"
            notification.created_at = datetime.utcnow()
        else:
            db.add(Notification(title=title, content=content, target_type=target_type, target_id=target_id))

    db.commit()


def list_users(db: Session) -> list[dict[str, Any]]:
    roles_by_user: dict[int, list[str]] = {}
    bindings = db.query(SysUserRole, SysRole).join(SysRole, SysUserRole.role_id == SysRole.id).all()
    for binding, role in bindings:
        roles_by_user.setdefault(binding.user_id, []).append(role.role_name)

    users = db.query(SysUser).order_by(SysUser.id).all()
    return [
        {
            "id": item.id,
            "username": item.username,
            "real_name": item.real_name,
            "user_type": item.user_type,
            "role": item.role,
            "roles": roles_by_user.get(item.id, []),
            "status": item.status,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in users
    ]


def user_has_permission(db: Session, username: str, permission_code: str) -> bool:
    user = db.query(SysUser).filter_by(username=username).first()
    if not user:
        return False
    if user.role == "admin":
        return True

    role_ids = [binding.role_id for binding in db.query(SysUserRole).filter_by(user_id=user.id).all()]
    role_codes = [user.role] if user.role else []
    permission_query = (
        db.query(SysPermission)
        .join(SysRolePermission, SysRolePermission.permission_id == SysPermission.id)
        .join(SysRole, SysRole.id == SysRolePermission.role_id)
        .filter(SysPermission.permission_code == permission_code)
    )
    if role_ids:
        permission_query = permission_query.filter((SysRole.id.in_(role_ids)) | (SysRole.role_code.in_(role_codes)))
    else:
        permission_query = permission_query.filter(SysRole.role_code.in_(role_codes))
    return permission_query.first() is not None


def list_permissions(db: Session) -> list[dict[str, Any]]:
    return [
        {
            "id": item.id,
            "permission_code": item.permission_code,
            "permission_name": item.permission_name,
            "module": item.module,
            "description": item.description,
        }
        for item in db.query(SysPermission).order_by(SysPermission.module, SysPermission.id).all()
    ]


def list_roles(db: Session) -> list[dict[str, Any]]:
    roles = db.query(SysRole).order_by(SysRole.id).all()
    return [serialize_role(db, role) for role in roles]


def create_role(db: Session, payload: RoleCreate) -> SysRole:
    role = db.query(SysRole).filter_by(role_code=payload.role_code).first()
    if role:
        role.role_name = payload.role_name
        role.description = payload.description
    else:
        role = SysRole(role_code=payload.role_code, role_name=payload.role_name, description=payload.description)
        db.add(role)
        db.flush()
    set_role_permissions(db, role, payload.permission_codes)
    db.commit()
    db.refresh(role)
    return role


def set_role_permissions(db: Session, role: SysRole, permission_codes: list[str]) -> None:
    permissions = db.query(SysPermission).filter(SysPermission.permission_code.in_(permission_codes)).all() if permission_codes else []
    db.query(SysRolePermission).filter_by(role_id=role.id).delete()
    for permission in permissions:
        db.add(SysRolePermission(role_id=role.id, permission_id=permission.id))


def serialize_role(db: Session, role: SysRole) -> dict[str, Any]:
    permissions = (
        db.query(SysPermission)
        .join(SysRolePermission, SysRolePermission.permission_id == SysPermission.id)
        .filter(SysRolePermission.role_id == role.id)
        .order_by(SysPermission.module, SysPermission.id)
        .all()
    )
    permission_codes = [item.permission_code for item in permissions]
    return {
        "id": role.id,
        "role_code": role.role_code,
        "role_name": role.role_name,
        "description": role.description,
        "status": role.status,
        "permission_codes": permission_codes,
        "permissions": [
            {
                "permission_code": item.permission_code,
                "permission_name": item.permission_name,
                "module": item.module,
            }
            for item in permissions
        ],
    }


def create_audit_log(db: Session, payload: AuditLogCreate) -> AuditLog:
    actor = db.query(SysUser).filter_by(username=payload.actor_username).first() if payload.actor_username else None
    log = AuditLog(
        actor_user_id=actor.id if actor else None,
        action=payload.action,
        resource_type=payload.resource_type,
        resource_id=payload.resource_id,
        detail=json.dumps(payload.detail, ensure_ascii=False),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def list_audit_logs(db: Session) -> list[dict[str, Any]]:
    users = {item.id: item for item in db.query(SysUser).all()}
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(50).all()
    return [
        {
            "id": item.id,
            "actor_user_id": item.actor_user_id,
            "actor_name": users[item.actor_user_id].real_name if item.actor_user_id in users else "系统",
            "action": item.action,
            "resource_type": item.resource_type,
            "resource_id": item.resource_id,
            "detail": _parse_json(item.detail),
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in logs
    ]


def list_notifications(db: Session) -> list[dict[str, Any]]:
    users = {item.id: item for item in db.query(SysUser).all()}
    notifications = db.query(Notification).order_by(Notification.created_at.desc(), Notification.id.desc()).limit(50).all()
    return [
        {
            "id": item.id,
            "user_id": item.user_id,
            "receiver_name": users[item.user_id].real_name if item.user_id in users else "全员",
            "target_type": item.target_type,
            "target_id": item.target_id,
            "title": item.title,
            "content": item.content,
            "status": item.status,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in notifications
    ]


def _parse_json(raw: str) -> Any:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw
