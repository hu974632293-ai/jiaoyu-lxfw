# 客户增长闭环 Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 3 天内交付一个可演示、可解释、可扩展的教育服务客户增长闭环 demo。

**Architecture:** 采用 FastAPI + SQLAlchemy 提供后端 API 和数据持久化，React/Vite 提供技术演示工作台，Dify 负责知识库问答，规则引擎和模板报告提供稳定兜底。系统只打穿客户增长主链路，企业助手和学生助手作为二期扩展在文档中说明。

**Tech Stack:** FastAPI, SQLAlchemy, SQLite, Pydantic, React, Vite, TypeScript, Dify API, npm, pytest。

---

## 文件结构

本计划以 `D:\00_Project\jiaoyu_lxfw` 为项目根目录。

创建或维护以下目录：

```text
backend/
  app/
    __init__.py
    main.py
    core/
      config.py
      response.py
      database.py
    models/
      base.py
      user.py
      lead.py
      project.py
      event.py
      knowledge.py
      report.py
    schemas/
      lead.py
      profile.py
      project.py
      event.py
      knowledge.py
      report.py
    services/
      lead_service.py
      profile_rules.py
      dify_client.py
      knowledge_service.py
      report_service.py
      seed_service.py
    api/
      routes_leads.py
      routes_profile.py
      routes_knowledge.py
      routes_projects.py
      routes_events.py
      routes_reports.py
      routes_demo.py
  tests/
    test_profile_rules.py
    test_api_smoke.py
  requirements.txt
  .env.example
frontend/
  package.json
  index.html
  src/
    main.tsx
    App.tsx
    api/
      client.ts
    pages/
      DashboardPage.tsx
      AssessmentPage.tsx
      ChatPage.tsx
      LeadsPage.tsx
      EventsPage.tsx
      ReportsPage.tsx
    styles.css
data/
  demo/
    leads.json
    projects.json
    events.json
docs/
  superpowers/
    specs/
      2026-06-09-customer-growth-demo-design.md
    plans/
      2026-06-09-customer-growth-demo.md
```

目录职责：

- `backend/app/core`：配置、数据库、统一响应。
- `backend/app/models`：SQLAlchemy 数据模型。
- `backend/app/schemas`：Pydantic 请求/响应结构。
- `backend/app/services`：业务逻辑、Dify 调用、规则引擎、报告生成。
- `backend/app/api`：FastAPI 路由层，只做参数接收和服务调用。
- `frontend/src/api`：前端请求封装，统一处理 `{ code, msg, data }`。
- `frontend/src/pages`：演示工作台页面。
- `data/demo`：演示数据，其他成员可维护。

---

### Task 1: 初始化仓库和项目骨架

**Files:**
- Create: `AGENTS.md`
- Create: `.gitignore`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `frontend/package.json`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/styles.css`

- [ ] **Step 1: 初始化 Git 仓库**

Run:

```powershell
git init
```

Expected:

```text
Initialized empty Git repository
```

- [ ] **Step 2: 创建项目规则文件**

Create `AGENTS.md`:

```markdown
**语言设定：请使用简体中文回答所有问题，代码注释用中文，技术术语可保留 English。**

# 项目开发规则

1. 三天 demo 只打穿客户增长闭环。
2. 企业助手、学生助手作为二期扩展，不进入当前页面开发。
3. 后端采用 FastAPI + SQLAlchemy，接口统一返回 `{ code, msg, data }`。
4. 前端采用 React/Vite/TypeScript，定位为技术演示工作台。
5. 知识库问答统一调用 Dify。
6. 客户画像研判使用规则引擎兜底，真实大模型作为增强。
7. 代码改动后必须运行对应验证命令。
8. 如果当前工作区是 Git 仓库，每次代码改动完成后提交中文 commit。
```

- [ ] **Step 3: 创建 `.gitignore`**

Create `.gitignore`:

```gitignore
.venv/
__pycache__/
*.pyc
.env
backend/app.db
node_modules/
dist/
.superpowers/
```

- [ ] **Step 4: 创建后端依赖文件**

Create `backend/requirements.txt`:

```text
fastapi==0.115.6
uvicorn[standard]==0.32.1
sqlalchemy==2.0.36
pydantic-settings==2.6.1
python-dotenv==1.0.1
httpx==0.28.1
pytest==8.3.4
```

- [ ] **Step 5: 创建后端环境变量示例**

Create `backend/.env.example`:

```env
APP_NAME=教育服务客户增长闭环 Demo
DATABASE_URL=sqlite:///./app.db
DIFY_API_BASE=https://example-dify-host/v1
DIFY_API_KEY=replace-with-real-key
DIFY_APP_ID=replace-with-real-app-id
LLM_PROVIDER=rule_only
LLM_API_KEY=
```

- [ ] **Step 6: 创建 FastAPI 入口**

Create `backend/app/main.py`:

```python
from fastapi import FastAPI

app = FastAPI(title="教育服务客户增长闭环 Demo")


@app.get("/health")
def health_check():
    return {"code": 0, "msg": "success", "data": {"status": "ok"}}
```

- [ ] **Step 7: 创建前端 package**

Create `frontend/package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.0.3",
    "typescript": "^5.7.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.468.0"
  },
  "devDependencies": {}
}
```

- [ ] **Step 8: 创建前端入口**

Create `frontend/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>教育服务客户增长闭环 Demo</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `frontend/src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Create `frontend/src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="app-shell">
      <h1>教育服务客户增长闭环 Demo</h1>
      <p>项目骨架已启动。</p>
    </main>
  );
}
```

Create `frontend/src/styles.css`:

```css
body {
  margin: 0;
  font-family: "Microsoft YaHei", "Segoe UI", sans-serif;
  background: #f7f8fb;
  color: #172033;
}

.app-shell {
  max-width: 1120px;
  margin: 0 auto;
  padding: 32px;
}
```

- [ ] **Step 9: 验证后端健康检查**

Run:

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Expected:

```text
Uvicorn running on http://127.0.0.1:8000
```

Open:

```text
http://127.0.0.1:8000/health
```

Expected JSON:

```json
{"code":0,"msg":"success","data":{"status":"ok"}}
```

- [ ] **Step 10: 验证前端构建**

Run:

```powershell
cd frontend
npm install
npm run build
```

Expected:

```text
✓ built
```

- [ ] **Step 11: Commit**

Run:

```powershell
git add AGENTS.md .gitignore backend frontend docs
git commit -m "初始化客户增长闭环项目骨架"
```

---

### Task 2: 后端核心配置、数据库和统一响应

**Files:**
- Create: `backend/app/core/config.py`
- Create: `backend/app/core/response.py`
- Create: `backend/app/core/database.py`
- Create: `backend/app/models/base.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: 创建配置模块**

