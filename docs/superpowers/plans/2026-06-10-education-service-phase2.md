# 教育服务业务系统二期 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将一期“客户增长闭环 demo”升级为覆盖客户、企业员工、学生服务、知识问答、报告和权限的完整教育服务业务系统。

**Architecture:** 延续现有 FastAPI + SQLAlchemy + SQLite/MySQL-compatible 后端和 React/Vite/TypeScript 前端。后端继续按 `models/schemas/services/api` 分层，接口统一返回 `{ code, msg, data }`；AI 能力由 Dify 知识库、规则引擎、模板报告和可选真实模型增强共同组成。

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, SQLite, React, Vite, TypeScript, Dify API, pytest, npm build。

---

## 0. 假设、取舍和成功标准

### 假设

- `教育服务/` 是资料目录，只读取，不加入 Git。
- 当前仍使用 SQLite 交付，但新增表字段命名兼容后续 MySQL。
- 二期允许扩大范围，但每个阶段必须形成可运行、可验证、可提交的纵向切片。
- Dify 仍作为知识库问答统一入口；未配置 Dify 时必须有明确 fallback，不阻断主业务。
- 暂不引入复杂第三方认证服务，先实现本系统可演示的用户、角色、权限和审计边界。

### 取舍

- 不一次性重写一期页面，先在现有工作台上扩展模块导航和真实 API。
- 不把 NL2SQL 直接执行任意 SQL，先采用“受控意图模板 + 白名单查询”降低风险。
- 不做完整流程引擎，审批先用状态机表和操作日志表达。
- 不引入 Alembic 作为第一阶段阻塞项；二期中段再决定是否补迁移工具。

### 总成功标准

- 后端 OpenAPI 至少包含：auth、users、roles、leads、crm、projects、events、enterprise-assistant、student-assistant、knowledge、reports、audit、notifications、demo。
- 前端至少包含：首页总览、CRM、项目/课程、活动运营、企业助手、学生助手、知识库、报告中心、权限设置、审计日志。
- 每个核心业务都有可跑通的 seed 数据、API 冒烟测试和前端可操作页面。
- 每个阶段执行后运行对应验证命令并提交中文 commit。

---

## 1. 模块边界

### 1.1 客户与完整 CRM

职责：
- 线索录入、列表、详情、状态流转、负责人分配。
- 跟进记录、待办任务、转化结果、流失原因。
- 客户画像研判与推荐项目沉淀。

主要表：
- 复用 `crm_lead`、`lead_profile_assessment`。
- 新增 `crm_follow_up`、`crm_task`、`crm_stage_history`。

API 分组：
- `POST /api/leads`
- `GET /api/leads`
- `GET /api/leads/{id}`
- `PATCH /api/leads/{id}`
- `POST /api/leads/{id}/follow-ups`
- `GET /api/leads/{id}/timeline`
- `POST /api/crm/tasks`
- `PATCH /api/crm/tasks/{id}/complete`

### 1.2 企业助手

职责：
- 意向客户自然语言录入/查询/状态更新。
- 口述日报结构化、日报查询、管理层汇总。
- 组织架构、新人指南问答。
- 投诉反馈、学生成绩、请假审批等员工侧操作入口。
- 受控 NL2SQL 查询。

主要表：
- `work_daily_report`
- `organization_unit`
- `employee_profile`
- `assistant_conversation`
- `assistant_intent_log`
- `nl2sql_query_log`

API 分组：
- `POST /api/enterprise-assistant/chat`
- `POST /api/enterprise-assistant/daily-reports`
- `GET /api/enterprise-assistant/daily-reports`
- `GET /api/enterprise-assistant/daily-reports/summary`
- `GET /api/enterprise-assistant/org-units`
- `POST /api/enterprise-assistant/nl2sql/query`

### 1.3 学生助手

职责：
- 学生请假申请、老师审批、通知回写。
- 心理关怀对话、风险识别、预警记录。
- 售后投诉与建议工单。
- 学业考务节点、申请进度查询。
- 海外生活知识问答和升学项目二次转化推荐。

主要表：
- `student_profile`
- `student_leave_request`
- `student_grade`
- `student_academic_event`
- `student_application_progress`
- `student_feedback_ticket`
- `student_psych_profile`
- `student_psych_alert`

API 分组：
- `POST /api/student-assistant/chat`
- `GET /api/students`
- `POST /api/students/{id}/leave-requests`
- `PATCH /api/student-leave-requests/{id}/approve`
- `POST /api/students/{id}/feedback-tickets`
- `GET /api/students/{id}/academic-events`
- `GET /api/students/{id}/application-progress`
- `GET /api/students/{id}/psych-alerts`

