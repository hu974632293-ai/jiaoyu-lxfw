# 教育服务业务系统生产级闭环补齐计划

## 1. 计划定位

本计划用于把当前“演示级闭环”推进到“生产级多角色业务闭环”。它不替代 `docs/prd/教育服务业务系统PRD-v1.md` 和 `docs/prd/教育服务业务系统原型结构-v1.md`，只定义当前阶段的补齐顺序、成功标准和验证方式。

当前判断：

- 项目已具备公开官网、登录入口、角色后台、CRM、学生服务、企业助手、活动、报告、权限表等基础骨架。
- 后端测试和前端构建当前可通过。
- 主要短板不是“跑不起来”，而是业务对象在多角色之间缺少完整的创建、查询、详情、处理、修改、回显和留痕。

## 2. 总成功标准

1. 刷新后可恢复当前业务位置，包括官网子页、登录角色、后台模块和关键业务对象 ID。
2. 请假、反馈、成绩、日报、活动报名、CRM 跟进等核心对象具备跨角色闭环。
3. 普通业务角色页面不暴露实现话术，只展示业务语言和必要状态。
4. 所有写操作经过 service 层规则校验，并记录必要审计或处理历史。
5. 每个阶段完成后运行对应验证命令，并创建中文 Git commit。

## 3. 阶段计划

### 阶段一：刷新状态保持

目标：

- 为公开官网子页、登录角色、后台模块和关键业务对象 ID 建立可恢复状态。
- 刷新、前进后退和直接访问不会无条件回到官网首页。

建议范围：

- `frontend/src/App.tsx`
- `frontend/src/navigation.ts`
- 必要时调整后台导航和客户 360 入口参数。

验证：

- 前端构建：`cd frontend && npm.cmd run build`
- 手动链路：进入顾问客户 360、老师工作台、学生服务台后刷新，仍停留对应业务位置。

Commit 建议：

- `修复后台刷新状态保持`

### 阶段二：学生服务请假与反馈闭环

目标：

- 请假支持独立创建、列表、详情、修改、撤销/归档、审批记录和学生端状态回显。
- 反馈工单支持列表、详情、处理、补充回复、关闭/归档和处理历史。
- 老师端从“单按钮处理”升级为可查询、可选中、可处理的待办工作台。

建议范围：

- `backend/app/models/student.py`
- `backend/app/schemas/student_assistant.py`
- `backend/app/services/student_assistant_service.py`
- `backend/app/api/routes_student_assistant.py`
- `backend/tests/test_student_assistant_api.py`
- `frontend/src/pages/StudentServicePage.tsx`
- `frontend/src/pages/TeacherStudentServicePage.tsx`

验证：

- 后端测试：`cd backend && python -m pytest -v`
- 前端构建：`cd frontend && npm.cmd run build`
- 手动链路：学生提交请假或反馈，老师查询详情并处理，学生刷新后看到最新状态。

Commit 建议：

- `完善学生服务审批闭环`

### 阶段三：成绩查询与录入

目标：

- 落地 `student_grade` 的 schema、service、API 和测试。
- 老师可录入和修改成绩。
- 学生可只读查询自己的成绩。

建议范围：

- `backend/app/models/student.py`
- `backend/app/schemas/student_assistant.py`
- `backend/app/services/student_assistant_service.py`
- `backend/app/api/routes_student_assistant.py`
- `backend/tests/test_student_assistant_api.py`
- `frontend/src/pages/StudentServicePage.tsx`
- `frontend/src/pages/TeacherStudentServicePage.tsx`

验证：

- 后端测试：`cd backend && python -m pytest -v`
- 前端构建：`cd frontend && npm.cmd run build`
- 手动链路：老师录入成绩后，学生端成绩查询同步显示。

Commit 建议：

- `添加学生成绩查询和录入`

### 阶段四：顾问搜索与漏斗联动

目标：

- `GET /api/leads` 支持关键词、状态、负责人、来源和时间范围筛选。
- 顾问页搜索框提供结果提示或明确筛选结果。
- 漏斗节点点击后刷新或筛选下方客户列表。

建议范围：

- `backend/app/api/routes_leads.py`
- `backend/app/services/lead_service.py`
- `backend/tests/test_crm_api.py`
- `frontend/src/pages/CustomerGrowthPage.tsx`

验证：

- 后端测试：`cd backend && python -m pytest -v`
- 前端构建：`cd frontend && npm.cmd run build`
- 手动链路：点击漏斗阶段或输入关键词后，列表、数量和空状态同步变化。