Create `backend/app/core/config.py`:

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "教育服务客户增长闭环 Demo"
    database_url: str = "sqlite:///./app.db"
    dify_api_base: str = ""
    dify_api_key: str = ""
    dify_app_id: str = ""
    llm_provider: str = "rule_only"
    llm_api_key: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
```

- [ ] **Step 2: 创建统一响应工具**

Create `backend/app/core/response.py`:

```python
def ok(data=None, msg: str = "success"):
    return {"code": 0, "msg": msg, "data": data}


def fail(msg: str, code: int = 40000, data=None):
    return {"code": code, "msg": msg, "data": data}
```

- [ ] **Step 3: 创建数据库模块**

Create `backend/app/core/database.py`:

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.models import user, lead, project, event, knowledge, report  # noqa: F401

    Base.metadata.create_all(bind=engine)
```

- [ ] **Step 4: 创建模型包出口**

Create `backend/app/models/base.py`:

```python
from app.core.database import Base

__all__ = ["Base"]
```

Create `backend/app/models/__init__.py`:

```python
from app.models.user import SysUser
from app.models.lead import CrmLead, LeadProfileAssessment
from app.models.project import CourseProject
from app.models.event import EventLecture, EventRegistration
from app.models.knowledge import KnowledgeChatLog
from app.models.report import ReportSnapshot

__all__ = [
    "SysUser",
    "CrmLead",
    "LeadProfileAssessment",
    "CourseProject",
    "EventLecture",
    "EventRegistration",
    "KnowledgeChatLog",
    "ReportSnapshot",
]
```

- [ ] **Step 5: 更新 FastAPI 生命周期**

Modify `backend/app/main.py`:

```python
from fastapi import FastAPI

from app.core.config import settings
from app.core.database import init_db
from app.core.response import ok

app = FastAPI(title=settings.app_name)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health_check():
    return ok({"status": "ok"})
```

- [ ] **Step 6: 验证启动**

Run:

```powershell
cd backend
python -m uvicorn app.main:app
```

Expected:

```text
Application startup complete.
```

- [ ] **Step 7: Commit**

Run:

```powershell
git add backend/app
git commit -m "添加后端配置数据库和统一响应"
```

---

### Task 3: 创建客户增长闭环数据模型

**Files:**
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/lead.py`
- Create: `backend/app/models/project.py`
- Create: `backend/app/models/event.py`
- Create: `backend/app/models/knowledge.py`
- Create: `backend/app/models/report.py`

- [ ] **Step 1: 创建用户模型**

Create `backend/app/models/user.py`:

```python
from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SysUser(Base):
    __tablename__ = "sys_user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    real_name: Mapped[str] = mapped_column(String(64), nullable=False)
    user_type: Mapped[str] = mapped_column(String(32), nullable=False, default="EMPLOYEE")
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="staff")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="正常")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

- [ ] **Step 2: 创建线索和画像模型**

Create `backend/app/models/lead.py`:

```python
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CrmLead(Base):
    __tablename__ = "crm_lead"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_name: Mapped[str] = mapped_column(String(64), nullable=False)
    contact_info: Mapped[str | None] = mapped_column(String(255))
    background_info: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="新增意向")
    owner_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("sys_user.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LeadProfileAssessment(Base):
    __tablename__ = "lead_profile_assessment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    lead_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("crm_lead.id"))
    source_type: Mapped[str] = mapped_column(String(32), default="text")
    raw_input: Mapped[str] = mapped_column(Text, nullable=False)
    extracted_profile: Mapped[str] = mapped_column(Text, nullable=False)
    singapore_score: Mapped[float] = mapped_column(Float, default=0)
    germany_score: Mapped[float] = mapped_column(Float, default=0)
    matched_project: Mapped[str] = mapped_column(String(128), default="")
    reasons: Mapped[str] = mapped_column(Text, default="[]")
    missing_fields: Mapped[str] = mapped_column(Text, default="[]")
    suggested_actions: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 3: 创建项目模型**

Create `backend/app/models/project.py`:

```python
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CourseProject(Base):
    __tablename__ = "course_project"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_name: Mapped[str] = mapped_column(String(128), nullable=False)
    country: Mapped[str] = mapped_column(String(32), nullable=False)
    category: Mapped[str] = mapped_column(String(64), default="")
    target_audience: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    selling_points: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

- [ ] **Step 4: 创建活动模型**

Create `backend/app/models/event.py`:

```python
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class EventLecture(Base):
    __tablename__ = "event_lecture"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_name: Mapped[str] = mapped_column(String(128), nullable=False)
    event_type: Mapped[str] = mapped_column(String(32), default="线上")
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    location: Mapped[str] = mapped_column(String(255), default="")
    max_participants: Mapped[int] = mapped_column(Integer, default=100)
    current_participants: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EventRegistration(Base):
    __tablename__ = "event_registration"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("event_lecture.id"), nullable=False)
    lead_id: Mapped[int] = mapped_column(Integer, ForeignKey("crm_lead.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="已报名")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 5: 创建知识问答模型**

Create `backend/app/models/knowledge.py`:

```python
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class KnowledgeChatLog(Base):
    __tablename__ = "knowledge_chat_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    lead_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("crm_lead.id"))
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, default="")
    citations: Mapped[str] = mapped_column(Text, default="[]")
    dify_conversation_id: Mapped[str] = mapped_column(String(128), default="")
    status: Mapped[str] = mapped_column(String(32), default="success")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 6: 创建报告模型**

Create `backend/app/models/report.py`:

```python
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ReportSnapshot(Base):
    __tablename__ = "report_snapshot"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_type: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    period_start: Mapped[date | None] = mapped_column(Date)
    period_end: Mapped[date | None] = mapped_column(Date)
    content_json: Mapped[str] = mapped_column(Text, nullable=False)
    generated_by: Mapped[str] = mapped_column(String(64), default="system")
    generation_mode: Mapped[str] = mapped_column(String(32), default="template")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 7: 验证数据库表创建**

Run:

```powershell
cd backend
python -c "from app.core.database import init_db; init_db(); print('db ok')"
```

Expected:

```text
db ok
```

- [ ] **Step 8: Commit**

Run:

```powershell
git add backend/app/models backend/app/core/database.py
git commit -m "添加客户增长闭环数据模型"
```

---

### Task 4: 演示数据与 seed 服务

**Files:**
- Create: `data/demo/projects.json`
- Create: `data/demo/events.json`
- Create: `data/demo/leads.json`
- Create: `backend/app/services/seed_service.py`
- Create: `backend/app/api/routes_demo.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: 创建项目演示数据**

Create `data/demo/projects.json`:

```json
[
  {
    "project_name": "新加坡国际本硕升学计划",
    "country": "新加坡",
    "category": "升学规划",
    "target_audience": "初中毕业生、高中毕业生、中职中技学生、专科或本科升学人群",
    "description": "面向有升学、就业和国际化学历需求的学生，提供 2+2、0.5/1+2、本硕连读等路径。",
    "selling_points": ["入学门槛相对低", "学制短", "留学费用低", "就业前景广", "学历可认证"]
  },
  {
    "project_name": "中德精英人才共建计划",
    "country": "德国",
    "category": "职业教育",
    "target_audience": "18-35 岁，高中及以上学历，有就业、职业培训或移民意向的人群",
    "description": "基于德国双元制职业教育，提供语言培训、企业匹配、赴德职业培训和就业路径。",
    "selling_points": ["免学费", "职业培训津贴", "保就业", "可升学", "可申请永居"]
  }
]
```

- [ ] **Step 2: 创建活动演示数据**

Create `data/demo/events.json`:

```json
[
  {
    "event_name": "新加坡升学路径线上说明会",
    "event_type": "线上",
    "start_time": "2026-06-12T19:30:00",
    "location": "腾讯会议",
    "max_participants": 120
  },
  {
    "event_name": "德国双元制职业教育咨询日",
    "event_type": "线下",
    "start_time": "2026-06-13T14:00:00",
    "location": "广州高教大厦",
    "max_participants": 60
  }
]
```

- [ ] **Step 3: 创建客户演示数据**

Create `data/demo/leads.json`:

```json
[
  {
    "customer_name": "张三",
    "contact_info": "1348907728",
    "background_info": "姓名 张三 性别 男 年龄 19岁 高中毕业 家庭经济条件较好 希望出国升学"
  },
  {
    "customer_name": "李同学",
    "contact_info": "13800000001",
    "background_info": "17岁 中职在读 希望通过新加坡项目提升学历并解决就业问题"
  },
  {
    "customer_name": "王同学",
    "contact_info": "13800000002",
    "background_info": "23岁 高中以上学历 动手能力强 有德国职业培训和就业移民意向"
  }
]
```

- [ ] **Step 4: 创建 seed 服务**

Create `backend/app/services/seed_service.py`:

```python
import json
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
        db.add(SysUser(username="admin", password_hash="demo", real_name="演示管理员", user_type="EMPLOYEE", role="admin"))

    if db.query(CourseProject).count() == 0:
        for item in _load_json("data/demo/projects.json"):
            db.add(CourseProject(**item, selling_points=json.dumps(item["selling_points"], ensure_ascii=False)))

    if db.query(EventLecture).count() == 0:
        for item in _load_json("data/demo/events.json"):
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
```

- [ ] **Step 5: 创建 demo 路由**

Create `backend/app/api/routes_demo.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import ok
from app.services.seed_service import seed_demo_data

router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.post("/seed")
def seed(db: Session = Depends(get_db)):
    return ok(seed_demo_data(db))
```

- [ ] **Step 6: 挂载 demo 路由**

Modify `backend/app/main.py`:

```python
from fastapi import FastAPI

from app.api import routes_demo
from app.core.config import settings
from app.core.database import init_db
from app.core.response import ok

app = FastAPI(title=settings.app_name)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health_check():
    return ok({"status": "ok"})


app.include_router(routes_demo.router)
```

Create `backend/app/api/__init__.py`:

```python
```

- [ ] **Step 7: 验证 seed 接口**

Run:

```powershell
cd backend
python -m uvicorn app.main:app
```

Open:

```text
http://127.0.0.1:8000/docs
```

Call:

```text
POST /api/demo/seed
```

Expected:

```json
{"code":0,"msg":"success","data":{"users":1,"projects":2,"events":2,"leads":3}}
```

- [ ] **Step 8: Commit**

Run:

```powershell
git add data backend/app/services/seed_service.py backend/app/api backend/app/main.py
git commit -m "添加演示数据初始化能力"
```

---

### Task 5: 客户画像规则引擎和画像 API

**Files:**
- Create: `backend/app/schemas/profile.py`
- Create: `backend/app/services/profile_rules.py`
- Create: `backend/app/api/routes_profile.py`
- Create: `backend/tests/test_profile_rules.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: 写画像规则测试**

Create `backend/tests/test_profile_rules.py`:

```python
from app.services.profile_rules import assess_profile


def test_singapore_student_profile():
    result = assess_profile("19岁 高中毕业 家庭经济条件较好 希望去新加坡升学")
    assert result["singapore_score"] >= 70
    assert result["matched_project"] == "新加坡国际本硕升学计划"


def test_germany_vocational_profile():
    result = assess_profile("23岁 高中以上学历 动手能力强 希望去德国职业培训并就业")
    assert result["germany_score"] >= 70
    assert result["matched_project"] == "中德精英人才共建计划"
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
cd backend
python -m pytest tests/test_profile_rules.py -v
```

Expected:

```text
ModuleNotFoundError: No module named 'app.services.profile_rules'
```

- [ ] **Step 3: 创建画像 schema**

Create `backend/app/schemas/profile.py`:

```python
from pydantic import BaseModel


class ProfileAssessRequest(BaseModel):
    raw_input: str
    source_type: str = "text"
    lead_id: int | None = None


class ProfileAssessResult(BaseModel):
    extracted_profile: dict
    singapore_score: float
    germany_score: float
    matched_project: str
    reasons: list[str]
    missing_fields: list[str]
    suggested_actions: list[str]
```

- [ ] **Step 4: 实现规则引擎**

Create `backend/app/services/profile_rules.py`:

```python
import re


def _contains(text: str, words: list[str]) -> bool:
    return any(word in text for word in words)


def _extract_age(text: str) -> int | None:
    match = re.search(r"(\d{1,2})\s*岁", text)
    return int(match.group(1)) if match else None


