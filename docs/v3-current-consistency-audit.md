# V3 当前共识一致性审计

审计日期：2026-06-14

## 1. 审计目的

这份文档只解决一个问题：后续继续落地 V3 时，先确认“应该按哪版方案做、代码已经到哪一步、哪些文档只是历史参考、哪些地方会造成返工”。

它不是新的 PRD，也不是新的实施计划。后续执行仍以 `AGENTS.md`、PRD/原型结构、活跃设计文档、当前批次计划和验收计划为准。

## 2. 本次假设、取舍和成功标准

假设：

- 当前目标是做一致性审计，不继续扩功能。
- 当前分支以 `main` 工作区现状为准。
- 已存在的未提交残留文件不属于本次审计提交范围。

取舍：

- 只记录能被当前文档、代码、测试或命令输出支撑的结论。
- 对不一致点先标记风险，不在审计文档提交里顺手修业务代码或 UI。
- `docs/superpowers/` 下早期 specs/plans 可以作为历史线索；若与 `AGENTS.md`、PRD/原型结构、活跃设计文档和当前验收计划冲突，以后者为准。

成功标准：

- 后续线程能从本文件快速判断 V3 最新共识、已实现基础和下一批入口。
- 明确列出当前发现的不一致和返工风险。
- 本次提交只包含审计文档，不混入现有残留脏文件。

## 3. 当前文档优先级

| 状态 | 文档 | 用法 |
| --- | --- | --- |
| ACTIVE | `AGENTS.md` | 当前项目规则、角色边界、架构边界、提交和验证要求。 |
| ACTIVE | `docs/prd/教育服务业务系统PRD-v1.md` | 业务范围和角色需求来源。 |
| ACTIVE | `docs/prd/教育服务业务系统原型结构-v1.md` | 官网、登录、后台角色入口和页面结构来源。 |
| ACTIVE | `docs/business-flow-test-plan.md` | 最终业务链路验收和 B1-B12 闭环验收口径。 |
| ACTIVE | `docs/test-object-claim-table.md` | 多人验收对象认领、测试账号和管理员边界。 |
| ACTIVE | `docs/verification-checklist.md` | 最终 B1-B12 验收准备执行清单，区分自动化/人工、SQLite/MySQL、Dify fallback/真实 Dify。 |
| ACTIVE | `docs/v3-final-acceptance-readiness.md` | 最终 B1-B12 验收准备矩阵，覆盖角色边界、API/对象、上线配置项和风险。 |
| ACTIVE | `docs/mysql-migration-readiness.md` | SQLite 到 MySQL 的迁移准备、Alembic baseline 和空库验证流程。 |
| ACTIVE | `docs/deployment-delivery-runbook.md` | 部署交付、环境变量、启动、CORS、健康检查、生产初始化、备份恢复和演示 seed 边界。 |
| ACTIVE | `docs/superpowers/specs/2026-06-13-agent-requirement-coverage-design.md` | Agent 需求覆盖、Dify 批次、资料来源和后续批次范围。Batch 状态需随提交持续更新。 |
| ACTIVE | `docs/superpowers/specs/2026-06-14-enterprise-agent-command-design.md` | 企业助手 AI 指挥台专项设计和验收方向。 |
| REFERENCE | `docs/superpowers/plans/2026-06-13-v3-production-foundation-batch1.md` | Batch 1 执行轨迹和文件清单。批次一已标记完成，后续不应把未勾选框当作当前未完成事实。 |
| REFERENCE | `docs/superpowers/plans/2026-06-14-enterprise-agent-command-implementation.md` | 企业助手指挥台专项计划。当前需与最新专项检查结果一起使用。 |
| ACTIVE | `docs/dify/education-service-agent.yml` | Dify YAML 初版配置来源，当前覆盖公开客服、企业新人指南、学生生活支持、客户研判、报告解释 5 个 app 场景。 |

## 4. 当前最新共识

