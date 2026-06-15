# V3 角色助手前端自查报告

记录日期：2026-06-15

## 1. 本批目标

本批只认领“各角色 Agent/助手在前端是否按既定功能体现”的前端自查，并把新增验收项“所有输入型 Agent/助手支持回车发送消息”纳入验证。

## 2. 假设、取舍和成功标准

假设：
- 以 `AGENTS.md`、`docs/v3-current-consistency-audit.md`、当前前端代码和当前测试结果为准。
- 本批不配置真实 Dify key/app/dataset，不改生产 MySQL，不执行破坏性数据库操作。
- 用户同步做人工体验检查，本报告先提供代码结构、入口矩阵和自动化可验证证据。

取舍：
- 本批优先补齐“回车发送”这种明确交互缺口；角色助手入口、权限边界和工作区布局属于下一批修复范围，不在同一批大改。
- 浏览器实点验收需要本地 Vite 服务稳定运行；本轮前端 dev server 持久化启动不稳定，因此先记录为“待人工浏览器复核”，不把静态检查写成人工验收通过。
- 客户研判助手、报告解释助手和老师处理助手当前是按钮式/队列式面板，不是自由消息输入框；若验收标准要求“所有助手都能输入消息并回车发送”，这些页面仍需要后续补自由输入区。

成功标准：
- 明确列出游客、顾问、员工、老师、学生、管理者、管理员的助手入口现状和偏差。
- 对“回车发送消息”形成可运行前端测试，并让现有输入型助手通过。
- 不 stage 或提交既有残留文件，只提交本批报告、测试和必要交互修复。

## 3. 应有角色助手矩阵

| 角色 | 应有助手形态 | 关键任务 |
| --- | --- | --- |
| 游客/潜在客户 | 公开客服 Agent | 公司、业务、政策、项目、活动、FAQ、咨询、活动报名 |
| 顾问 | 客户研判/跟进助手 | 资料补齐、画像研判、项目推荐、跟进建议、任务创建、客户 360 |
| 员工 | 企业助手 | 客户快捷录入/查询/状态更新、口述日报、组织架构、新人指南、受控只读查询 |
| 老师 | 学生服务处理助手 | 请假审批、反馈处理、心理辅助预警跟进、学业节点和进度查看 |
| 学生 | 学生服务助手 | 请假、反馈、申请进度、考务成绩、生活支持问答、心理倾诉 |
| 管理者 | 报告解释/经营分析助手 | 增长、客户经营、员工日报、心理周报、投诉周报解释和待办定位 |
| 管理员 | 系统治理助手或治理问答 | 知识来源、同步状态、系统状态、审计和配置，不承担业务角色入口合集 |

## 4. 当前前端实现矩阵

| 角色 | 当前入口/组件 | 当前状态 | 结论 |
| --- | --- | --- | --- |
| 游客/潜在客户 | `PublicPortalPage.tsx` / `PublicAgentPanel` | 有公开客服 Agent 和消息输入框，已补 Enter 发送 | 基本具备，但仍需浏览器验证咨询和报名联动 |
| 顾问 | `CustomerGrowthPage.tsx` / `customer-assessment-agent` | 仅在客户增长页内嵌按钮式“客户研判助手” | 缺独立角色助手入口、自由消息输入和 AI 工作区形态 |
| 员工 | `EmployeeAgentPanel.tsx` + `BackofficeShellPage.tsx` / `employeeAgent` | 有专用企业助手入口、`agent-workspace-grid` 和输入框，已补 Enter 发送 | 当前最接近既定助手形态 |
| 老师 | `TeacherStudentServicePage.tsx` / `teacher-agent-panel` | 仅在学生服务工作台内嵌处理队列和确认按钮 | 缺独立老师助手入口、自由消息输入和 AI 工作区形态 |
| 学生 | `StudentServicePage.tsx` / `student-chat-panel` | 有学生服务输入框和 `/api/student-assistant/chat`，已补 Enter 发送 | 功能有承接，但导航名仍是“生活支持”，没有统一 Agent 工作区形态 |
| 管理者 | `ReportsPage.tsx` / `report-assistant-panel` | 仅报告页内嵌按钮式“报告解释助手” | 缺独立管理者报告助手入口、自由消息输入和 AI 工作区形态 |
| 管理员 | `KnowledgePage.tsx` / 场景问答 | 有治理侧知识库问答输入框，已补 Enter 发送 | 应保留为治理问答，不应替代业务角色助手 |

