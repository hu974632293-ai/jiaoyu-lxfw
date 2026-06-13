# V3 Production Foundation Batch 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 V3 生产级交付的第一批基础：Alembic/MySQL 基线、生产认证、后端 RBAC/数据范围、前端 token 注入、后端 Agent 契约。

**Architecture:** 先固定数据库迁移和身份来源，再让权限、数据范围和 Agent 场景都从同一个用户上下文工作。后端保持 FastAPI 路由薄、业务逻辑进 `services`，前端所有请求继续经过 `frontend/src/api/client.ts`。

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, PyJWT, SQLite/MySQL, React/Vite/TypeScript, pytest, npm.cmd。

---

## 0. 计划边界

本计划只执行批次一，不包含 Dify YAML、具体角色 Agent 前端面板、PDF/Word 导出和部署脚本。

批次一完成后，系统应具备：

1. 空 MySQL 库可以通过 Alembic 建表。
2. 用户通过 `/api/auth/login` 登录，密码使用哈希校验。
3. 前端通过 shared client 自动携带 token，退出和过期处理有统一路径。
4. 关键写接口开始使用后端 RBAC，不能再只依赖前端隐藏入口。
5. 学生、顾问、老师关键对象具备最小数据范围校验。
6. Agent 请求上下文和写操作确认契约稳定，后续 Dify 和前端面板不需要重改接口形态。

## 1. 文件结构

### 后端新增

- `backend/alembic.ini`：Alembic 配置。
- `backend/alembic/env.py`：迁移环境，读取 `app.core.config.settings.database_url`。
- `backend/alembic/script.py.mako`：Alembic revision 模板。
- `backend/alembic/versions/<generated>_baseline.py`：当前模型基线迁移，由命令生成后审阅提交。
- `backend/app/core/security.py`：密码哈希、JWT 创建和解析。
- `backend/app/core/auth.py`：当前用户依赖、token 解析、可选兼容头处理。
- `backend/app/models/auth.py`：认证 session 表，用于 token 过期、退出失效和后续审计关联。
- `backend/app/api/routes_auth.py`：登录、当前用户、退出接口。
- `backend/app/schemas/auth.py`：认证请求和响应 schema。
- `backend/app/services/auth_service.py`：登录校验、密码哈希迁移、session 失效。
- `backend/app/services/scope_service.py`：学生、顾问、老师对象范围校验。
- `backend/tests/test_auth_api.py`：认证接口测试。
- `backend/tests/test_rbac_scope_api.py`：RBAC 和数据范围测试。
- `backend/tests/test_agent_contract_api.py`：Agent 请求上下文和确认契约测试。

### 后端修改

- `backend/requirements.txt`：增加 `alembic`、`pyjwt`。
- `backend/.env.example`：增加 JWT、环境、CORS、MySQL/Alembic 说明。
- `backend/app/core/config.py`：增加 auth、环境和 CORS 配置项。
- `backend/app/core/database.py`：生产模式不再在启动时依赖 `create_all()`；保留 SQLite 本地兼容路径。
- `backend/app/core/permissions.py`：从 token 用户上下文读取操作者；保留测试兼容头。
- `backend/app/main.py`：注册 auth router，健康检查补迁移/配置状态，生产启动不隐式建表。
- `backend/app/models/__init__.py`：导入认证模型，保证 Alembic autogenerate 能识别。
- `backend/app/services/admin_service.py`：默认用户密码从明文演示值迁移为哈希。
- `backend/app/services/lead_service.py`：线索创建支持写入负责人。
- `backend/app/api/routes_leads.py`、`backend/app/api/routes_crm.py`：线索写接口接权限和顾问数据范围。
- `backend/app/api/routes_student_assistant.py`：学生/老师关键接口接权限和数据范围。
- `backend/app/api/routes_knowledge.py`、`backend/app/schemas/knowledge.py`、`backend/app/services/knowledge_service.py`：扩展 Agent 请求上下文。
- `backend/app/services/dify_client.py`：接受 Dify inputs，但本批不实现真实 Dify YAML。
- `backend/app/services/enterprise_service.py`、`backend/app/services/student_assistant_service.py`：聊天写操作改为草稿/确认契约。

### 前端修改

- `frontend/src/api/client.ts`：token 注入、401/403 处理、登录态工具函数。
- `frontend/src/pages/LoginPage.tsx`：调用 `/api/auth/login`，移除生产入口固定密码校验。
- `frontend/src/authRules.ts`：保留角色可见页规则，移除生产登录密码依赖。
- `frontend/src/App.tsx`：登录态来自 token/profile，退出清理 token。