1. 产品入口是 `公开官网门户 -> 登录入口 -> 按权限进入对应业务后台`。
2. 管理员只负责系统治理，不作为顾问、员工、老师、学生、管理者业务入口合集。
3. 测试账号只用于验收和演示视角，不代表生产普通账号可以切换角色。
4. 后端保持 FastAPI + SQLAlchemy 分层，API 层薄，业务规则进 service。
5. API 正常和错误响应都应保持 `{ code, msg, data }` envelope。
6. 前端请求统一经过 `frontend/src/api/client.ts`。
7. V3 生产基础顺序已经收口为：Alembic/MySQL baseline -> auth/session -> RBAC/data scope -> frontend token/login -> Agent contract -> Dify YAML/UI。
8. Agent 写操作必须走“生成草稿或识别动作 -> 用户确认 -> 调用 API -> 写入业务记录或审计”的路径，不能由 AI 直接写业务表。
9. Dify 是后续主要问答和知识检索方向；本地规则、模板和 fallback 只作为 Dify 未配置或异常时的兜底。
10. 普通业务页不展示“真实 API、fallback、seed、OpenAPI、V2/V3”等实现话术；系统治理页可以展示必要运行状态。

## 5. 已实现并有本次复核证据

### 5.1 Alembic/MySQL baseline

证据：

- `python -m alembic current` 输出 `19582c185ae7 (head)`。
- `python -m alembic heads` 输出 `19582c185ae7 (head)`。
- `docs/mysql-migration-readiness.md` 已写明生产建表以 Alembic 为准，当前 head 为 `19582c185ae7`。

结论：后端已具备继续做 MySQL 空库建表验证的迁移基础，但这不等同于历史 SQLite 数据迁移已经完成。

### 5.2 真实登录、token 和前端 shared client

证据：

- `frontend/src/api/client.ts` 已承接 token 保存、请求注入 Bearer 和 401 清理。
- `frontend/src/pages/LoginPage.tsx` 已调用 `/api/auth/login` 并按返回用户映射账号/角色。
- `frontend/src/App.tsx` 退出路径已清理登录 token。
- `cd frontend && npm.cmd run test:auth`：15 passed。

结论：Task 5 的前端 token 注入和登录接入已落地，并被 auth 测试覆盖。

### 5.3 RBAC、数据范围和后端 Agent 契约

证据：

- `backend/app/core/permissions.py` 已有 token 权限依赖。
- `backend/tests/test_rbac_scope_api.py` 覆盖 Bearer token、角色权限和数据范围拒绝。
- `backend/tests/test_agent_contract_api.py` 覆盖 Agent `request_context`、`requires_confirmation`、草稿/确认契约。
- 最近提交包含 `fix: 收紧学生服务写操作权限`、`fix: 收紧后台受保护接口真实登录权限`、`feat: 前端接入登录token`、`docs: 标记V3批次一完成状态`。

结论：Batch 1 的生产基础已经可以支撑后续 Dify、Agent UI 和业务闭环继续推进。

## 6. 仍是设计或待实现的内容

1. Dify 真实接入还未完成最终验收。当前已有 YAML 五类场景、Dify client 输入基础、内部场景权限边界和 fallback 记录，但真实 Dify key、app、dataset 仍需上线配置后验收。
2. `docs/dify/education-service-agent.yml` 已覆盖 5 个 app 场景：公开客服、企业新人指南、学生生活支持、客户研判、报告解释。客户研判和报告解释后续仍需与对应业务 Agent 面板、报告解释入口和真实 Dify 数据集继续联调。
3. 官网客服 Agent 7 类公开咨询覆盖、活动报名联动和业务化来源展示仍需按验收计划跑真实链路。
4. 企业新人指南真实资料接入需要继续确认，不能只停留在静态新人指南页面。
5. 学生/老师 Agent 已完成一轮后端和前端承接：后端 `/api/student-assistant/chat` 已收紧为 token 身份和学生数据范围校验；前端学生服务台已有 `student-agent-panel` 承接请假草稿、反馈草稿、进度查询和生活支持，老师学生服务工作台已有 `teacher-agent-panel` 承接待审批请假、待处理反馈、心理预警跟进和确认处理入口。后续仍需继续深化动作草稿确认的后端统一契约。
6. 客户研判 Agent 和报告 Agent 已完成前端承接：客户增长页通过 `customer_assessment` scene 生成研判依据与跟进建议，报告中心通过 `report_assistant` scene 解释本期变化并定位待处理对象；真实 Dify 数据集命中率仍需上线配置后验收。
7. 业务闭环补洞已完成通知部分：通知列表返回业务对象跳转地址，后端支持标记已读和处理完成，系统治理通知页已接入对应动作和打开对象入口；报告历史筛选、负责人分配联动、归档或软删除策略仍需继续补。
8. Dify 同步预留已完成配置健康、同步任务重试和治理页状态承接；真实 Dify key、app、dataset 配置后仍需验收真实同步命中率。
9. PDF/Word 报告导出已完成接口、前端动作和审计记录；部署交付文档、环境变量说明、CORS 配置承接、健康检查说明、生产初始化边界、备份恢复流程和轻量验证测试已完成。
10. 最终 B1-B12 验收准备已补 `docs/verification-checklist.md`、`docs/v3-final-acceptance-readiness.md` 和轻量文档覆盖测试；B1-B12 人工全链路验收仍是后续工作，且 SQLite 与 MySQL、Dify 未配置 fallback 与真实 Dify 结果必须分开记录。

