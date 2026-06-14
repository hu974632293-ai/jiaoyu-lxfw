# V3 最终 B1-B12 验收执行记录

更新日期：2026-06-15

## 1. 记录边界

本文件用于记录最终 B1-B12 的实际验收执行过程。它承接 `docs/business-flow-test-plan.md`、`docs/test-object-claim-table.md`、`docs/verification-checklist.md` 和 `docs/v3-final-acceptance-readiness.md`，但不替代人工验收结论。

假设：

- 当前不配置真实外部账号、真实 Dify key/app/dataset。
- 当前不执行破坏性数据库操作。
- 当前先落档自动化证据、人工记录模板和真实环境验收边界。

取舍：

- 自动化验证只证明代码、文档、构建和接口合同当前可追溯。
- 人工浏览器验收必须单独记录入口 URL、对象 ID、截图或说明。
- SQLite 与 MySQL 结果分开记录，不能把 SQLite 通过写成 MySQL 通过。
- Dify 未配置 fallback 与真实 Dify 验收分开记录，fallback 通过不等于真实 Dify 数据集命中通过。

成功标准：

- B1-B12 每条链路都有可填写的对象 ID、入口 URL、截图或说明、自动化验证、人工浏览器验收、数据库口径和 Dify 状态。
- 阻断问题和高优先级问题单独汇总。
- 当前自动化证据可追溯，但明确不替代人工验收。

## 2. 当前自动化验证记录

本轮记录只认领自动化证据，不替代人工验收，不替代 MySQL 验收，不替代真实 Dify 验收。

| 范围 | 命令 | 当前记录 |
| --- | --- | --- |
| 最终验收文档覆盖 | `python -m pytest tests\\test_final_acceptance_readiness.py -v` | 本批复核：9 passed |
| 后端完整回归 | `python -m pytest -v` | 本批复核：71 passed |
| 前端登录与权限 | `npm.cmd run test:auth` | 本批复核：15 passed |
| 后台导航结构 | `node tests\\navigation_check.js` | 本批复核：passed |
| 企业助手指挥台 | `node tests\\employee_agent_command_check.js` | 本批复核：passed |
| 新人指南布局 | `node tests\\employee_guide_layout_check.mjs` | 本批复核：1 passed |
| 客户研判与报告 Agent | `node tests\\customer_report_agent_check.js` | 本批复核：passed |
| 前端构建 | `npm.cmd run build` | 本批复核：passed |
| 差异质量 | `git diff --check` | 本批复核：passed，仅有 LF/CRLF 提示 |

## 3. B1-B12 执行记录表

| 编号 | 链路 | 对象 ID | 入口 URL | 截图或说明 | 自动化验证 | 人工浏览器验收 | 数据库口径 | Dify 状态 | 结论 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B1 | 官网活动报名到顾问承接 | 待记录 | 待记录 | 待记录 | 待复核 | 待执行 | SQLite 待记录；MySQL 待记录 | Dify 未配置 fallback；真实 Dify 待配置后复核 | 待执行 |
| B2 | 顾问新建线索到客户 360 | 待记录 | 待记录 | 待记录 | 待复核 | 待执行 | SQLite 待记录；MySQL 待记录 | 不适用或按客户研判 scene 记录 | 待执行 |
| B3 | 顾问跟进到管理者增长 | 待记录 | 待记录 | 待记录 | 待复核 | 待执行 | SQLite 待记录；MySQL 待记录 | 报告解释真实 Dify 待复核 | 待执行 |
| B4 | 员工快捷录入到顾问/管理者 | 待记录 | 待记录 | 待记录 | 待复核 | 待执行 | SQLite 待记录；MySQL 待记录 | 企业新人指南真实 Dify 待复核 | 待执行 |
| B5 | 员工日报到管理者日报 | 待记录 | 待记录 | 待记录 | 待复核 | 待执行 | SQLite 待记录；MySQL 待记录 | 不适用或按报告解释 scene 记录 | 待执行 |
| B6 | 学生请假到老师审批 | 待记录 | 待记录 | 待记录 | 待复核 | 待执行 | SQLite 待记录；MySQL 待记录 | 学生生活支持真实 Dify 待复核 | 待执行 |
| B7 | 学生反馈到老师处理 | 待记录 | 待记录 | 待记录 | 待复核 | 待执行 | SQLite 待记录；MySQL 待记录 | 学生生活支持真实 Dify 待复核 | 待执行 |
| B8 | 老师成绩录入到学生查询 | 待记录 | 待记录 | 待记录 | 待复核 | 待执行 | SQLite 待记录；MySQL 待记录 | 不适用 | 待执行 |
| B9 | 老师心理辅助预警到管理者周报 | 待记录 | 待记录 | 待记录 | 待复核 | 待执行 | SQLite 待记录；MySQL 待记录 | 学生生活支持和报告解释真实 Dify 待复核 | 待执行 |
| B10 | 报告生成到详情查看 | 待记录 | 待记录 | 待记录 | 待复核 | 待执行 | SQLite 待记录；MySQL 待记录 | 报告解释真实 Dify 待复核 | 待执行 |
| B11 | 活动创建到官网报名 | 待记录 | 待记录 | 待记录 | 待复核 | 待执行 | SQLite 待记录；MySQL 待记录 | 公开客服真实 Dify 待复核 | 待执行 |
| B12 | 项目维护到顾问推荐 | 待记录 | 待记录 | 待记录 | 待复核 | 待执行 | SQLite 待记录；MySQL 待记录 | 客户研判真实 Dify 待复核 | 待执行 |

