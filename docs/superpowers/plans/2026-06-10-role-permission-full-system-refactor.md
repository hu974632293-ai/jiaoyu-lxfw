# 角色权限全量业务系统重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 `教育服务/客户需求表.xlsx` 全量需求，将系统重构为公开官网、角色权限后台、完整数据库表结构和清晰可用前端界面。

**Architecture:** 不再按“一期/二期”或“二期助手”组织功能。系统采用 `公开官网门户 -> 登录入口 -> 按权限进入对应业务后台`，后端按 `models/schemas/services/api` 分层，数据库从客户、学生、日报、投诉、活动、研判、权限、报告等核心实体重新闭合。

**Tech Stack:** FastAPI, SQLAlchemy, SQLite now / MySQL-compatible schema later, React, Vite, TypeScript, Dify fallback, lucide-react.

---

## 0. 执行约束

1. 每次只执行一个 Task。
2. 每个 Task 完成后运行对应验证。
3. 触碰前端后运行：

```bash
cd frontend
npm.cmd run build
```

4. 触碰后端、数据库或接口契约后运行：

```bash
cd backend
python -m pytest -v
```

5. 提交前先运行 `git status`，只 stage 当前 Task 文件。
6. 每个 Task 创建中文 commit。
7. 环境级 Git 警告 `C:\Users\97463/.config/git/ignore` 读取失败不影响提交。

## 1. 当前最终产品规则

1. `教育服务/客户需求表.xlsx` 是最高需求来源。
2. 五类需求必须全部覆盖：客户研判、客服 Agent、企业智能助手、学生智能助手、智能报告。
3. 不使用“二期助手”作为用户可见入口。
4. 无权限入口直接不展示，不显示“当前角色隐藏”。
5. 前端删除解释性长文，只保留必要标题、字段、按钮、状态、风险提示、空状态和错误提示。
6. 各权限后台不套统一“角色工作台”模板，按实际功能数量和使用频率排布。
7. 顾问必须有手动录入客户线索功能，且必须是客户增长页显著主操作。
8. 每个角色都必须做 `角色 -> 任务 -> 操作 -> API -> 数据表 -> 前端入口` 覆盖排查。
9. UI 效果图阶段必须至少输出 4 套整体风格方案：简约大气、科技高级感、绚烂花哨、稳重政企；用户确认最终风格后再进入具体实现。

## 2. 目标文件结构

### 2.1 文档

| 文件 | 职责 |
| --- | --- |
| `AGENTS.md` | 项目级最终规则 |
| `docs/prd/教育服务业务系统PRD-v1.md` | 客户需求表覆盖、角色权限、数据库终局设计 |
| `docs/prd/教育服务业务系统原型结构-v1.md` | 页面原型结构和角色后台布局 |
| `docs/superpowers/specs/2026-06-10-enterprise-portal-role-workbench-ia.md` | 官网与角色权限后台 IA |
| `docs/superpowers/specs/2026-06-10-customer-growth-pipeline-frontend-ia.md` | 顾问客户增长和客户 360 IA |
| `docs/superpowers/plans/2026-06-10-role-permission-full-system-refactor.md` | 当前最终实现计划 |

### 2.2 后端目标模块

| 文件/模块 | 职责 |
| --- | --- |
| `backend/app/models/user.py` | 用户、角色、权限、绑定 |
| `backend/app/models/lead.py` | 客户、线索、来源资料、研判、推荐 |
| `backend/app/models/crm.py` | 跟进、任务、阶段历史 |
| `backend/app/models/project.py` | 项目、路径、标签、规则、资料 |
| `backend/app/models/event.py` | 活动、报名、签到 |
| `backend/app/models/knowledge.py` | 知识来源、切片、问答、fallback |
| `backend/app/models/enterprise.py` | 员工、日报、组织、受控查询 |
| `backend/app/models/student.py` | 学生、请假、反馈、考务、进度、心理辅助 |
| `backend/app/models/report.py` | 报告快照、指标、生成日志 |
| `backend/app/models/assistant.py` | Agent 意图、动作、prompt 配置 |

### 2.3 前端目标页面

| 页面 | 角色 |
| --- | --- |
| `PublicPortalPage` | 游客/潜在客户 |
| `LoginPage` | 所有后台用户 |
| `CustomerGrowthPage` | 顾问 |
| `Customer360Page` | 顾问、管理者 |
| `EmployeeWorkspacePage` | 员工 |
| `TeacherStudentServicePage` | 老师 |
| `StudentServicePage` | 学生 |
| `ManagementDashboardPage` | 管理者 |
| `SystemGovernancePage` | 管理员 |