### 文档修改

- `docs/mysql-migration-readiness.md`：升级为 Alembic baseline 流程。
- `docs/superpowers/specs/2026-06-13-agent-requirement-coverage-design.md`：实施后勾选批次一状态。

---

## 2. Task 1：建立当前基线和失败用例

**Files:**
- Modify: `backend/tests/test_api_smoke.py`
- Create: `backend/tests/test_auth_api.py`
- Create: `backend/tests/test_rbac_scope_api.py`
- Create: `backend/tests/test_agent_contract_api.py`

- [ ] **Step 1: 运行当前基线**

Run:

```powershell
cd D:\00_Project\jiaoyu_lxfw\backend
python -m pytest -q
```

Expected: 当前已有测试通过。如果 MySQL 本机状态阻塞，用临时 SQLite 验证：

```powershell
cd D:\00_Project\jiaoyu_lxfw\backend
$env:DATABASE_URL='sqlite:///./app.db'
python -m pytest -q
```

- [ ] **Step 2: 写认证失败测试**

Create `backend/tests/test_auth_api.py`:

```python
from fastapi.testclient import TestClient

from app.core.database import init_db
from app.main import app


init_db()
client = TestClient(app)


def test_login_returns_token_and_profile():
    client.post("/api/demo/seed")
    response = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    assert payload["data"]["access_token"]
    assert payload["data"]["token_type"] == "bearer"
    assert payload["data"]["user"]["username"] == "admin"
    assert payload["data"]["user"]["role"] == "admin"


def test_login_rejects_wrong_password():
    client.post("/api/demo/seed")
    response = client.post("/api/auth/login", json={"username": "admin", "password": "wrong-password"})
    assert response.status_code == 401
    payload = response.json()
    assert payload["code"] != 0
    assert "账号或密码不正确" in payload["msg"]


def test_current_user_requires_token():
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    payload = response.json()
    assert payload["code"] != 0


def test_current_user_accepts_bearer_token():
    client.post("/api/demo/seed")
    login = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"}).json()["data"]
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {login['access_token']}"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    assert payload["data"]["username"] == "admin"


def test_logout_revokes_session_token():
    client.post("/api/demo/seed")
    login = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"}).json()["data"]
    headers = {"Authorization": f"Bearer {login['access_token']}"}
    response = client.post("/api/auth/logout", headers=headers, json={"session_id": login["session_id"]})
    assert response.status_code == 200
    assert response.json()["code"] == 0

    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 401
    assert me.json()["code"] != 0
```

- [ ] **Step 3: 写 RBAC 和数据范围失败测试**

Create `backend/tests/test_rbac_scope_api.py`:

```python
from fastapi.testclient import TestClient

from app.core.database import init_db
from app.main import app


init_db()
client = TestClient(app)


def _token(username: str, password: str) -> str:
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["data"]["access_token"]


def test_student_cannot_approve_leave():
    client.post("/api/demo/seed")
    student_token = _token("student", "student123")
    students = client.get("/api/student-assistant/students", headers={"Authorization": f"Bearer {student_token}"}).json()["data"]
    student_id = students[0]["id"]
    leave = client.post(
        "/api/student-assistant/leaves",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "student_id": student_id,
            "reason": "签证材料递交",
            "start_time": "2026-06-14T09:00:00",
            "end_time": "2026-06-14T18:00:00",
        },
    ).json()["data"]
    response = client.post(
        f"/api/student-assistant/leaves/{leave['id']}/approve",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"status": "已同意", "resolution": "学生不能自审"},
    )
    assert response.status_code == 403
    assert response.json()["code"] != 0


def test_consultant_cannot_update_unowned_lead_status():
    client.post("/api/demo/seed")
    consultant_token = _token("consultant", "consultant123")
    admin_token = _token("admin", "admin123")
    created = client.post(
        "/api/leads",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"customer_name": "范围测试客户", "contact_info": "13900008888", "background_info": "范围测试", "source_channel": "测试"},
    ).json()["data"]
    response = client.patch(
        f"/api/leads/{created['id']}/status",
        headers={"Authorization": f"Bearer {consultant_token}"},
        json={"status": "已签约", "reason": "不应越权"},
    )
    assert response.status_code == 403
    assert response.json()["code"] != 0
```

- [ ] **Step 4: 写 Agent 契约失败测试**

Create `backend/tests/test_agent_contract_api.py`:

```python
from fastapi.testclient import TestClient

from app.core.database import init_db
from app.main import app


init_db()
client = TestClient(app)


def _token(username: str, password: str) -> str:
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["data"]["access_token"]


def test_knowledge_chat_accepts_agent_context_without_breaking_legacy_request():
    client.post("/api/demo/seed")
    token = _token("employee", "employee123")
    response = client.post(
        "/api/knowledge/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "scene": "enterprise_guide",
            "role": "employee",
            "question": "新人第一周需要完成什么？",
            "business_context": {"source": "employee_workspace"},
            "action_mode": "draft",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    assert payload["data"]["scene"] == "enterprise_guide"
    assert payload["data"]["request_context"]["role"] == "employee"
    assert payload["data"]["request_context"]["action_mode"] == "draft"


def test_enterprise_chat_returns_draft_for_write_intent():
    client.post("/api/demo/seed")
    token = _token("employee", "employee123")
    response = client.post(
        "/api/enterprise-assistant/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": "帮我录入一个客户：计划一草稿客户，电话 13900007777"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    assert payload["data"]["intent"] == "create_lead"
    assert payload["data"]["requires_confirmation"] is True
    assert payload["data"]["confirmation_endpoint"] == "/api/leads"
```

- [ ] **Step 5: 运行失败测试**

Run:

```powershell
cd D:\00_Project\jiaoyu_lxfw\backend
python -m pytest tests/test_auth_api.py tests/test_rbac_scope_api.py tests/test_agent_contract_api.py -q
```

Expected: FAIL。失败原因应是 `/api/auth/login` 不存在、token 依赖不存在、Agent 返回契约未实现。

---

## 3. Task 2：Alembic 和生产环境配置基线

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/.env.example`
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/core/database.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`
- Create: `backend/alembic/versions/<generated>_baseline.py`
- Modify: `docs/mysql-migration-readiness.md`
- Test: `backend/tests/test_mysql_readiness_script.py`

- [ ] **Step 1: 增加依赖**

Modify `backend/requirements.txt` by appending:

```text
alembic==1.14.0
pyjwt==2.10.1
```

- [ ] **Step 2: 扩展配置**

Modify `backend/app/core/config.py` so `Settings` includes:

```python
    app_env: str = "development"
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 120
    cors_origins: str = "http://127.0.0.1:5173,http://localhost:5173"
    allow_legacy_actor_header: bool = True
```

- [ ] **Step 3: 更新 `.env.example`**

Modify `backend/.env.example`:

```text
APP_NAME=教育服务业务系统
APP_ENV=development
DATABASE_URL=sqlite:///./app.db
# MySQL 示例：
# DATABASE_URL=mysql+pymysql://用户名:密码@127.0.0.1:3306/jiaoyu_lxfw?charset=utf8mb4
JWT_SECRET_KEY=replace-with-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120
CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
ALLOW_LEGACY_ACTOR_HEADER=true
DIFY_API_BASE=https://example-dify-host/v1
DIFY_API_KEY=replace-with-real-key
DIFY_APP_ID=replace-with-real-app-id
LLM_PROVIDER=rule_only
LLM_API_KEY=
```

- [ ] **Step 4: 创建 Alembic 配置**

Create `backend/alembic.ini`:

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
version_path_separator = os

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

Create `backend/alembic/env.py`:

```python
from __future__ import annotations

import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import settings
from app.core.database import Base
from app.models import assistant, crm, enterprise, event, knowledge, lead, operation, permission, project, report, student, user  # noqa: F401,E501

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

Create `backend/alembic/script.py.mako`:

```python
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}
"""

from alembic import op
import sqlalchemy as sa

${imports if imports else ""}

revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

- [ ] **Step 5: 调整启动建表边界**

Modify `backend/app/core/database.py`:

```python
def init_db():
    from app.models import (  # noqa: F401
        assistant,
        crm,
        enterprise,
        event,
        knowledge,
        lead,
        operation,
        permission,
        project,
        report,
        student,
        user,
    )

    if settings.app_env != "production":
        Base.metadata.create_all(bind=engine)
        _ensure_sqlite_compatible_columns()
        _ensure_crm_lead_compatible_columns()
        _ensure_student_grade_compatible_columns()
        _ensure_enterprise_compatible_columns()
```

Production 数据库必须通过 Alembic 初始化。

- [ ] **Step 6: 生成 baseline revision**

Run:

```powershell
cd D:\00_Project\jiaoyu_lxfw\backend
python -m alembic revision --autogenerate -m "baseline schema"
```

Expected: `backend/alembic/versions/<generated>_baseline_schema.py` created.

Open the generated file and verify it contains `create_table` operations for current models. Keep generated code as Alembic produced it, only remove SQLite-specific accidental defaults if Alembic emits invalid MySQL syntax.

- [ ] **Step 7: 验证 SQLite 迁移配置可加载**

Run:

```powershell
cd D:\00_Project\jiaoyu_lxfw\backend
python -m alembic current
```

Expected: command exits 0. If SQLite app.db has no version table, output may be empty; that is acceptable before upgrade.

- [ ] **Step 8: 更新迁移文档**

Modify `docs/mysql-migration-readiness.md` to state:

```markdown
生产建表以 Alembic 为准。`init_db()` 仅保留本地开发、SQLite 兼容和测试初始化用途；MySQL 空库验收使用 `python -m alembic upgrade head`。
```

- [ ] **Step 9: 运行聚焦验证**

Run:

```powershell
cd D:\00_Project\jiaoyu_lxfw\backend
python -m pytest tests/test_mysql_readiness_script.py -q
```

Expected: PASS.

- [ ] **Step 10: 提交**

```powershell
git add backend/requirements.txt backend/.env.example backend/app/core/config.py backend/app/core/database.py backend/alembic.ini backend/alembic docs/mysql-migration-readiness.md backend/tests/test_mysql_readiness_script.py
git commit -m "chore: 建立Alembic迁移基线"
```

---

## 4. Task 3：认证核心和登录接口

**Files:**
- Create: `backend/app/core/security.py`
- Create: `backend/app/core/auth.py`
- Create: `backend/app/models/auth.py`
- Create: `backend/app/schemas/auth.py`
- Create: `backend/app/services/auth_service.py`
- Create: `backend/app/api/routes_auth.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/services/admin_service.py`
- Create: `backend/alembic/versions/<generated>_add_auth_sessions.py`
- Test: `backend/tests/test_auth_api.py`

- [ ] **Step 1: 创建安全工具**

Create `backend/app/core/security.py`:

```python
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from app.core.config import settings

PASSWORD_PREFIX = "pbkdf2_sha256"


def hash_password(password: str, salt: str | None = None) -> str:
    password_salt = salt or base64.urlsafe_b64encode(os.urandom(16)).decode("ascii")
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), password_salt.encode("utf-8"), 120_000)
    encoded = base64.urlsafe_b64encode(digest).decode("ascii")
    return f"{PASSWORD_PREFIX}${password_salt}${encoded}"


def verify_password(password: str, password_hash: str) -> bool:
    if not password_hash.startswith(f"{PASSWORD_PREFIX}$"):
        return hmac.compare_digest(password_hash, password)
    _, salt, expected = password_hash.split("$", 2)
    actual = hash_password(password, salt).split("$", 2)[2]
    return hmac.compare_digest(actual, expected)


def create_access_token(subject: str, role: str, user_id: int) -> tuple[str, str, datetime]:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.access_token_expire_minutes)
    jti = str(uuid.uuid4())
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "user_id": user_id,
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, jti, expires_at


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
```

- [ ] **Step 2: 创建认证 schema**

Create `backend/app/schemas/auth.py`:

```python
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class LogoutRequest(BaseModel):
    session_id: str | None = None
    reason: str = ""
```

- [ ] **Step 3: 创建可吊销 session 模型**

Create `backend/app/models/auth.py`:

```python
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AuthSession(Base):
    __tablename__ = "auth_session"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    jti: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("sys_user.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    revoke_reason: Mapped[str] = mapped_column(String(200), default="")
```

Modify `backend/app/models/__init__.py` to import `app.models.auth` with the existing model imports.

Run:

```powershell
cd D:\00_Project\jiaoyu_lxfw\backend
python -m alembic revision --autogenerate -m "add auth sessions"
```

Open the generated migration and verify it creates `auth_session` with `jti` unique index and `user_id` index.

- [ ] **Step 4: 创建 auth service**

Create `backend/app/services/auth_service.py`:

```python
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.auth import AuthSession
from app.models.user import SysUser
from app.services.admin_service import ensure_default_admin_data


DEMO_PASSWORDS = {
    "admin": "admin123",
    "manager": "manager123",
    "consultant": "consultant123",
    "employee": "employee123",
    "teacher": "teacher123",
    "student": "student123",
    "test": "test123",
}


def ensure_password_hashes(db: Session) -> None:
    ensure_default_admin_data(db)
    changed = False
    for username, password in DEMO_PASSWORDS.items():
        user = db.query(SysUser).filter_by(username=username).first()
        if user and not user.password_hash.startswith("pbkdf2_sha256$"):
            user.password_hash = hash_password(password)
            changed = True
    if changed:
        db.commit()


def authenticate_user(db: Session, username: str, password: str) -> SysUser | None:
    ensure_password_hashes(db)
    user = db.query(SysUser).filter_by(username=username.strip()).first()
    if not user or user.status not in {"正常", "启用"}:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def login(db: Session, username: str, password: str) -> dict:
    user = authenticate_user(db, username, password)
    if not user:
        raise ValueError("账号或密码不正确")
    token, jti, expires_at = create_access_token(user.username, user.role, user.id)
    db.add(AuthSession(jti=jti, user_id=user.id, expires_at=expires_at.replace(tzinfo=None)))
    db.commit()
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_at": expires_at.isoformat(),
        "session_id": jti,
        "user": serialize_auth_user(user),
    }


def is_session_active(db: Session, jti: str, user_id: int) -> bool:
    session = db.query(AuthSession).filter_by(jti=jti, user_id=user_id).first()
    if not session or session.revoked_at is not None:
        return False
    return session.expires_at > datetime.now(timezone.utc).replace(tzinfo=None)


def revoke_session(db: Session, jti: str, user_id: int, reason: str = "") -> None:
    session = db.query(AuthSession).filter_by(jti=jti, user_id=user_id).first()
    if not session:
        return
    session.revoked_at = datetime.now(timezone.utc).replace(tzinfo=None)
    session.revoke_reason = reason[:200]
    db.commit()


def serialize_auth_user(user: SysUser) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "real_name": user.real_name,
        "role": user.role,
        "user_type": user.user_type,
        "status": user.status,
    }
```

- [ ] **Step 5: 创建当前用户依赖**

Create `backend/app/core/auth.py`:

```python
from __future__ import annotations

from fastapi import Depends, Header
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import SysUser
from app.services.auth_service import is_session_active


class AuthenticationError(Exception):
    pass


def get_current_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> SysUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AuthenticationError()
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_access_token(token)
    except InvalidTokenError as exc:
        raise AuthenticationError() from exc
    username = str(payload.get("sub") or "")
    user_id = int(payload.get("user_id") or 0)
    jti = str(payload.get("jti") or "")
    user = db.query(SysUser).filter_by(username=username).first()
    if not user or user.id != user_id or user.status not in {"正常", "启用"}:
        raise AuthenticationError()
    if not jti or not is_session_active(db, jti, user.id):
        raise AuthenticationError()
    return user
```

- [ ] **Step 6: 创建 auth routes**

Create `backend/app/api/routes_auth.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.response import fail, ok
from app.models.user import SysUser
from app.schemas.auth import LoginRequest, LogoutRequest
from app.services.auth_service import login, revoke_session, serialize_auth_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
def login_route(payload: LoginRequest, db: Session = Depends(get_db)):
    try:
        return ok(login(db, payload.username, payload.password))
    except ValueError as exc:
        return fail(str(exc), 40101)


@router.get("/me")
def me(current_user: SysUser = Depends(get_current_user)):
    return ok(serialize_auth_user(current_user))


@router.post("/logout")
def logout(payload: LogoutRequest, current_user: SysUser = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.session_id:
        revoke_session(db, payload.session_id, current_user.id, payload.reason or "用户退出")
    return ok({"status": "logged_out"})
```

- [ ] **Step 7: 注册 router 和异常**

Modify `backend/app/main.py`:

```python
from app.api import routes_auth, ...
from app.core.auth import AuthenticationError


@app.exception_handler(AuthenticationError)
async def authentication_error_handler(_request, _exc: AuthenticationError):
    return JSONResponse(status_code=401, content=fail("请先登录", 40100))


app.include_router(routes_auth.router)
```

Place `app.include_router(routes_auth.router)` before protected business routers.

- [ ] **Step 8: 运行认证测试**

Run:

```powershell
cd D:\00_Project\jiaoyu_lxfw\backend
python -m pytest tests/test_auth_api.py -q
```

Expected: PASS.

- [ ] **Step 9: 提交**

```powershell
git add backend/app/core/security.py backend/app/core/auth.py backend/app/models/auth.py backend/app/models/__init__.py backend/app/schemas/auth.py backend/app/services/auth_service.py backend/app/api/routes_auth.py backend/app/main.py backend/app/services/admin_service.py backend/alembic/versions backend/tests/test_auth_api.py
git commit -m "feat: 添加生产登录认证基础"
```

---

## 5. Task 4：RBAC 和数据范围

**Files:**
- Modify: `backend/app/core/permissions.py`
- Create: `backend/app/services/scope_service.py`
- Modify: `backend/app/services/lead_service.py`
- Modify: `backend/app/api/routes_leads.py`
- Modify: `backend/app/api/routes_crm.py`
- Modify: `backend/app/api/routes_student_assistant.py`
- Test: `backend/tests/test_rbac_scope_api.py`

- [ ] **Step 1: 改造 permission dependency**

Modify `backend/app/core/permissions.py` so `require_permission()` uses `get_current_user`:

```python
from app.core.auth import get_current_user
from app.models.user import SysUser


def require_permission(permission_code: str) -> Callable[..., SysUser]:
    def dependency(
        current_user: SysUser = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> SysUser:
        ensure_default_admin_data(db)
        if not user_has_permission(db, current_user.username, permission_code):
            raise PermissionDeniedError(permission_code)
        return current_user

    return dependency
```

- [ ] **Step 2: 新增数据范围服务**

Create `backend/app/services/scope_service.py`:

```python
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.lead import CrmLead
from app.models.student import StudentProfile
from app.models.user import SysUser


class DataScopeError(Exception):
    pass


def ensure_can_access_lead(db: Session, user: SysUser, lead_id: int) -> CrmLead:
    lead = db.query(CrmLead).filter_by(id=lead_id).first()
    if not lead:
        raise ValueError("客户不存在")
    if user.role in {"admin", "manager"}:
        return lead
    if user.role == "consultant" and lead.owner_id == user.id:
        return lead
    raise DataScopeError()


def ensure_can_access_student(db: Session, user: SysUser, student_id: int) -> StudentProfile:
    student = db.query(StudentProfile).filter_by(id=student_id).first()
    if not student:
        raise ValueError("学生不存在")
    if user.role in {"admin", "manager"}:
        return student
    if user.role == "teacher" and student.advisor_user_id == user.id:
        return student
    if user.role == "student" and student.contact_info in {user.username, f"{user.username}@example.com"}:
        return student
    raise DataScopeError()
```

- [ ] **Step 3: 让 lead service 支持负责人写入**

Modify `backend/app/services/lead_service.py`:

```python
def create_lead(db: Session, payload: LeadCreate, owner_id: int | None = None):
    lead_data = payload.model_dump()
    if owner_id is not None:
        lead_data["owner_id"] = owner_id
    lead = CrmLead(**lead_data)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead
```

- [ ] **Step 4: 为 lead 写接口接权限和数据范围**

Modify `backend/app/api/routes_leads.py`:

```python
from app.core.permissions import require_permission
from app.models.user import SysUser
from app.services.scope_service import DataScopeError, ensure_can_access_lead


@router.post("")
def create(
    payload: LeadCreate,
    current_user: SysUser = Depends(require_permission("crm:lead:write")),
    db: Session = Depends(get_db),
):
    lead = create_lead(db, payload, owner_id=current_user.id)
    return ok({"id": lead.id})
```

For `PATCH /{lead_id}/status`, call `ensure_can_access_lead(db, current_user, lead_id)` before update. Return `fail("无权操作该客户", 40301)` for `DataScopeError`.

- [ ] **Step 5: 为学生关键接口接权限和范围**

Modify `backend/app/api/routes_student_assistant.py`:

```python
from app.core.permissions import require_permission
from app.models.user import SysUser
from app.services.scope_service import DataScopeError, ensure_can_access_student
```

Apply:

- Student create/read own leave/feedback/grades/progress: `assistant:student:use` + `ensure_can_access_student`.
- Teacher approve/handle/grade: `student:leave:approve` or `assistant:student:use` + target student's advisor check.
- Teacher task list: `student:leave:approve`.

- [ ] **Step 6: 保持统一错误 envelope**

In routes catching `DataScopeError`, return:

```python
return fail("无权访问该业务对象", 40301)
```

Status should be 403 when route returns `JSONResponse`; if using plain `fail`, keep existing route behavior only if tests assert `code != 0`. Prefer FastAPI `JSONResponse` for new protected paths.

- [ ] **Step 7: 运行 RBAC 测试**

Run:

```powershell
cd D:\00_Project\jiaoyu_lxfw\backend
python -m pytest tests/test_rbac_scope_api.py -q
```

Expected: PASS.

- [ ] **Step 8: 提交**

```powershell
git add backend/app/core/permissions.py backend/app/services/scope_service.py backend/app/services/lead_service.py backend/app/api/routes_leads.py backend/app/api/routes_crm.py backend/app/api/routes_student_assistant.py backend/tests/test_rbac_scope_api.py
git commit -m "feat: 加固RBAC和数据范围"
```

---

## 6. Task 5：前端 token 注入和登录接入

**Files:**
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/pages/LoginPage.tsx`
- Modify: `frontend/src/authRules.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: 扩展 shared API client**

Modify `frontend/src/api/client.ts`:

```ts
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";
const TOKEN_KEY = "jiaoyu_lxfw_access_token";

export function getAccessToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const payload = await response.json();
  if (response.status === 401) {
    clearAccessToken();
  }
  if (payload.code !== 0) {
    throw new Error(payload.msg || "请求失败");
  }
  return payload.data as T;
}
```

- [ ] **Step 2: LoginPage 调用后端登录**

Modify `frontend/src/pages/LoginPage.tsx` so `handleSubmit` is async:

```tsx
import { apiRequest, setAccessToken } from "../api/client";

type LoginResult = {
  access_token: string;
  user: {
    username: string;
    role: LoginAccountProfile["role"];
    real_name: string;
  };
};

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setError("");
  try {
    const result = await apiRequest<LoginResult>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setAccessToken(result.access_token);
    const account = Object.values(loginAccounts).find((item) => item.username === result.user.username || item.role === result.user.role);
    onLogin(account?.key ?? "employee");
  } catch (error) {
    setError(error instanceof Error ? error.message : "账号或密码不正确，请检查后再登录。");
  }
}
```

Keep shortcut fill buttons only as demo convenience; remove any wording that fixed passwords are production credentials.

- [ ] **Step 3: App 退出清理 token**

Modify `frontend/src/App.tsx` logout handler:

```tsx
import { clearAccessToken } from "./api/client";

function handleLogout() {
  clearAccessToken();
  setAccountKey(null);
}
```

- [ ] **Step 4: 构建验证**

Run:

```powershell
cd D:\00_Project\jiaoyu_lxfw\frontend
npm.cmd run build
```

Expected: PASS.

- [ ] **Step 5: 提交**

```powershell
git add frontend/src/api/client.ts frontend/src/pages/LoginPage.tsx frontend/src/authRules.ts frontend/src/App.tsx
git commit -m "feat: 前端接入登录token"
```

---

## 7. Task 6：后端 Agent 契约底座

**Files:**
- Modify: `backend/app/schemas/knowledge.py`
- Modify: `backend/app/services/dify_client.py`
- Modify: `backend/app/services/knowledge_service.py`
- Modify: `backend/app/api/routes_knowledge.py`
- Modify: `backend/app/schemas/enterprise.py`
- Modify: `backend/app/services/enterprise_service.py`
- Modify: `backend/app/schemas/student_assistant.py`
- Modify: `backend/app/services/student_assistant_service.py`
- Test: `backend/tests/test_agent_contract_api.py`

- [ ] **Step 1: 扩展 KnowledgeChatRequest**

Modify `backend/app/schemas/knowledge.py`:

```python
from typing import Any, Literal

from pydantic import BaseModel, Field


class KnowledgeChatRequest(BaseModel):
    question: str
    scene: str = "customer_service"
    role: str = "public"
    actor_username: str | None = None
    lead_id: int | None = None
    student_id: int | None = None
    conversation_id: str | None = None
    business_context: dict[str, Any] = Field(default_factory=dict)
    action_mode: Literal["answer", "draft", "confirm"] = "answer"
```

- [ ] **Step 2: Dify client 接收 inputs**

Modify `backend/app/services/dify_client.py`:

```python
async def chat(self, question: str, conversation_id: str | None = None, inputs: dict | None = None, user: str = "anonymous"):
    ...
    payload = {
        "inputs": inputs or {},
        "query": question,
        "response_mode": "blocking",
        "conversation_id": conversation_id,
        "user": user,
    }
```

- [ ] **Step 3: Knowledge service 返回 request_context**

Modify `ask_knowledge()` signature and return:

```python
async def ask_knowledge(db: Session, payload: KnowledgeChatRequest) -> dict[str, Any]:
    request_context = {
        "scene": payload.scene,
        "role": payload.role,
        "lead_id": payload.lead_id,
        "student_id": payload.student_id,
        "business_context": payload.business_context,
        "action_mode": payload.action_mode,
    }
    result = await client.chat(
        payload.question,
        conversation_id=payload.conversation_id,
        inputs=request_context,
        user=payload.actor_username or payload.role or "anonymous",
    )
    ...
    return {
        ...
        "request_context": request_context,
    }
```

- [ ] **Step 4: routes_knowledge 改为传 payload**

Modify `backend/app/api/routes_knowledge.py`:

```python
@router.post("/chat")
async def chat(payload: KnowledgeChatRequest, db: Session = Depends(get_db)):
    result = await ask_knowledge(db, payload)
    return ok(result)
```

- [ ] **Step 5: 企业聊天写意图改为草稿**

Modify `backend/app/services/enterprise_service.py`:

For `create_lead` intent, do not call `_create_lead_from_message`. Return:

```python
result = {
    "draft": {
        "customer_name": _extract_customer_name(message),
        "contact_info": _extract_phone(message),
        "background_info": message,
        "source_channel": "企业助手",
    },
    "requires_confirmation": True,
    "confirmation_endpoint": "/api/leads",
    "action_type": "create_lead",
}
answer = "已生成客户录入草稿，请确认后写入客户列表。"
status = "draft"
```

Top-level response must include:

```python
"requires_confirmation": result.get("requires_confirmation", False),
"confirmation_endpoint": result.get("confirmation_endpoint", ""),
"action_type": result.get("action_type", ""),
```

- [ ] **Step 6: 学生聊天写意图改为草稿**

Modify `backend/app/services/student_assistant_service.py`:

For `leave_request`, do not create leave directly in chat. Return draft:

```python
result = {
    "draft": {
        "student_id": student.id,
        "reason": message,
        "start_time": _extract_leave_time(message)[0].isoformat(),
        "end_time": _extract_leave_time(message)[1].isoformat(),
    },
    "requires_confirmation": True,
    "confirmation_endpoint": "/api/student-assistant/leaves",
    "action_type": "create_leave",
}
answer = "已生成请假草稿，请确认后提交给老师审批。"
```

Psych risk alerts may still create alert records only if `action_mode == "confirm"` is later introduced. In this batch, keep existing psych behavior unchanged to avoid safety regression.

- [ ] **Step 7: 运行 Agent 契约测试**

Run:

```powershell
cd D:\00_Project\jiaoyu_lxfw\backend
python -m pytest tests/test_agent_contract_api.py -q
```

Expected: PASS.

- [ ] **Step 8: 提交**

```powershell
git add backend/app/schemas/knowledge.py backend/app/services/dify_client.py backend/app/services/knowledge_service.py backend/app/api/routes_knowledge.py backend/app/schemas/enterprise.py backend/app/services/enterprise_service.py backend/app/schemas/student_assistant.py backend/app/services/student_assistant_service.py backend/tests/test_agent_contract_api.py
git commit -m "feat: 稳定Agent后端契约"
```

---

## 8. Task 7：批次一总体验证和文档收口

**Files:**
- Modify: `docs/superpowers/specs/2026-06-13-agent-requirement-coverage-design.md`
- Modify: `docs/mysql-migration-readiness.md`

- [ ] **Step 1: 运行后端全量测试**

Run:

```powershell
cd D:\00_Project\jiaoyu_lxfw\backend
python -m pytest -v
```

Expected: PASS.

- [ ] **Step 2: 运行前端构建**

Run:

```powershell
cd D:\00_Project\jiaoyu_lxfw\frontend
npm.cmd run build
```

Expected: PASS.

- [ ] **Step 3: 运行 Alembic 基础检查**

Run:

```powershell
cd D:\00_Project\jiaoyu_lxfw\backend
python -m alembic current
python -m alembic heads
```

Expected: both commands exit 0 and show one head revision.

- [ ] **Step 4: 更新设计文档状态**

Modify `docs/superpowers/specs/2026-06-13-agent-requirement-coverage-design.md` in section `6.1 第一批` to append:

```markdown
批次一完成状态：认证、RBAC、数据范围、Alembic baseline 和 Agent 后端契约已具备实现基础；后续进入 Dify YAML 和客服/新人指南接入。
```

- [ ] **Step 5: 最终提交**

```powershell
git add docs/superpowers/specs/2026-06-13-agent-requirement-coverage-design.md docs/mysql-migration-readiness.md
git commit -m "docs: 标记V3批次一完成状态"
```

---

## 9. 自检清单

执行本计划时，每个任务结束必须确认：

1. 所有 API 仍返回 `{ code, msg, data }`。
2. 前端请求仍走 `frontend/src/api/client.ts`。
3. 普通业务页面不出现“真实 API”“fallback”“seed”“OpenAPI”“V2/V3”等实现话术。
4. 旧 demo 链路没有被认证改造破坏；需要登录的链路应通过 token 正常访问。
5. SQLite 验证和 MySQL/Alembic 验证分开记录。
6. 每个任务只提交本任务相关文件。

## 10. 执行选项

Plan complete and saved to `docs/superpowers/plans/2026-06-13-v3-production-foundation-batch1.md`. Two execution options:

1. **Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - execute tasks in this session using executing-plans, batch execution with checkpoints.