## 5. 高优先级问题

### P0-1 各角色专属助手入口没有完整体现

证据：
- `frontend/src/navigation.ts` 只有 `employeeAgent` 使用“企业助手”导航项。
- 顾问的客户研判、老师的处理助手、学生的服务助手、管理者的报告助手没有同等层级的专属助手入口。
- `frontend/src/pages/BackofficeShellPage.tsx` 只有 `activePage === "employeeAgent"` 使用 `agent-workspace-grid`。

影响：
- 用户按角色登录后，会看到员工企业助手较完整，但其他角色的智能能力散落在业务页中。
- 这会让“客户研判、学生智能助手、智能报告”看起来像附属按钮，而不是既定的角色助手能力。

建议：
- 下一批按角色补齐助手入口，不再只把员工企业助手作为唯一专用 Agent 页。
- 顾问、老师、学生、管理者复用“窄场景导航 + 中央 AI 工作区 + 右侧任务队列/结果”的结构。

### P0-2 企业助手权限边界与角色边界冲突

证据：
- `frontend/src/authRules.ts` 当前存在 `enterpriseCommonPages = ["employeeReports", "employeeOrg", "employeeGuide", "employeeAgent"]`。
- 顾问、老师、管理者可见页会混入企业助手、新人指南、组织架构、日报等员工工作台能力。

影响：
- 顾问、老师、管理者会看到员工企业助手入口，但这不是他们自己的客户研判助手、老师处理助手或报告助手。
- 管理者不应承接员工日常业务入口合集。

建议：
- 下一批先拆 `enterpriseCommonPages`，按角色显式声明自己的助手页和业务页。
- 测试账号可保留演示视角，但生产角色默认不应共享员工助手入口。

### P1-1 按钮式助手不满足“回车发送消息”的新验收口径

证据：
- `CustomerGrowthPage.tsx` 的“客户研判助手”只有“补齐研判依据/生成跟进建议”按钮，没有消息输入框。
- `ReportsPage.tsx` 的“报告解释助手”只有“解释本期变化/定位待处理对象”按钮，没有消息输入框。
- `TeacherStudentServicePage.tsx` 的“老师处理助手”是处理队列和确认按钮，没有消息输入框。

影响：
- 如果验收要求是“所有 Agent/助手都可以输入消息并回车发送”，上述页面仍不达标。
- 这些页面即使能调用后端，也不符合用户对“助手对话”的操作预期。

建议：
- 下一批为顾问、老师、管理者助手补自由输入区，并保持 `Enter` 发送、`Shift+Enter` 换行。
- 对按钮保留为快捷指令，不替代消息输入。

## 6. 本批已完成的回车发送修复

已补齐：
- `frontend/src/pages/PublicPortalPage.tsx`：公开客服 Agent 输入框支持 `Enter` 发送，`Shift+Enter` 换行。
- `frontend/src/pages/EmployeeAgentPanel.tsx`：企业助手输入框支持 `Enter` 发送，发送中或空输入不重复提交。
- `frontend/src/pages/StudentServicePage.tsx`：学生服务助手输入框支持 `Enter` 发送，处理中不重复提交。
- `frontend/src/pages/KnowledgePage.tsx`：管理员治理侧场景问答支持 `Enter` 发送，处理中不重复提交。