## 7. 当前发现的不一致和返工风险

### 7.1 企业助手 AI 指挥台专项检查已收口

2026-06-15 复核命令：

```powershell
cd D:\00_Project\jiaoyu_lxfw\frontend
node tests\employee_agent_command_check.js
node tests\navigation_check.js
node tests\employee_guide_layout_check.mjs
npm.cmd run build
```

结果：全部通过。

当前状态：

- `frontend/src/pages/EmployeeAgentPanel.tsx` 已有 `enterprise-agent-shell`、`enterprise-agent-main`、对话区、当前任务队列、确认同步等结构。
- `frontend/src/pages/BackofficeShellPage.tsx` 已在企业助手页使用 `agent-workspace-grid` 和 `agent-content-frame`。
- `frontend/src/styles.css` 已补齐 `.agent-workspace-grid` 专用窄导航布局，保留中央 AI 工作区和右侧当前任务队列的两列结构。

判断：企业助手专项验收规则已对齐，后续学生/老师 Agent、客户研判 Agent 和报告 Agent 可复用“窄导航 + 中央 AI 工作区 + 贴近结果的任务队列”结构，不需要在本批重做新人指南布局或整体视觉。

### 7.2 Dify YAML 覆盖范围已收口，真实同步仍待配置

2026-06-15 批次二已将 YAML 扩展为 5 个 app 场景，并补充后端 scene inputs、内部场景权限边界、客户研判/报告解释 fallback 和知识来源默认登记。

后续继续做 Dify 真实同步批次时，重点不再是“是否扩成五类场景”，而是：

- 配置真实 Dify key、app 和 dataset；
- 校验各场景是否命中对应知识来源；
- 在系统治理页呈现同步状态、失败原因和重试入口；
- 保持 Dify 不可用时的可解释 fallback，不阻断 CRM、研判、活动和报告主业务。

### 7.3 学生助手后端身份边界已收紧

2026-06-15 批次四后端先收口学生助手对话入口：

- `/api/student-assistant/chat` 现在必须携带具备 `assistant:student:use` 权限的 Bearer token。
- 服务端使用当前 token 用户覆盖请求体中的 `actor_username`，避免前端伪造操作者身份。
- 对话前复用学生数据范围校验；学生演示账号仅允许访问自己的演示学生档案，不获得全量学生访问权。

后续学生/老师 Agent 批次仍需继续补前端面板、动作草稿确认和老师处理型入口。

### 7.4 Agent 覆盖设计文档状态行已清理

`docs/superpowers/specs/2026-06-13-agent-requirement-coverage-design.md` 的 `6.2 第二批` 状态行已替换为明确批次状态。后续继续维护时应保持以下信息随提交更新：

- 已完成什么；
- 当前 YAML 覆盖哪些场景；
- 还缺哪些场景；
- 下一批验收命令是什么。

当前该乱码状态行已清理；后续维护重点是让批次状态随提交更新，不只停留在聊天里。

### 7.5 PDF/Word 报告导出已收口

2026-06-15 报告导出批次已完成：

- `GET /api/reports/{report_id}/export?format=pdf|docx` 复用 `report:snapshot:read` 权限，返回 `filename`、`content_type`、`content_base64`、`export_id` 和文件大小。
- 服务层使用标准库生成 PDF/DOCX 内容，不引入新依赖，不新增迁移；导出审计动作为“导出报告快照”。
- 报告中心详情区已提供“导出 PDF”和“导出 Word”动作，导出失败会保留当前报告上下文。