def assess_profile(raw_input: str):
    text = raw_input.strip()
    age = _extract_age(text)
    education = "未知"
    if _contains(text, ["初中"]):
        education = "初中"
    elif _contains(text, ["高中", "中职", "中专", "技校"]):
        education = "高中或同等学历"
    elif _contains(text, ["专科", "大专"]):
        education = "专科"
    elif _contains(text, ["本科"]):
        education = "本科"

    singapore_score = 0
    germany_score = 0
    reasons: list[str] = []
    suggested_actions: list[str] = []

    if age is not None and 14 <= age <= 24:
        singapore_score += 25
        reasons.append("年龄符合新加坡升学项目常见客群")
    if education in ["初中", "高中或同等学历", "专科", "本科"]:
        singapore_score += 25
        reasons.append("学历背景可匹配新加坡升学路径")
    if _contains(text, ["升学", "本科", "硕士", "学历", "就业"]):
        singapore_score += 30
        reasons.append("存在升学或就业导向需求")
    if _contains(text, ["家庭经济", "家里很有钱", "预算", "费用"]):
        singapore_score += 15
        reasons.append("资料中出现经济条件或预算相关信息")

    if age is not None and 18 <= age <= 35:
        germany_score += 25
        reasons.append("年龄符合德国双元制项目要求")
    if education in ["高中或同等学历", "专科", "本科"]:
        germany_score += 25
        reasons.append("学历满足德国项目高中及以上要求")
    if _contains(text, ["动手", "职业", "培训", "就业", "移民", "德国"]):
        germany_score += 35
        reasons.append("存在职业培训、就业或德国方向意向")
    if _contains(text, ["德语", "B1", "语言"]):
        germany_score += 10
        reasons.append("资料中出现德语或语言学习能力信息")

    missing_fields = []
    if age is None:
        missing_fields.append("年龄")
    if education == "未知":
        missing_fields.append("学历")
    if not _contains(text, ["电话", "手机", "联系", "1"]):
        missing_fields.append("联系方式")

    if singapore_score >= germany_score:
        matched_project = "新加坡国际本硕升学计划"
        suggested_actions.append("邀请客户参加新加坡升学路径线上说明会")
    else:
        matched_project = "中德精英人才共建计划"
        suggested_actions.append("补充确认德语学习能力、职业方向和赴德意愿")

    return {
        "extracted_profile": {
            "age": age,
            "education": education,
            "raw_summary": text[:120],
        },
        "singapore_score": min(singapore_score, 100),
        "germany_score": min(germany_score, 100),
        "matched_project": matched_project,
        "reasons": reasons,
        "missing_fields": missing_fields,
        "suggested_actions": suggested_actions,
    }
```

- [ ] **Step 5: 运行测试确认通过**

Run:

```powershell
cd backend
python -m pytest tests/test_profile_rules.py -v
```

Expected:

```text
2 passed
```

- [ ] **Step 6: 创建画像 API**

Create `backend/app/api/routes_profile.py`:

```python
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
```

- [ ] **Step 7: 挂载画像路由**

Modify `backend/app/main.py`:

```python
from fastapi import FastAPI

from app.api import routes_demo, routes_profile
from app.core.config import settings
from app.core.database import init_db
from app.core.response import ok

app = FastAPI(title=settings.app_name)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health_check():
    return ok({"status": "ok"})


app.include_router(routes_demo.router)
app.include_router(routes_profile.router)
```

- [ ] **Step 8: 验证画像 API**

Run:

```powershell
cd backend
python -m uvicorn app.main:app
```

Call in Swagger:

```json
{
  "raw_input": "姓名 张三 性别 男 年龄 19岁 高中毕业 家庭经济条件较好 希望出国升学 电话 1348907728",
  "source_type": "text",
  "lead_id": null
}
```

Expected:

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "assessment_id": 1,
    "matched_project": "新加坡国际本硕升学计划"
  }
}
```

- [ ] **Step 9: Commit**

Run:

```powershell
git add backend/app backend/tests
git commit -m "添加客户画像研判规则和接口"
```

---

### Task 6: Lead、Project、Event、Report 后端接口

**Files:**
- Create: `backend/app/schemas/lead.py`
- Create: `backend/app/schemas/event.py`
- Create: `backend/app/schemas/report.py`
- Create: `backend/app/services/lead_service.py`
- Create: `backend/app/services/report_service.py`
- Create: `backend/app/api/routes_leads.py`
- Create: `backend/app/api/routes_projects.py`
- Create: `backend/app/api/routes_events.py`
- Create: `backend/app/api/routes_reports.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: 创建 Lead schema**

Create `backend/app/schemas/lead.py`:

```python
from pydantic import BaseModel


class LeadCreate(BaseModel):
    customer_name: str
    contact_info: str | None = None
    background_info: str | None = None
    owner_id: int | None = None


class LeadStatusUpdate(BaseModel):
    status: str
```

- [ ] **Step 2: 创建 Event schema**

Create `backend/app/schemas/event.py`:

```python
from pydantic import BaseModel


class EventRegisterRequest(BaseModel):
    lead_id: int
```

- [ ] **Step 3: 创建 Report schema**

Create `backend/app/schemas/report.py`:

```python
from pydantic import BaseModel


class CustomerOperationReportRequest(BaseModel):
    generated_by: str = "system"
    use_llm_polish: bool = False
```

- [ ] **Step 4: 创建 Lead 服务**

Create `backend/app/services/lead_service.py`:

```python
from sqlalchemy.orm import Session

from app.models.lead import CrmLead
from app.schemas.lead import LeadCreate