新增验证：
- `frontend/tests/agent_enter_send_check.js` 检查关键输入型助手是否存在键盘发送处理、`Enter`、`Shift+Enter`、`preventDefault` 和 textarea 绑定。

仍待下一批：
- 顾问客户研判助手、老师处理助手、管理者报告解释助手若要满足“可输入消息并回车发送”，需要先补自由输入框。

## 7. 浏览器验收状态

本轮尝试启动本地前端 dev server，但 5173 服务无法稳定保持，因此未把浏览器点击、截图和跨角色实测写成已通过。

待用户或下一批补充：
- 游客公开客服 Agent：输入问题，按 Enter 发送，确认回答展示。
- 员工企业助手：输入日报/组织架构/新人指南问题，按 Enter 发送，确认任务队列更新。
- 学生服务助手：输入请假、反馈、进度、生活支持问题，按 Enter 发送，确认回复与右侧记录更新。
- 管理员场景问答：输入知识库问题，按 Enter 发送，确认日志和回答更新。
- 顾问、老师、管理者：确认当前按钮式助手是否接受，或补自由消息输入作为下一批修复。

## 8. 建议下一批修复顺序

1. 拆除角色共享的 `enterpriseCommonPages`，避免顾问、老师、管理者误用员工企业助手入口。
2. 新增或重命名角色专属助手入口：顾问客户研判助手、老师处理助手、学生服务助手、管理者报告助手。
3. 复用 `agent-workspace-grid` 的窄导航和中央 AI 工作区结构，避免只在业务页右侧塞按钮。
4. 给顾问、老师、管理者助手补自由消息输入、快捷指令和结果队列，并统一 `Enter` 发送、`Shift+Enter` 换行。
5. 更新导航、权限、角色总览卡片和静态测试，保证侧边栏与总览入口指向同一套功能状态。

## 9. 本批验证命令

```powershell
cd D:\00_Project\jiaoyu_lxfw\frontend
node tests\agent_enter_send_check.js
npm.cmd run test:auth
node tests\navigation_check.js
node tests\employee_agent_command_check.js
node tests\student_teacher_agent_check.js
node tests\customer_report_agent_check.js
npm.cmd run build

cd D:\00_Project\jiaoyu_lxfw
git diff --check
```

## 10. 角色助手前端体现批次已完成

完成日期：2026-06-15

本批已把第 5 节中的高优先级问题推进到前端可验收状态：

- `frontend/src/navigation.ts` 新增 `consultantAgent`、`teacherAgent`、`studentAgent`、`managerAgent`，并保留 `employeeAgent`，侧边栏可按角色展示“客户研判助手、企业助手、老师处理助手、学生服务助手、报告解释助手”。
- `frontend/src/authRules.ts` 拆除顾问、老师、管理者默认共享员工企业助手的权限矩阵；管理员生产视图只保留系统治理入口，不再暴露业务角色助手合集。
- `frontend/src/pages/BackofficeShellPage.tsx` 将五类角色助手统一纳入 `agent-workspace-grid` / `agent-content-frame` 布局。
- `CustomerGrowthPage.tsx`、`TeacherStudentServicePage.tsx`、`ReportsPage.tsx` 已补自由输入区，支持 `Enter` 发送、`Shift+Enter` 换行；按钮保留为快捷指令。
- `frontend/tests/navigation_check.js`、`frontend/tests/authRules.test.mjs`、`frontend/tests/agent_enter_send_check.js`、`frontend/tests/customer_report_agent_check.js`、`frontend/tests/student_teacher_agent_check.js` 已覆盖本批结构。

仍需人工浏览器验收：

- 不同角色登录后侧栏是否只出现自己的助手入口。
- 顾问、老师、学生、管理者进入助手后，页面布局和输入体验是否符合业务使用习惯。
- 真实 Dify 配置后，客户研判、报告解释等 scene 的命中率和回答质量仍需单独验收。