复核命令：

```powershell
cd D:\00_Project\jiaoyu_lxfw\backend
python -m pytest tests/test_report_center_api.py -v
cd D:\00_Project\jiaoyu_lxfw\frontend
node tests\customer_report_agent_check.js
```

结果：全部通过。

### 7.6 部署交付已收口

2026-06-15 部署交付批次已完成：

- 新增 `docs/deployment-delivery-runbook.md`，覆盖后端启动、前端启动、环境变量、Dify、MySQL、Alembic、CORS/域名、健康检查、生产初始化、演示 seed 边界、备份和恢复。
- `backend/app/main.py` 的 CORS 允许来源已改为读取 `backend/app/core/config.py` 中的 `settings.cors_origin_list`，生产域名通过 `CORS_ORIGINS` 配置。
- `backend/.env.example` 已补生产 CORS 示例和五类 Dify app 映射；`frontend/.env.example` 已补 `VITE_API_BASE`。
- 新增 `backend/tests/test_deployment_delivery.py`，验证 CORS 环境变量解析和部署 runbook 必要主题覆盖。

复核命令：

```powershell
cd D:\00_Project\jiaoyu_lxfw\backend
python -m pytest tests/test_deployment_delivery.py -v
```

结果：2 passed。

### 7.7 历史计划 checkbox 不应再作为唯一事实

`docs/superpowers/plans/2026-06-13-v3-production-foundation-batch1.md` 内仍有大量 `- [ ]` 步骤，这是执行计划模板痕迹。当前事实应以最近提交、测试结果和 `agent-requirement-coverage-design.md` 中的批次完成状态为准。

### 7.8 最终 B1-B12 验收准备已落位

2026-06-15 最终 B1-B12 验收准备批次已完成：

- 新增 `docs/verification-checklist.md`，把 B1-B12 链路、自动化验证、人工浏览器验收、SQLite 验收、MySQL 验收、Dify 未配置 fallback、真实 Dify 验收、导出和部署证据口径统一到一份清单。
- 新增 `docs/v3-final-acceptance-readiness.md`，把 B1-B12 的角色边界、前端入口、API/对象、已自动验证、需人工验收、上线配置项和已知风险补成矩阵。
- 新增 `backend/tests/test_final_acceptance_readiness.py`，检查 B1-B12 用例仍在业务动线计划中，并验证最终验收准备文档覆盖执行清单、角色边界、API/对象、上线配置项和风险。
- 本批只做最终验收准备，不代表 B1-B12 人工浏览器验收或真实 MySQL、真实 Dify 验收已经通过。

## 8. 后续执行建议

1. 新线程入口先读：`AGENTS.md`、本审计文档、当前要执行的 batch plan 或专项 design。
2. 每个新 batch 开始前先写三句话：本批假设、取舍、成功标准。
3. 执行最终验收时先使用 `docs/v3-final-acceptance-readiness.md` 确认 B1-B12 角色边界、入口、API/对象和风险，再用 `docs/verification-checklist.md` 认领证据，并按 `docs/business-flow-test-plan.md` 和 `docs/test-object-claim-table.md` 逐项记录对象 ID。
4. Dify 批次开始前先清理 Agent 覆盖设计文档的乱码状态行，并决定 YAML 是扩到五类场景还是分阶段补齐。
5. 企业助手指挥台应单独收口，不要混进 Dify 接入或客服 Agent 验收。
6. 后续提交仍按当前项目规则：先查 `git status`，只 stage 当前任务相关文件，中文 commit。

## 9. 本次审计复核命令

```powershell
cd D:\00_Project\jiaoyu_lxfw\frontend
npm.cmd run test:auth
```

结果：15 passed。

```powershell
cd D:\00_Project\jiaoyu_lxfw\frontend
node tests\employee_agent_command_check.js
```

结果：失败，`企业助手样式缺少布局规则: .agent-workspace-grid`。这是本审计记录的不一致项。

```powershell
cd D:\00_Project\jiaoyu_lxfw\backend
python -m alembic current
python -m alembic heads
```

结果：二者均为 `19582c185ae7 (head)`。