### 3.1 本地对象级验收样例

本轮采集时间：2026-06-15；采集批次：`20260615023729-a0b4a5`。

当前运行库：`mysql+pymysql://127.0.0.1:3306/jiaoyu_lxfw?charset=utf8mb4`。本轮只记录本机 MySQL 演示库对象级 API 证据和本地浏览器入口，不代表生产真实 MySQL 上线验收已经完成；真实 MySQL 待上线配置后补验。

本地浏览器入口：统一以 `http://localhost:5173` 为前端入口记录。当前对象级证据由 FastAPI `TestClient` 调用现有接口采集，未启动长驻前端 dev server；人工浏览器步骤仍需验收人按下表 URL 打开、截图并复核刷新恢复。

待补原因：真实 Dify key/app/dataset 未配置，不能验证真实知识库命中率；真实 Dify 待 key/app/dataset 配置后补验。截图、三档视口、跨账号人工浏览器点击仍待执行。

| 编号 | 本地样例 | 对象级证据 | 本地浏览器入口 | 数据库口径 | Dify 状态 | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | B1 本地样例 | 活动 `14114`；报名 `55850`；自动生成线索 `56420`；已通过 `/api/events/{event_id}/registrations` 和 `/api/leads?source_channel=官网活动报名` 复核 | `http://localhost:5173/?public=events&eventId=14114` | 本机 MySQL 演示库对象级 API 通过；真实 MySQL 待上线配置后补验 | Dify 未配置 fallback 不阻断报名；真实 Dify 待 key/app/dataset 配置后补验 | 有条件通过：待人工浏览器截图和顾问侧回显复核 |
| B2 | B2 本地样例 | 顾问线索 `56421`；已通过 `/api/leads/{lead_id}` 和客户时间线复核 | `http://localhost:5173/backoffice?role=consultant&page=customer-growth&leadId=56421` | 本机 MySQL 演示库对象级 API 通过；真实 MySQL 待上线配置后补验 | 客户研判真实 Dify 待 key/app/dataset 配置后补验 | 有条件通过：待人工确认客户 360 URL 恢复 |
| B3 | B3 本地样例 | 线索 `56421`；跟进 `55892`；任务 `37310`；阶段 `high_potential`；已通过时间线复核 | `http://localhost:5173/backoffice?role=manager&page=growth&leadId=56421` | 本机 MySQL 演示库对象级 API 通过；真实 MySQL 待上线配置后补验 | 报告解释真实 Dify 待 key/app/dataset 配置后补验 | 有条件通过：待人工确认管理者增长指标或报告回显 |
| B4 | B4 本地样例 | 企业 Agent 确认动作日志 `525`；生成线索 `56422`；通过 `/api/enterprise-assistant/actions/confirm` 写入 | `http://localhost:5173/backoffice?role=employee&page=agent&leadId=56422` | 本机 MySQL 演示库对象级 API 通过；真实 MySQL 待上线配置后补验 | 企业新人指南真实 Dify 待 key/app/dataset 配置后补验 | 有条件通过：待人工确认员工入口、顾问承接和管理侧非孤立记录 |
| B5 | B5 本地样例 | 员工日报 `668`；日报汇总 `report_count=1`；已通过 `/api/enterprise-assistant/daily-reports/summary` 复核 | `http://localhost:5173/backoffice?role=manager&page=daily-reports&reportId=668` | 本机 MySQL 演示库对象级 API 通过；真实 MySQL 待上线配置后补验 | 报告解释真实 Dify 待 key/app/dataset 配置后补验 | 有条件通过：待人工确认管理者日报汇总页面回显 |
| B6 | B6 本地样例 | 学生 `23294`；请假 `23508`；审批状态 `已同意`；已通过请假详情复核 | `http://localhost:5173/backoffice?role=teacher&page=student-service&studentId=23294&leaveId=23508` | 本机 MySQL 演示库对象级 API 通过；真实 MySQL 待上线配置后补验 | 学生生活支持真实 Dify 待 key/app/dataset 配置后补验 | 有条件通过：待人工确认学生侧状态和老师队列同步 |
| B7 | B7 本地样例 | 学生 `23294`；反馈 `23428`；处理状态 `已处理`；已通过反馈详情复核 | `http://localhost:5173/backoffice?role=teacher&page=student-service&studentId=23294&ticketId=23428` | 本机 MySQL 演示库对象级 API 通过；真实 MySQL 待上线配置后补验 | 学生生活支持真实 Dify 待 key/app/dataset 配置后补验 | 有条件通过：待人工确认学生侧处理记录和通知跳转 |
| B8 | B8 本地样例 | 学生 `23294`；成绩 `69618`；已通过 `/api/student-assistant/students/{student_id}/grades` 复核 | `http://localhost:5173/backoffice?role=student&page=student-service&studentId=23294&gradeId=69618` | 本机 MySQL 演示库对象级 API 通过；真实 MySQL 待上线配置后补验 | 不适用 | 有条件通过：待人工确认学生只读成绩查询和刷新恢复 |
| B9 | B9 本地样例 | 学生 `23294`；学生助手意图 `psych_support`；风险等级 `中`；已通过老师任务队列复核 | `http://localhost:5173/backoffice?role=manager&page=reports&studentId=23294` | 本机 MySQL 演示库对象级 API 通过；真实 MySQL 待上线配置后补验 | 学生生活支持和报告解释真实 Dify 待 key/app/dataset 配置后补验 | 有条件通过：待人工确认管理者周报不出现诊断性表述 |
| B10 | B10 本地样例 | 报告 `9608` 客户经营、`9609` 日报汇总、`9610` 心理周报、`9611` 投诉周报；均已通过详情接口复核 | `http://localhost:5173/backoffice?role=manager&page=reports&reportId=9608` | 本机 MySQL 演示库对象级 API 通过；真实 MySQL 待上线配置后补验 | 报告解释真实 Dify 待 key/app/dataset 配置后补验 | 有条件通过：待人工确认详情展开、导出和刷新恢复 |
| B11 | B11 本地样例 | 后台活动 `14115`；官网报名 `55851`；自动生成线索 `56423`；已通过活动名单复核 | `http://localhost:5173/?public=events&eventId=14115` | 本机 MySQL 演示库对象级 API 通过；真实 MySQL 待上线配置后补验 | 公开客服真实 Dify 待 key/app/dataset 配置后补验 | 有条件通过：待人工确认官网可见、报名和后台名单同步 |
| B12 | B12 本地样例 | 项目 `14363`；复用线索 `56421`；已通过 `/api/projects/recommendations?tags=升学&tags=低成本` 命中推荐 | `http://localhost:5173/backoffice?role=consultant&page=customer-growth&leadId=56421&projectId=14363` | 本机 MySQL 演示库对象级 API 通过；真实 MySQL 待上线配置后补验 | 客户研判真实 Dify 待 key/app/dataset 配置后补验 | 有条件通过：待人工确认客户研判面板引用最新项目方向 |