Commit 建议：

- `完善顾问线索搜索和漏斗联动`

### 阶段五：官网活动同源与报名闭环

目标：

- 官网活动读取真实活动数据。
- 官网报名写入 `event_registration`。
- 后台活动名单、签到和顾问承接能看到同一报名数据。
- 梳理 `EventLecture/Event`、`EventCheckIn/EventCheckin` 双轨模型风险，保留一套清晰语义。

建议范围：

- `backend/app/models/event.py`
- `backend/app/services/event_service.py`
- `backend/app/api/routes_events.py`
- `backend/tests/test_event_api.py`
- `frontend/src/pages/PublicPortalPage.tsx`
- `frontend/src/pages/EventsPage.tsx`

验证：

- 后端测试：`cd backend && python -m pytest -v`
- 前端构建：`cd frontend && npm.cmd run build`
- 手动链路：官网活动报名后，后台活动名单可见并可签到。

Commit 建议：

- `打通官网活动报名闭环`

### 阶段六：员工日报周报与组织查询

目标：

- 员工日报支持列表、详情、按日期/员工/部门筛选。
- 管理者能查看日报日汇总和周汇总。
- 组织架构支持部门职责、同事联系方式、通讯录搜索和详情。

建议范围：

- `backend/app/models/enterprise.py`
- `backend/app/schemas/enterprise.py`
- `backend/app/services/enterprise_service.py`
- `backend/app/api/routes_enterprise_assistant.py`
- `backend/tests/test_enterprise_assistant_api.py`
- `frontend/src/pages/EmployeeWorkspacePage.tsx`
- `frontend/src/pages/ManagementDashboardPage.tsx`

验证：

- 后端测试：`cd backend && python -m pytest -v`
- 前端构建：`cd frontend && npm.cmd run build`
- 手动链路：员工提交日报，管理者按日/周查看；员工搜索部门或同事能返回结果。

Commit 建议：

- `完善员工日报周报和组织查询`

### 阶段七：权限执行与生产文案清理

目标：

- 建立当前用户和接口权限依赖，关键业务接口接入权限点。
- 普通业务页面移除“真实 API”“fallback”“原型数据”“seed”“OpenAPI”“template_rule”“后续 V2/V3”等实现话术。
- 管理员治理页保留系统状态，但不泄漏到官网、顾问、员工、老师、学生、管理者页面。

建议范围：

- `backend/app/services/admin_service.py`
- `backend/app/api/routes_users.py`
- `backend/app/api/routes_roles.py`
- 关键业务路由的权限依赖
- `frontend/src/pages/*`
- `frontend/src/data/prototype.ts`

验证：

- 后端测试：`cd backend && python -m pytest -v`
- 前端构建：`cd frontend && npm.cmd run build`
- 手动链路：无权限接口被拒绝；普通业务页面只展示业务语言。

Commit 建议：

- `落实权限校验并清理生产文案`

### 阶段八：语音输入与 AI 结构化

目标：

- 为客户快捷录入和口述日报提供语音输入入口。
- 语音先转文字，再生成结构化草稿。
- 结构化结果必须由用户确认后入库，不允许 AI 直接写入关键业务表。

建议范围：

- `frontend/src/pages/EmployeeWorkspacePage.tsx`
- `frontend/src/pages/CustomerGrowthPage.tsx`
- `backend/app/schemas/enterprise.py`
- `backend/app/services/enterprise_service.py`
- `backend/app/api/routes_enterprise_assistant.py`
- 必要时新增语音转写服务边界。

验证：

- 后端测试：`cd backend && python -m pytest -v`
- 前端构建：`cd frontend && npm.cmd run build`
- 手动链路：语音输入转文字，生成结构化草稿，用户确认后写入 CRM 或日报。

Commit 建议：

- `添加语音录入和结构化确认`

## 4. 不做事项

1. 不一次性重写全站 UI。
2. 不把阶段任务写入 `AGENTS.md`。
3. 不把 AI 输出直接作为诊断、审批或关键写库结果。
4. 不在普通业务页面展示内部实现状态。
5. 不提交 `教育服务/` 原始资料、数据库文件、`node_modules/`、`dist/` 或 IDE 文件。

## 5. 执行约束

1. 每个阶段独立验证、独立中文 commit。
2. 提交前只 stage 当前阶段相关文件。
3. 若验证失败，先修复再提交；无法修复时记录失败命令和原因，不创建成功型 commit。
4. 若发现需求和 PRD 冲突，先更新 PRD 或计划，再实现。