## 3. 客户需求覆盖检查表

实现过程中每个 Task 必须维护这张覆盖关系：

| 需求项 | 必须覆盖 |
| --- | --- |
| 客户研判 | 多来源资料、规则命中、两个产品匹配、推荐项目、研判记录 |
| 客服 Agent | 公司信息、业务、政策、项目推荐、活动报名、FAQ、闲聊、RAG 来源 |
| 企业智能助手 | 客户录入/查询/状态更新、日报、日报汇总、组织架构、新人指南、NL2SQL、主动待办、指令处理 |
| 学生智能助手 | 请假、审批、心理辅助、预警、反馈、通知、考务、进度、生活支持、增值推荐 |
| 智能报告 | 客户经营、日报日汇总、日报周汇总、心理健康周报、投诉处理周报 |

## 4. 数据库终局表清单

### 4.1 用户权限

- `sys_user`
- `sys_role`
- `sys_permission`
- `sys_user_role`
- `sys_role_permission`
- `audit_log`
- `notification`
- `todo_item`

### 4.2 客户增长

- `customer`
- `lead`
- `lead_source_file`
- `lead_profile_assessment`
- `profile_rule`
- `profile_rule_hit`
- `lead_recommendation`
- `lead_follow_up`
- `lead_task`
- `lead_stage_history`

### 4.3 项目活动

- `course_project`
- `project_pathway`
- `project_tag`
- `project_rule`
- `project_material`
- `event`
- `event_registration`
- `event_checkin`

### 4.4 知识库与 Agent

- `knowledge_source`
- `knowledge_chunk`
- `chat_session`
- `chat_message`
- `agent_intent_log`
- `agent_action_log`
- `agent_prompt_config`
- `controlled_query_log`
- `dify_fallback_log`

### 4.5 员工与学生

- `employee_profile`
- `employee_daily_report`
- `daily_report_summary`
- `organization_unit`
- `employee_directory`
- `student_profile`
- `student_admin_service`
- `student_leave_approval`
- `student_feedback_ticket`
- `student_academic_node`
- `student_application_progress`
- `student_psych_profile`
- `student_psych_alert`
- `psych_follow_up`

### 4.6 报告

- `report_snapshot`
- `report_metric`
- `report_generation_log`
- `recommendation_log`

## 5. 阶段任务

### Task 1: 固化最终文档基线