### 1.4 项目/课程管理

职责：
- 维护新加坡、德国、语言培训、背景提升、研学等项目。
- 项目标签、适合人群、费用、周期、招生条件、关联知识来源。
- 给 CRM 和学生助手提供推荐基础。

主要表：
- 扩展 `course_project` 使用方式。
- 新增 `course_project_plan`、`course_project_tag`。

API 分组：
- `GET /api/projects`
- `POST /api/projects`
- `PATCH /api/projects/{id}`
- `GET /api/projects/{id}`
- `GET /api/projects/recommendations`

### 1.5 活动运营

职责：
- 活动创建、发布、报名、签到、报名名单。
- 对 CRM 线索和学生用户都可报名。

主要表：
- 复用 `event_lecture`、`event_registration`。
- 新增 `event_check_in`。

API 分组：
- `GET /api/events`
- `POST /api/events`
- `PATCH /api/events/{id}`
- `POST /api/events/{id}/registrations`
- `GET /api/events/{id}/registrations`
- `POST /api/events/{id}/check-ins`

### 1.6 报告中心扩展

职责：
- 全域客户经营分析报告。
- 员工日报日/周汇总。
- 学生心理健康周报。
- 投诉处理周报。

主要表：
- 复用 `report_snapshot`。
- 新增 `report_job`。

API 分组：
- `POST /api/reports/customer-operation`
- `POST /api/reports/daily-work-summary`
- `POST /api/reports/student-psych-weekly`
- `POST /api/reports/feedback-weekly`
- `GET /api/reports`
- `GET /api/reports/{id}`

### 1.7 权限/角色

职责：
- 用户、角色、权限点、用户角色绑定。
- 前端菜单按权限展示。
- 后端关键接口预留权限校验入口。

主要表：
- 复用 `sys_user`。
- 新增 `sys_role`、`sys_permission`、`sys_user_role`、`audit_log`。

API 分组：
- `GET /api/users`
- `POST /api/users`
- `GET /api/roles`
- `POST /api/roles`
- `POST /api/roles/{id}/permissions`
- `GET /api/audit/logs`

### 1.8 Dify 知识库问答增强

职责：
- 公司信息、业务、政策、新人指南、海外生活知识统一走 Dify。
- 按业务场景记录知识来源、调用状态、fallback。
- 支持知识资料同步清单，不在本系统内替代 Dify 切片能力。

主要表：
- 复用 `knowledge_chat_log`。
- 新增 `knowledge_source`、`knowledge_sync_job`。

API 分组：
- `POST /api/knowledge/chat`
- `GET /api/knowledge/logs`
- `GET /api/knowledge/sources`
- `POST /api/knowledge/sync-jobs`

---

## 2. 前端页面规划

- `DashboardPage`：全局业务总览、今日待办、报告摘要、OpenAPI 入口。
- `CrmPage`：线索列表、详情、跟进时间线、任务、状态流转。
- `ProjectsPage`：项目/课程列表、详情、标签、推荐规则说明。
- `EventsPage`：活动列表、报名、签到、名单。
- `EnterpriseAssistantPage`：企业助手对话、日报录入、NL2SQL 查询、组织架构、新人指南入口。
- `StudentAssistantPage`：学生助手对话、请假、反馈、心理预警、学业节点、进度查询。
- `KnowledgePage`：Dify 问答、知识来源、调用日志。
- `ReportsPage`：四类报告生成、报告列表和详情。
- `AdminPage`：用户、角色、权限。
- `AuditPage`：审计日志和关键操作追踪。

---

## 3. 阶段执行计划

### 阶段 1：二期业务底座

目标：
- 更新项目级规则。
- 新增二期核心数据模型。
- 新增业务总览 API，证明新表可初始化、可统计。
- 保持一期 API 和前端构建不破坏。

文件：
- Modify: `AGENTS.md`
- Create: `docs/superpowers/plans/2026-06-10-education-service-phase2.md`
- Create: `backend/app/models/permission.py`
- Create: `backend/app/models/crm.py`
- Create: `backend/app/models/enterprise.py`
- Create: `backend/app/models/student.py`
- Create: `backend/app/models/assistant.py`
- Create: `backend/app/models/operation.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/app/core/database.py`
- Create: `backend/app/api/routes_phase2.py`
- Modify: `backend/app/main.py`
- Modify: `backend/tests/test_api_smoke.py`