def create_lead(db: Session, payload: LeadCreate):
    lead = CrmLead(**payload.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def list_leads(db: Session):
    return db.query(CrmLead).order_by(CrmLead.id.desc()).all()


def get_lead(db: Session, lead_id: int):
    return db.query(CrmLead).filter(CrmLead.id == lead_id).first()


def update_lead_status(db: Session, lead_id: int, status: str):
    lead = get_lead(db, lead_id)
    if not lead:
        return None
    lead.status = status
    db.commit()
    db.refresh(lead)
    return lead
```

- [ ] **Step 5: 创建报告服务**

Create `backend/app/services/report_service.py`:

```python
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
```

- [ ] **Step 6: 创建 Lead 路由**

Create `backend/app/api/routes_leads.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import fail, ok
from app.schemas.lead import LeadCreate, LeadStatusUpdate
from app.services.lead_service import create_lead, get_lead, list_leads, update_lead_status

router = APIRouter(prefix="/api/leads", tags=["leads"])


@router.post("")
def create(payload: LeadCreate, db: Session = Depends(get_db)):
    lead = create_lead(db, payload)
    return ok({"id": lead.id})


@router.get("")
def list_all(db: Session = Depends(get_db)):
    leads = list_leads(db)
    return ok([{"id": item.id, "customer_name": item.customer_name, "status": item.status} for item in leads])


@router.get("/{lead_id}")
def detail(lead_id: int, db: Session = Depends(get_db)):
    lead = get_lead(db, lead_id)
    if not lead:
        return fail("客户不存在", 40401)
    return ok({
        "id": lead.id,
        "customer_name": lead.customer_name,
        "contact_info": lead.contact_info,
        "background_info": lead.background_info,
        "status": lead.status,
    })


@router.patch("/{lead_id}/status")
def update_status(lead_id: int, payload: LeadStatusUpdate, db: Session = Depends(get_db)):
    lead = update_lead_status(db, lead_id, payload.status)
    if not lead:
        return fail("客户不存在", 40401)
    return ok({"id": lead.id, "status": lead.status})
```

- [ ] **Step 7: 创建项目路由**

Create `backend/app/api/routes_projects.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import ok
from app.models.project import CourseProject

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("")
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(CourseProject).order_by(CourseProject.id).all()
    return ok([
        {
            "id": item.id,
            "project_name": item.project_name,
            "country": item.country,
            "category": item.category,
            "target_audience": item.target_audience,
            "description": item.description,
        }
        for item in projects
    ])
```

- [ ] **Step 8: 创建活动路由**

Create `backend/app/api/routes_events.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import fail, ok
from app.models.event import EventLecture, EventRegistration
from app.schemas.event import EventRegisterRequest

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("")
def list_events(db: Session = Depends(get_db)):
    events = db.query(EventLecture).order_by(EventLecture.start_time).all()
    return ok([
        {
            "id": item.id,
            "event_name": item.event_name,
            "event_type": item.event_type,
            "start_time": item.start_time.isoformat(),
            "location": item.location,
            "max_participants": item.max_participants,
            "current_participants": item.current_participants,
        }
        for item in events
    ])


@router.post("/{event_id}/registrations")
def register(event_id: int, payload: EventRegisterRequest, db: Session = Depends(get_db)):
    event = db.query(EventLecture).filter(EventLecture.id == event_id).first()
    if not event:
        return fail("活动不存在", 40402)
    registration = EventRegistration(event_id=event_id, lead_id=payload.lead_id)
    event.current_participants += 1
    db.add(registration)
    db.commit()
    db.refresh(registration)
    return ok({"registration_id": registration.id, "event_id": event_id, "lead_id": payload.lead_id})
```

- [ ] **Step 9: 创建报告路由**

Create `backend/app/api/routes_reports.py`:

```python
import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import fail, ok
from app.models.report import ReportSnapshot
from app.schemas.report import CustomerOperationReportRequest
from app.services.report_service import generate_customer_operation_report

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("/customer-operation")
def customer_operation(payload: CustomerOperationReportRequest, db: Session = Depends(get_db)):
    report = generate_customer_operation_report(db, generated_by=payload.generated_by)
    return ok({"id": report.id, "title": report.title, "generation_mode": report.generation_mode})


@router.get("")
def list_reports(db: Session = Depends(get_db)):
    reports = db.query(ReportSnapshot).order_by(ReportSnapshot.id.desc()).all()
    return ok([{"id": item.id, "title": item.title, "report_type": item.report_type} for item in reports])


@router.get("/{report_id}")
def detail(report_id: int, db: Session = Depends(get_db)):
    report = db.query(ReportSnapshot).filter(ReportSnapshot.id == report_id).first()
    if not report:
        return fail("报告不存在", 40403)
    return ok({
        "id": report.id,
        "title": report.title,
        "report_type": report.report_type,
        "content": json.loads(report.content_json),
        "generation_mode": report.generation_mode,
    })
```

- [ ] **Step 10: 挂载所有业务路由**

Modify `backend/app/main.py`:

```python
from fastapi import FastAPI

from app.api import routes_demo, routes_events, routes_leads, routes_profile, routes_projects, routes_reports
from app.core.config import settings
from app.core.database import init_db
from app.core.response import ok

app = FastAPI(title=settings.app_name)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health_check():
    return ok({"status": "ok"})


app.include_router(routes_demo.router)
app.include_router(routes_profile.router)
app.include_router(routes_leads.router)
app.include_router(routes_projects.router)
app.include_router(routes_events.router)
app.include_router(routes_reports.router)
```

- [ ] **Step 11: 验证 OpenAPI**

Run:

```powershell
cd backend
python -m uvicorn app.main:app
```

Open:

```text
http://127.0.0.1:8000/docs
```

Expected tags:

```text
demo
profile
leads
projects
events
reports
```

- [ ] **Step 12: Commit**

Run:

```powershell
git add backend/app
git commit -m "添加客户项目活动和报告接口"
```

---

### Task 7: Dify 客户端和知识问答 API

**Files:**
- Create: `backend/app/schemas/knowledge.py`
- Create: `backend/app/services/dify_client.py`
- Create: `backend/app/services/knowledge_service.py`
- Create: `backend/app/api/routes_knowledge.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: 创建知识问答 schema**

Create `backend/app/schemas/knowledge.py`:

```python
from pydantic import BaseModel


class KnowledgeChatRequest(BaseModel):
    question: str
    lead_id: int | None = None
    conversation_id: str | None = None
```

- [ ] **Step 2: 创建 Dify 客户端**

Create `backend/app/services/dify_client.py`:

```python
import httpx

from app.core.config import settings


class DifyClient:
    def __init__(self):
        self.api_base = settings.dify_api_base.rstrip("/")
        self.api_key = settings.dify_api_key

    def enabled(self) -> bool:
        return bool(self.api_base and self.api_key)

    async def chat(self, question: str, conversation_id: str | None = None):
        if not self.enabled():
            return {
                "answer": "Dify 未配置，当前返回演示降级结果。",
                "citations": [],
                "conversation_id": conversation_id or "",
                "status": "fallback",
            }

        payload = {
            "inputs": {},
            "query": question,
            "response_mode": "blocking",
            "conversation_id": conversation_id,
            "user": "demo-user",
        }
        headers = {"Authorization": f"Bearer {self.api_key}"}
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(f"{self.api_base}/chat-messages", json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            citations = data.get("metadata", {}).get("retriever_resources", [])
            return {
                "answer": data.get("answer", ""),
                "citations": citations,
                "conversation_id": data.get("conversation_id", ""),
                "status": "success",
            }
```

- [ ] **Step 3: 创建知识服务**

Create `backend/app/services/knowledge_service.py`:

```python
import json

from sqlalchemy.orm import Session

from app.models.knowledge import KnowledgeChatLog
from app.services.dify_client import DifyClient


async def ask_knowledge(db: Session, question: str, lead_id: int | None = None, conversation_id: str | None = None):
    client = DifyClient()
    try:
        result = await client.chat(question, conversation_id=conversation_id)
    except Exception as exc:
        result = {
            "answer": f"Dify 调用失败：{exc}",
            "citations": [],
            "conversation_id": conversation_id or "",
            "status": "error",
        }

    log = KnowledgeChatLog(
        lead_id=lead_id,
        question=question,
        answer=result["answer"],
        citations=json.dumps(result["citations"], ensure_ascii=False),
        dify_conversation_id=result["conversation_id"],
        status=result["status"],
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {
        "id": log.id,
        "answer": log.answer,
        "citations": result["citations"],
        "conversation_id": log.dify_conversation_id,
        "status": log.status,
    }
```

- [ ] **Step 4: 创建知识路由**

Create `backend/app/api/routes_knowledge.py`:

```python
import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import fail, ok
from app.models.knowledge import KnowledgeChatLog
from app.schemas.knowledge import KnowledgeChatRequest
from app.services.knowledge_service import ask_knowledge

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


@router.post("/chat")
async def chat(payload: KnowledgeChatRequest, db: Session = Depends(get_db)):
    result = await ask_knowledge(db, payload.question, payload.lead_id, payload.conversation_id)
    return ok(result)


@router.get("/logs")
def logs(db: Session = Depends(get_db)):
    items = db.query(KnowledgeChatLog).order_by(KnowledgeChatLog.id.desc()).limit(30).all()
    return ok([{"id": item.id, "question": item.question, "status": item.status} for item in items])


@router.get("/logs/{log_id}")
def detail(log_id: int, db: Session = Depends(get_db)):
    item = db.query(KnowledgeChatLog).filter(KnowledgeChatLog.id == log_id).first()
    if not item:
        return fail("问答记录不存在", 40404)
    return ok({
        "id": item.id,
        "question": item.question,
        "answer": item.answer,
        "citations": json.loads(item.citations),
        "status": item.status,
    })
```

- [ ] **Step 5: 挂载知识路由**

Modify `backend/app/main.py` imports and router includes:

```python
from app.api import routes_demo, routes_events, routes_knowledge, routes_leads, routes_profile, routes_projects, routes_reports

app.include_router(routes_knowledge.router)
```

- [ ] **Step 6: 验证 Dify 降级响应**

Run without `.env`:

```powershell
cd backend
python -m uvicorn app.main:app
```

Call:

```json
{
  "question": "新加坡国际本硕升学计划适合什么学生？",
  "lead_id": null,
  "conversation_id": null
}
```

Expected:

```json
{
  "code": 0,
  "data": {
    "status": "fallback"
  }
}
```

- [ ] **Step 7: 配置真实 Dify 并验证**

Create `backend/.env` from `.env.example` and fill:

```env
DIFY_API_BASE=真实地址
DIFY_API_KEY=真实Key
DIFY_APP_ID=真实应用ID
```

Run the same request.

Expected:

```json
{
  "code": 0,
  "data": {
    "status": "success"
  }
}
```

- [ ] **Step 8: Commit**

Run:

```powershell
git add backend/app
git commit -m "添加Dify知识问答接口"
```

---

### Task 8: 前端 API 客户端和页面骨架

**Files:**
- Create: `frontend/src/api/client.ts`
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/pages/DashboardPage.tsx`
- Create: `frontend/src/pages/AssessmentPage.tsx`
- Create: `frontend/src/pages/ChatPage.tsx`
- Create: `frontend/src/pages/LeadsPage.tsx`
- Create: `frontend/src/pages/EventsPage.tsx`
- Create: `frontend/src/pages/ReportsPage.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: 创建前端 API 客户端**

Create `frontend/src/api/client.ts`:

```ts
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const payload = await response.json();
  if (payload.code !== 0) {
    throw new Error(payload.msg || "请求失败");
  }
  return payload.data as T;
}
```

- [ ] **Step 2: 创建页面骨架**

Create `frontend/src/pages/DashboardPage.tsx`:

```tsx
export default function DashboardPage() {
  return (
    <section className="panel">
      <h2>演示总览</h2>
      <p>客户增长闭环：资料输入、画像研判、Dify 咨询、CRM 沉淀、活动报名、智能报告。</p>
    </section>
  );
}
```

Create `frontend/src/pages/AssessmentPage.tsx`:

```tsx
export default function AssessmentPage() {
  return (
    <section className="panel">
      <h2>客户画像研判</h2>
      <p>这里将输入客户资料并展示项目匹配结果。</p>
    </section>
  );
}
```

Create `frontend/src/pages/ChatPage.tsx`:

```tsx
export default function ChatPage() {
  return (
    <section className="panel">
      <h2>Dify 知识库咨询</h2>
      <p>这里将展示知识库问答和引用来源。</p>
    </section>
  );
}
```

Create `frontend/src/pages/LeadsPage.tsx`:

```tsx
export default function LeadsPage() {
  return (
    <section className="panel">
      <h2>CRM 线索</h2>
      <p>这里将展示意向客户列表和状态流转。</p>
    </section>
  );
}
```

Create `frontend/src/pages/EventsPage.tsx`:

```tsx
export default function EventsPage() {
  return (
    <section className="panel">
      <h2>活动与报名</h2>
      <p>这里将展示活动列表和报名结果。</p>
    </section>
  );
}
```

Create `frontend/src/pages/ReportsPage.tsx`:

```tsx
export default function ReportsPage() {
  return (
    <section className="panel">
      <h2>智能报告</h2>
      <p>这里将生成客户经营分析报告。</p>
    </section>
  );
}
```

- [ ] **Step 3: 创建简单路由切换**

Modify `frontend/src/App.tsx`:

```tsx
import { useState } from "react";
import AssessmentPage from "./pages/AssessmentPage";
import ChatPage from "./pages/ChatPage";
import DashboardPage from "./pages/DashboardPage";
import EventsPage from "./pages/EventsPage";
import LeadsPage from "./pages/LeadsPage";
import ReportsPage from "./pages/ReportsPage";

const pages = [
  { key: "dashboard", label: "总览", component: <DashboardPage /> },
  { key: "assessment", label: "画像研判", component: <AssessmentPage /> },
  { key: "chat", label: "知识咨询", component: <ChatPage /> },
  { key: "leads", label: "CRM", component: <LeadsPage /> },
  { key: "events", label: "活动", component: <EventsPage /> },
  { key: "reports", label: "报告", component: <ReportsPage /> },
];

export default function App() {
  const [active, setActive] = useState("dashboard");
  const current = pages.find((page) => page.key === active) ?? pages[0];

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>教育服务客户增长闭环 Demo</h1>
          <p>稳定底座优先：规则引擎 + Dify + CRM + 报告。</p>
        </div>
        <a className="api-link" href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer">
          OpenAPI
        </a>
      </header>
      <nav className="tabs">
        {pages.map((page) => (
          <button className={active === page.key ? "active" : ""} key={page.key} onClick={() => setActive(page.key)}>
            {page.label}
          </button>
        ))}
      </nav>
      {current.component}
    </main>
  );
}
```

- [ ] **Step 4: 更新样式**

Modify `frontend/src/styles.css`:

```css
body {
  margin: 0;
  font-family: "Microsoft YaHei", "Segoe UI", sans-serif;
  background: #f7f8fb;
  color: #172033;
}

button,
textarea,
input {
  font: inherit;
}

.app-shell {
  max-width: 1180px;
  margin: 0 auto;
  padding: 28px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.topbar h1 {
  margin: 0 0 6px;
  font-size: 28px;
}

.topbar p {
  margin: 0;
  color: #647087;
}

.api-link {
  color: #1769aa;
  text-decoration: none;
  border: 1px solid #c8def2;
  background: #e8f2fb;
  border-radius: 6px;
  padding: 8px 12px;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.tabs button {
  border: 1px solid #d7dce5;
  background: white;
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
}

.tabs button.active {
  border-color: #1769aa;
  background: #e8f2fb;
  color: #123d5f;
  font-weight: 700;
}

.panel {
  background: white;
  border: 1px solid #d7dce5;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(23, 32, 51, 0.06);
}
```

- [ ] **Step 5: 验证前端构建**

Run:

```powershell
cd frontend
npm run build
```

Expected:

```text
✓ built
```

- [ ] **Step 6: Commit**

Run:

```powershell
git add frontend/src
git commit -m "添加前端演示工作台页面骨架"
```

---

### Task 9: 前端接入画像、Dify、CRM、活动和报告接口

**Files:**
- Modify: `frontend/src/pages/AssessmentPage.tsx`
- Modify: `frontend/src/pages/ChatPage.tsx`
- Modify: `frontend/src/pages/LeadsPage.tsx`
- Modify: `frontend/src/pages/EventsPage.tsx`
- Modify: `frontend/src/pages/ReportsPage.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: 实现画像研判页**

Modify `frontend/src/pages/AssessmentPage.tsx`:

```tsx
import { useState } from "react";
import { apiRequest } from "../api/client";

const sample = "姓名 张三 性别 男 年龄 19岁 高中毕业 家庭经济条件较好 希望出国升学 电话 1348907728";

type AssessmentResult = {
  assessment_id: number;
  extracted_profile: Record<string, unknown>;
  singapore_score: number;
  germany_score: number;
  matched_project: string;
  reasons: string[];
  missing_fields: string[];
  suggested_actions: string[];
};

export default function AssessmentPage() {
  const [rawInput, setRawInput] = useState(sample);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [message, setMessage] = useState("");

  async function assess() {
    setMessage("研判中...");
    try {
      const data = await apiRequest<AssessmentResult>("/api/profile/assess", {
        method: "POST",
        body: JSON.stringify({ raw_input: rawInput, source_type: "text", lead_id: null }),
      });
      setResult(data);
      setMessage("研判完成");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "研判失败");
    }
  }

  return (
    <section className="panel">
      <h2>客户画像研判</h2>
      <textarea value={rawInput} onChange={(event) => setRawInput(event.target.value)} rows={5} />
      <div className="actions">
        <button onClick={() => setRawInput(sample)}>加载样例客户</button>
        <button onClick={assess}>开始研判</button>
      </div>
      <p className="status">{message}</p>
      {result && (
        <div className="result-grid">
          <div><strong>推荐项目</strong><p>{result.matched_project}</p></div>
          <div><strong>新加坡分数</strong><p>{result.singapore_score}</p></div>
          <div><strong>德国分数</strong><p>{result.germany_score}</p></div>
          <div><strong>命中理由</strong><ul>{result.reasons.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div><strong>缺失字段</strong><p>{result.missing_fields.join("、") || "无"}</p></div>
          <div><strong>建议动作</strong><ul>{result.suggested_actions.map((item) => <li key={item}>{item}</li>)}</ul></div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: 实现 Dify 咨询页**

Modify `frontend/src/pages/ChatPage.tsx`:

```tsx
import { useState } from "react";
import { apiRequest } from "../api/client";

type ChatResult = {
  id: number;
  answer: string;
  citations: Array<Record<string, unknown>>;
  conversation_id: string;
  status: string;
};

export default function ChatPage() {
  const [question, setQuestion] = useState("新加坡国际本硕升学计划适合什么学生？");
  const [result, setResult] = useState<ChatResult | null>(null);
  const [message, setMessage] = useState("");

  async function ask() {
    setMessage("正在调用 Dify...");
    try {
      const data = await apiRequest<ChatResult>("/api/knowledge/chat", {
        method: "POST",
        body: JSON.stringify({ question, lead_id: null, conversation_id: null }),
      });
      setResult(data);
      setMessage(data.status === "success" ? "调用成功" : `当前状态：${data.status}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "调用失败");
    }
  }

  return (
    <section className="panel">
      <h2>Dify 知识库咨询</h2>
      <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={3} />
      <div className="actions">
        <button onClick={ask}>提问</button>
      </div>
      <p className="status">{message}</p>
      {result && (
        <div className="answer">
          <strong>回答</strong>
          <p>{result.answer}</p>
          <strong>引用来源</strong>
          <pre>{JSON.stringify(result.citations, null, 2)}</pre>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: 实现 CRM 列表页**

Modify `frontend/src/pages/LeadsPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";

type Lead = { id: number; customer_name: string; status: string };

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setLeads(await apiRequest<Lead[]>("/api/leads"));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载失败");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="panel">
      <h2>CRM 线索</h2>
      <button onClick={load}>刷新</button>
      <p className="status">{message}</p>
      <table>
        <thead><tr><th>ID</th><th>客户</th><th>状态</th></tr></thead>
        <tbody>{leads.map((lead) => <tr key={lead.id}><td>{lead.id}</td><td>{lead.customer_name}</td><td>{lead.status}</td></tr>)}</tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 4: 实现活动页**

Modify `frontend/src/pages/EventsPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";

type EventItem = {
  id: number;
  event_name: string;
  event_type: string;
  start_time: string;
  location: string;
  current_participants: number;
  max_participants: number;
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    setEvents(await apiRequest<EventItem[]>("/api/events"));
  }

  async function register(eventId: number) {
    try {
      await apiRequest(`/api/events/${eventId}/registrations`, {
        method: "POST",
        body: JSON.stringify({ lead_id: 1 }),
      });
      setMessage("已为演示客户报名");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "报名失败");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="panel">
      <h2>活动与报名</h2>
      <p className="status">{message}</p>
      <div className="cards">
        {events.map((item) => (
          <article className="card" key={item.id}>
            <h3>{item.event_name}</h3>
            <p>{item.event_type} / {item.location}</p>
            <p>{item.current_participants} / {item.max_participants}</p>
            <button onClick={() => register(item.id)}>为 1 号客户报名</button>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: 实现报告页**

Modify `frontend/src/pages/ReportsPage.tsx`:

```tsx
import { useState } from "react";
import { apiRequest } from "../api/client";

type ReportCreated = { id: number; title: string; generation_mode: string };
type ReportDetail = { id: number; title: string; content: Record<string, unknown>; generation_mode: string };

export default function ReportsPage() {
  const [created, setCreated] = useState<ReportCreated | null>(null);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [message, setMessage] = useState("");

  async function generate() {
    try {
      const data = await apiRequest<ReportCreated>("/api/reports/customer-operation", {
        method: "POST",
        body: JSON.stringify({ generated_by: "demo", use_llm_polish: false }),
      });
      setCreated(data);
      setDetail(await apiRequest<ReportDetail>(`/api/reports/${data.id}`));
      setMessage("报告已生成");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成失败");
    }
  }

  return (
    <section className="panel">
      <h2>智能报告</h2>
      <button onClick={generate}>生成客户经营分析报告</button>
      <p className="status">{message}</p>
      {created && <p>报告：{created.title}，生成方式：{created.generation_mode}</p>}
      {detail && <pre>{JSON.stringify(detail.content, null, 2)}</pre>}
    </section>
  );
}
```

- [ ] **Step 6: 补充前端样式**

Append to `frontend/src/styles.css`:

```css
textarea {
  width: 100%;
  border: 1px solid #d7dce5;
  border-radius: 6px;
  padding: 10px;
  resize: vertical;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.actions button,
.panel button {
  border: 1px solid #1769aa;
  background: #1769aa;
  color: white;
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
}

.status {
  color: #647087;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.result-grid > div,
.answer,
.card {
  border: 1px solid #d7dce5;
  border-radius: 8px;
  padding: 14px;
  background: #fbfcff;
}

.cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
}

th,
td {
  border-bottom: 1px solid #eef1f5;
  padding: 10px;
  text-align: left;
}

pre {
  background: #f2f4f7;
  border: 1px solid #e1e5ec;
  border-radius: 6px;
  padding: 12px;
  overflow: auto;
}
```

- [ ] **Step 7: 验证主链路**

Run backend:

```powershell
cd backend
python -m uvicorn app.main:app
```

Run frontend:

```powershell
cd frontend
npm run dev
```

Browser flow:

1. Call `POST /api/demo/seed` in Swagger.
2. Open frontend.
3. Go to `画像研判`, click `开始研判`.
4. Go to `知识咨询`, click `提问`.
5. Go to `CRM`, verify leads.
6. Go to `活动`, register lead 1.
7. Go to `报告`, generate report.

Expected:

```text
All pages show data or clear fallback messages.
```

- [ ] **Step 8: Commit**

Run:

```powershell
git add frontend/src
git commit -m "接入前端客户增长闭环接口"
```

---

### Task 10: 测试、文档和答辩交付物

**Files:**
- Create: `docs/demo-script.md`
- Create: `docs/api-checklist.md`
- Create: `docs/team-task-packages.md`
- Create: `backend/tests/test_api_smoke.py`
- Modify: `docs/superpowers/specs/2026-06-09-customer-growth-demo-design.md`

- [ ] **Step 1: 创建 API 冒烟测试**

Create `backend/tests/test_api_smoke.py`:

```python
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["code"] == 0


def test_profile_assess():
    response = client.post("/api/profile/assess", json={"raw_input": "19岁 高中毕业 希望新加坡升学", "source_type": "text"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    assert payload["data"]["matched_project"] == "新加坡国际本硕升学计划"
```

- [ ] **Step 2: 运行测试**

Run:

```powershell
cd backend
python -m pytest -v
```

Expected:

```text
passed
```

- [ ] **Step 3: 创建演示脚本**

Create `docs/demo-script.md`:

```markdown
# 客户增长闭环 Demo 演示脚本

## 开场

本 demo 面向教育服务留学咨询业务，三天内先打穿客户增长主链路。企业助手和学生助手作为二期扩展。

## 演示步骤

1. 打开总览页，说明架构：React 前端、FastAPI 后端、Dify 知识库、规则引擎和模板报告。
2. 在 Swagger 调用 `POST /api/demo/seed` 初始化数据。
3. 打开画像研判页，加载样例客户并点击研判。
4. 说明研判结果：新加坡分数、德国分数、命中理由、缺失字段。
5. 打开 Dify 知识咨询页，提问“新加坡国际本硕升学计划适合什么学生？”。
6. 展示回答、引用来源和调用状态。
7. 打开 CRM 页，展示线索列表。
8. 打开活动页，为 1 号客户报名。
9. 打开报告页，生成客户经营分析报告。
10. 打开 OpenAPI，展示接口分组和后续扩展能力。

## 兜底说明

- Dify 不可用时，页面会显示 fallback 或错误状态。
- 大模型不可用时，画像研判和报告仍由规则引擎与模板生成完成。
```

- [ ] **Step 4: 创建 API 检查清单**

Create `docs/api-checklist.md`:

```markdown
# API 检查清单

- [ ] `GET /health`
- [ ] `POST /api/demo/seed`
- [ ] `POST /api/profile/assess`
- [ ] `POST /api/knowledge/chat`
- [ ] `GET /api/leads`
- [ ] `GET /api/projects`
- [ ] `GET /api/events`
- [ ] `POST /api/events/{id}/registrations`
- [ ] `POST /api/reports/customer-operation`
- [ ] `GET /api/reports/{id}`
```

- [ ] **Step 5: 创建团队任务包说明**

Create `docs/team-task-packages.md`:

```markdown
# 团队任务包说明

## 主力

负责框架、数据库、核心 API、Dify 接入、前端请求封装、主链路联调。

## 成员 A：知识资料整理包

交付 Dify 导入资料清单、文件来源、FAQ 检查表。

## 成员 B：演示数据包

交付客户样例、项目样例、活动样例、预期研判结果。

## 成员 C：页面填充包

交付页面文案、空状态文案、演示提示。

## 成员 D：答辩材料包

交付 PPT 素材、接口截图、表设计截图、演示录屏、测试记录。
```

- [ ] **Step 6: 前端构建验证**

Run:

```powershell
cd frontend
npm run build
```

Expected:

```text
✓ built
```

- [ ] **Step 7: 后端测试验证**

Run:

```powershell
cd backend
python -m pytest -v
```

Expected:

```text
passed
```

- [ ] **Step 8: 完整演示验证**

Run the full browser flow three times:

```text
seed -> assessment -> chat -> leads -> events -> reports -> OpenAPI
```

Record in `docs/api-checklist.md` by checking completed items.

- [ ] **Step 9: Commit**

Run:

```powershell
git add docs backend/tests
git commit -m "添加测试清单和答辩交付物"
```

---

## 计划自查

### 覆盖设计文档

- 客户资料输入：Task 5, Task 9。
- 客户画像研判：Task 5。
- Dify 知识库咨询：Task 7, Task 9。
- CRM 线索沉淀：Task 6, Task 9。
- 活动报名：Task 6, Task 9。
- 智能报告：Task 6, Task 9。
- OpenAPI 展示：Task 1, Task 6, Task 10。
- 协作规则和答辩交付物：Task 10。

### 占位扫描

本计划不使用模糊占位任务。每个任务都有路径、命令和验收标准。

### 类型一致性

- 后端统一返回 `{ code, msg, data }`。
- 前端 `apiRequest` 只读取 `data`。
- 画像接口为 `/api/profile/assess`。
- Dify 问答接口为 `/api/knowledge/chat`。
- 客户经营报告接口为 `/api/reports/customer-operation`。

---

## 执行建议

计划建议采用主力内联执行方式。其他成员在主力完成 Task 1-4 后再开始交任务包，避免数据格式和接口路径未定时反复返工。