**目标：** 同步 AGENTS、PRD、原型、IA 和最终计划，废除“二期助手”和统一角色工作台。

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/prd/教育服务业务系统PRD-v1.md`
- Modify: `docs/prd/教育服务业务系统原型结构-v1.md`
- Modify: `docs/superpowers/specs/2026-06-10-enterprise-portal-role-workbench-ia.md`
- Modify: `docs/superpowers/specs/2026-06-10-customer-growth-pipeline-frontend-ia.md`
- Create: `docs/superpowers/plans/2026-06-10-role-permission-full-system-refactor.md`

- [ ] **Step 1: 检查旧入口是否仍被正向定义**

Run:

```bash
rg -n "\| 二期助手 \||默认入口.*二期助手|label.*二期助手|key: \"assistants\"|当前角色隐藏|角色暂不展示" AGENTS.md docs/prd docs/superpowers/specs/2026-06-10-enterprise-portal-role-workbench-ia.md docs/superpowers/specs/2026-06-10-customer-growth-pipeline-frontend-ia.md
```

Expected: no matches.

- [ ] **Step 2: 检查关键新增规则**

Run:

```bash
rg -n "手动录入客户线索|新建线索|无权限.*不展示|解释性文字|数据库终局|客户需求表|4 套整体风格|简约大气|科技高级感|绚烂花哨|稳重政企" AGENTS.md docs/prd docs/superpowers/specs docs/superpowers/plans/2026-06-10-role-permission-full-system-refactor.md
```

Expected: matches in current docs.

- [ ] **Step 3: Commit**

```bash
git status --short
git add AGENTS.md docs/prd/教育服务业务系统PRD-v1.md docs/prd/教育服务业务系统原型结构-v1.md docs/superpowers/specs/2026-06-10-enterprise-portal-role-workbench-ia.md docs/superpowers/specs/2026-06-10-customer-growth-pipeline-frontend-ia.md docs/superpowers/plans/2026-06-10-role-permission-full-system-refactor.md
git commit -m "固化角色权限最终计划"
```

### Task 2: 设计并落实数据库终局模型

**目标：** 按客户需求表从零闭合核心数据表，同时兼容现有 API。

**Files:**
- Modify: `backend/app/models/*.py`
- Modify: `backend/app/schemas/*.py`
- Modify: `backend/app/services/seed_service.py`
- Test: `backend/tests/test_api_smoke.py`

- [ ] **Step 1: 对照第 4 节表清单审计现有 models**
- [ ] **Step 2: 新增缺失表，优先新增不破坏既有字段**
- [ ] **Step 3: 更新 seed 数据覆盖客户、员工、学生、活动、报告、权限**
- [ ] **Step 4: 运行后端测试**

Run:

```bash
cd backend
python -m pytest -v
```

- [ ] **Step 5: Commit**

```bash
git status --short
git add backend/app/models backend/app/schemas backend/app/services/seed_service.py backend/tests
git commit -m "落实核心业务数据库表结构"
```

### Task 3: 重构角色权限导航

**目标：** 前端无权限入口直接不展示，移除“二期助手”一级入口。

**Files:**
- Modify: `frontend/src/navigation.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/LoginPage.tsx`
- Modify: `frontend/src/pages/BackofficeShellPage.tsx`

- [ ] **Step 1: 定义新后台 page key**

包括：

- `customerGrowth`
- `customer360`
- `employeeWorkspace`
- `teacherStudentService`
- `studentService`
- `managementDashboard`
- `systemGovernance`

- [ ] **Step 2: 按角色定义默认入口**

顾问进入 `customerGrowth`，员工进入 `employeeWorkspace`，老师进入 `teacherStudentService`，学生进入 `studentService`，管理者进入 `managementDashboard`，管理员进入 `systemGovernance`。

- [ ] **Step 3: 删除禁用导航展示**

只 map 当前角色可见页面，不渲染不可见页面。

- [ ] **Step 4: 运行前端构建**

```bash
cd frontend
npm.cmd run build
```

- [ ] **Step 5: Commit**

```bash
git status --short
git add frontend/src/navigation.ts frontend/src/App.tsx frontend/src/pages/LoginPage.tsx frontend/src/pages/BackofficeShellPage.tsx
git commit -m "重构角色权限导航入口"
```

### Task 4: 补齐顾问客户增长核心操作

**目标：** 顾问可手动录入客户线索，并完成研判、推荐、跟进、任务和阶段流转入口。

**Files:**
- Modify: `frontend/src/pages/CustomerGrowthPage.tsx`
- Modify: `frontend/src/pages/Customer360Page.tsx`
- Modify: `frontend/src/api/client.ts` if needed
- Modify/Test backend lead/crm/profile files if API missing

- [ ] **Step 1: 在顾问页首屏加入“新建线索”主按钮和表单**
- [ ] **Step 2: 支持粘贴客户资料并触发研判**
- [ ] **Step 3: 确保客户列表可进入客户 360**
- [ ] **Step 4: 确保跟进、任务、阶段操作入口可见**
- [ ] **Step 5: 运行前后端验证**

```bash
cd frontend
npm.cmd run build
```

If backend touched:

```bash
cd backend
python -m pytest -v
```

- [ ] **Step 6: Commit**

```bash
git status --short
git add frontend/src/pages/CustomerGrowthPage.tsx frontend/src/pages/Customer360Page.tsx frontend/src/api/client.ts backend/app backend/tests
git commit -m "补齐顾问客户线索录入闭环"
```

### Task 5: 建立员工、老师、学生差异化后台

**目标：** 将企业智能助手和学生智能助手拆入真实角色业务页面。

**Files:**
- Create: `frontend/src/pages/EmployeeWorkspacePage.tsx`
- Create: `frontend/src/pages/TeacherStudentServicePage.tsx`
- Create: `frontend/src/pages/StudentServicePage.tsx`
- Modify: `frontend/src/pages/BackofficeShellPage.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: 员工页实现客户快捷操作、日报、组织架构、新人指南**
- [ ] **Step 2: 老师页实现请假、反馈、心理预警、学业/进度待办**
- [ ] **Step 3: 学生页实现请假、反馈、进度、考务、生活支持**
- [ ] **Step 4: 删除业务页面内解释性长文**
- [ ] **Step 5: 运行前端构建**

```bash
cd frontend
npm.cmd run build
```

- [ ] **Step 6: Commit**

```bash
git status --short
git add frontend/src/pages/EmployeeWorkspacePage.tsx frontend/src/pages/TeacherStudentServicePage.tsx frontend/src/pages/StudentServicePage.tsx frontend/src/pages/BackofficeShellPage.tsx frontend/src/styles.css
git commit -m "建立员工老师学生差异化后台"
```

### Task 6: 重排管理者和管理员后台

**目标：** 管理者看经营和报告，管理员看治理和演示控制。

**Files:**
- Create: `frontend/src/pages/ManagementDashboardPage.tsx`
- Create/Modify: `frontend/src/pages/SystemGovernancePage.tsx`
- Modify: `frontend/src/pages/SystemDemoPage.tsx` if retained as child
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: 管理者页展示指标、报告和风险队列**
- [ ] **Step 2: 管理员页展示用户、角色、权限、审计、知识来源、OpenAPI、seed、fallback**
- [ ] **Step 3: 保证管理者不看到 seed 写操作**
- [ ] **Step 4: 运行前端构建**

```bash
cd frontend
npm.cmd run build
```

- [ ] **Step 5: Commit**

```bash
git status --short
git add frontend/src/pages/ManagementDashboardPage.tsx frontend/src/pages/SystemGovernancePage.tsx frontend/src/pages/SystemDemoPage.tsx frontend/src/styles.css
git commit -m "重排经营管理和系统治理后台"
```

### Task 7: 前端 UI 效果图和布局验证

**目标：** 使用前端 UI 相关 skill 重排界面，并先生成至少 4 套整体风格效果图。

**Files:**
- Modify: `frontend/src/styles.css`
- Modify: role page files as needed
- Create: screenshots under ignored or documented output path if needed

- [ ] **Step 1: 使用 frontend-design skill 输出 4 套视觉方向**

必须至少包含：

- 简约大气：留白克制、信息层级清楚、适合长期办公。
- 科技高级感：数据感更强、对比更明确、适合展示智能能力。
- 绚烂花哨：更强视觉冲击、适合官网和路演，但后台仍需可用。
- 稳重政企：可信、克制、适合国企/教育服务背景。

每套风格都要说明适用场景、优缺点和对官网/后台的影响。

- [ ] **Step 2: 启动前端开发服务器**

```bash
cd frontend
npm.cmd run dev
```

- [ ] **Step 3: 生成效果图**

每套风格至少覆盖：

- 官网首页
- 登录页
- 顾问客户增长
- 员工工作台
- 老师学生服务工作台
- 学生服务台
- 管理者经营后台
- 管理员系统治理

- [ ] **Step 4: 用户确认最终风格后再实现**

确认前不得把某一版风格直接写入正式前端。

- [ ] **Step 5: 检查布局**

要求：

- 无大面积空白。
- 无长列表堆叠遮挡。
- 无“当前角色隐藏”。
- 文案精简。
- 每个角色首屏有主要操作。

- [ ] **Step 6: 运行前端构建**

```bash
cd frontend
npm.cmd run build
```

- [ ] **Step 7: Commit**

```bash
git status --short
git add frontend/src frontend/package.json frontend/package-lock.json
git commit -m "优化角色后台界面布局"
```

### Task 8: 全链路最终验收

**目标：** 确认客户需求表没有遗漏，前后端可构建测试，角色权限和数据库闭环成立。

- [ ] **Step 1: 需求覆盖扫描**

确认以下关键词在 PRD、原型、实现中均可追踪：

- 客户研判
- 客服 Agent
- 企业智能助手
- 学生智能助手
- 智能报告
- 手动录入客户线索
- 请假审批
- 投诉处理
- 心理辅助预警
- 员工日报
- 活动报名

- [ ] **Step 2: 前端构建**

```bash
cd frontend
npm.cmd run build
```

- [ ] **Step 3: 后端测试**

```bash
cd backend
python -m pytest -v
```

- [ ] **Step 4: 最终 commit**

```bash
git status --short
git add .
git commit -m "完成角色权限业务系统重构验收"
```

## 6. 风险和处理

| 风险 | 处理 |
| --- | --- |
| 继续按阶段命名导致入口混乱 | 所有用户可见入口按角色和任务命名 |
| 顾问缺少新建线索 | 每次客户增长改动强制检查“新建线索” |
| 需求只在文档存在 | 每项需求必须绑定页面、API、数据表 |
| UI 又出现大空白 | 效果图阶段先验收布局，再实现细节 |
| 权限只做前端隐藏 | 后端关键接口逐步补权限校验入口 |
| 数据库表遗漏 | 以第 4 节终局表清单做模型审计 |

## 7. 执行选择

推荐使用 **Subagent-Driven**：每个 Task 独立执行、验证、提交，再进入下一个 Task。

如当前会话内执行，使用 **Inline Execution**：按 Task 顺序推进，每个 Task 完成后汇报验证结果和 commit。