验证：
- `cd backend && python -m pytest -v`
- `cd frontend && npm.cmd run build`

Commit：
- `添加二期业务底座`

### 阶段 2：权限/角色与审计闭环

目标：
- 实现用户、角色、权限 CRUD。
- 给企业助手、学生助手、报告等关键操作写入审计日志。
- 前端增加权限设置和审计页面。

验证：
- 后端权限 API 测试。
- 前端 build。

Commit：
- `添加角色权限和审计日志`

### 阶段 3：完整 CRM

目标：
- 扩展线索详情、跟进记录、任务、阶段历史。
- 前端 CRM 页支持详情抽屉/区域、状态更新、跟进新增、任务完成。

验证：
- CRM API 冒烟测试。
- 浏览器或构建验证 CRM 页面。

Commit：
- `完善CRM跟进和任务闭环`

### 阶段 4：项目/课程管理与推荐增强

目标：
- 项目 CRUD、标签、项目方案。
- 推荐从固定国家分数升级为项目标签匹配。
- 前端项目管理页面可维护项目。

验证：
- 项目 API 测试。
- 画像推荐回归测试。
- 前端 build。

Commit：
- `完善项目课程管理和推荐`

### 阶段 5：活动运营

目标：
- 活动 CRUD、报名名单、签到。
- 线索和学生两类报名主体。
- 前端活动运营页面可创建活动、报名、签到。

验证：
- 活动 API 测试。
- 前端 build。

Commit：
- `完善活动运营闭环`

### 阶段 6：企业助手

目标：
- 企业助手对话入口。
- 意向客户自然语言录入/查询/状态更新。
- 口述日报、日报列表、日报汇总。
- 组织架构和新人指南知识问答。
- 受控 NL2SQL 查询。

验证：
- 企业助手意图路由测试。
- NL2SQL 白名单测试。
- 前端 build。

Commit：
- `添加企业智能助手`

### 阶段 7：学生助手

目标：
- 学生助手对话入口。
- 请假申请与审批。
- 反馈工单。
- 心理风险识别与预警。
- 学业节点和申请进度查询。

验证：
- 学生助手意图路由测试。
- 请假审批和反馈工单 API 测试。
- 前端 build。

Commit：
- `添加学生智能助手`

### 阶段 8：Dify 知识库增强

目标：
- 知识来源管理。
- 知识同步任务记录。
- Dify 按场景问答：客服、企业新人指南、学生生活支持。
- 前端知识库页面展示来源、日志、fallback。

验证：
- Dify 未配置 fallback 测试。
- 知识来源 API 测试。
- 前端 build。

Commit：
- `增强Dify知识库问答`

### 阶段 9：报告中心扩展

目标：
- 全域客户经营分析报告。
- 员工日报日/周汇总。
- 学生心理健康周报。
- 投诉处理周报。
- 前端报告中心支持多报告类型。

验证：
- 四类报告 API 测试。
- 前端 build。

Commit：
- `扩展智能报告中心`

### 阶段 10：全链路联调与交付材料

目标：
- 更新 demo 脚本、API 清单、测试清单。
- 跑通企业助手、学生助手、CRM、项目、活动、报告、权限主链路。
- 修复联调发现的阻塞问题。

验证：
- `cd backend && python -m pytest -v`
- `cd frontend && npm.cmd run build`
- 浏览器主链路验证。

Commit：
- `完善二期联调和交付材料`

---

## 4. 阶段性 commit 策略

- 每阶段只提交本阶段相关文件。
- 提交信息使用中文短句。
- 提交前先运行本阶段验证命令。
- 如果验证失败，先修复再提交；无法修复时不提交，并记录失败命令和原因。
- 不提交 `教育服务/`、数据库文件、`node_modules/`、`dist/`、本地 IDE 文件。

---

## 5. 风险控制

- 数据库迁移风险：第一阶段只新增表，不改一期已有表字段；后续如需改字段，先补迁移策略。
- AI 幻觉风险：客服、企业、学生知识问答统一保留 Dify/fallback 状态；关键业务操作不直接由大模型写库，必须通过受控服务函数。
- NL2SQL 风险：只允许查询白名单表和只读 SQL；写操作使用明确业务接口。
- 权限风险：前端菜单控制只做体验，后端关键接口仍保留权限校验入口。
- 范围膨胀风险：每阶段必须有 API、页面或测试可验收，不做纯概念扩展。