## 4. 单条记录模板

| 字段 | 填写要求 |
| --- | --- |
| 验收编号 | 使用 B1 到 B12，必要时追加 U/P/C/K/E/T/ST/M/A/O/SYS 编号。 |
| 验收角色 | 写明创建方、处理方、只读复核方和使用账号。 |
| 入口 URL | 粘贴浏览器完整 URL，包含角色、页面和对象参数。 |
| 对象 ID | 记录客户、学生、活动、报名、请假、反馈、成绩、日报、报告、通知或审计 ID。 |
| 截图或说明 | 记录截图路径、截图编号或无法截图时的可复核说明。 |
| 自动化验证 | 写明命令、运行时间、结果和失败摘要。 |
| 人工浏览器验收 | 写明步骤、预期、实际、刷新后结果和跨角色回显。 |
| 数据库口径 | 明确 SQLite / MySQL；MySQL 需记录库名、Alembic head 和连接来源。 |
| Dify 状态 | 记录 Dify 未配置 fallback / 真实 Dify / 不适用；真实 Dify 需记录 app、scene 和数据集命中情况。 |
| 结论 | 通过 / 不通过 / 有条件通过 / 待执行。 |

## 5. 问题汇总

### 5.1 阻断问题

当前未记录阻断问题。人工验收开始后，任何导致 B1-B12 主链路无法创建、处理、回显、刷新恢复或持久化的问题必须写入此处。

| 编号 | 影响链路 | 严重度 | 现象 | 入口 URL | 对象 ID | 处理状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 待记录 | 待记录 | 阻断问题 | 待记录 | 待记录 | 待记录 | 待处理 |

### 5.2 高优先级问题

当前未记录高优先级问题。人工验收开始后，权限边界、数据同步、普通业务页实现话术、关键布局遮挡、真实 Dify 或 MySQL 失败应优先写入此处。

| 编号 | 影响链路 | 严重度 | 现象 | 入口 URL | 对象 ID | 处理状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 待记录 | 待记录 | 高优先级问题 | 待记录 | 待记录 | 待记录 | 待处理 |

## 6. 后续执行顺序

1. 重新运行本文件第 2 节的自动化验证命令并更新结果。
2. 按 `docs/test-object-claim-table.md` 认领对象，避免多人覆盖同一客户、学生、活动或报告。
3. 按 B1-B12 逐条执行人工浏览器验收，记录对象 ID、入口 URL、截图或说明。
4. 按当前运行库记录 SQLite 或 MySQL 结果；真实 MySQL 配置后单独补验。
5. 真实 Dify key/app/dataset 配置后，按五类 scene 分别记录真实 Dify 命中率、失败重试和 fallback 表现。
