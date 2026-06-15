# V3 角色助手前端自查报告

记录日期：2026-06-15

## 1. 本批目标

本批认领“各角色 Agent/助手在前端是否按既定功能体现”的前端修复与自查，并把新增验收项“所有输入型 Agent/助手支持回车发送消息”纳入验证。

## 2. 假设、取舍和成功标准

假设：
- 以 `AGENTS.md`、`docs/v3-current-consistency-audit.md`、当前前端代码和当前测试结果为准。
- 本批不配置真实 Dify key/app/dataset，不改生产 MySQL，不执行破坏性数据库操作。
- 用户同步做人工体验检查，本报告先提供代码结构、入口矩阵和自动化可验证证据。

取舍：
- 顾问、老师、学生、管理者助手不再套旧工作台页面，而是直接做独立助手页。
- 已确认员工 Agent 的结构和布局可复用到后续角色助手；本批按这个共识复用“窄侧栏 + 中央对话框 + 底部输入 + 右侧任务/能力卡”。
- 浏览器人工体验仍由用户侧确认；本地工具链的浏览器自动化在当前 Windows sandbox 下受限，本报告不把静态检查冒充成人工验收通过。

成功标准：
- 顾问、员工、老师、学生、管理者都有自己的助手入口和独立页面。
- 顾问、老师、学生、管理者助手复用员工 Agent 的对话框、输入框、场景切换和右侧任务区骨架。
- 角色功能词覆盖既定矩阵，且 `Enter` 发送、`Shift+Enter` 换行结构被测试锁住。
- Agent 页面侧边栏默认可收起，但点击后必须能展开。

## 3. 应有角色助手矩阵

| 角色 | 应有助手形态 | 关键任务 |
| --- | --- | --- |
| 游客/潜在客户 | 公开客服 Agent | 公司、业务、政策、项目、活动、FAQ、咨询、活动报名 |
| 顾问 | 客户研判/跟进助手 | 资料补齐、画像研判、项目推荐、跟进建议、任务创建、阶段更新、客户360 |
| 员工 | 企业助手 | 客户快捷录入/查询/状态更新、口述日报、组织架构、新人指南、受控只读查询 |
| 老师 | 学生服务处理助手 | 请假审批、反馈处理、心理预警、学业节点、申请进度、成绩查看 |
| 学生 | 学生服务助手 | 提交请假、提交反馈、申请进度、学业考务、生活支持、心理倾诉 |
| 管理者 | 报告解释/经营分析助手 | 增长总览、客户经营报告、员工日报汇总、学生心理健康周报、投诉处理周报、风险队列 |
| 管理员 | 系统治理助手或治理问答 | 知识来源、同步状态、系统状态、审计和配置，不承担业务角色入口合集 |

## 4. 当前前端实现矩阵

| 角色 | 当前入口/组件 | 当前状态 | 结论 |
| --- | --- | --- | --- |
| 游客/潜在客户 | `PublicPortalPage.tsx` / `PublicAgentPanel` | 有公开客服 Agent 和消息输入框，已补 Enter 发送 | 仍需浏览器验证咨询和报名联动 |
| 顾问 | `ConsultantAgentPage.tsx` / `consultantAgent` | 独立客户研判助手页，复用员工 Agent 的对话框、输入框、场景 tab 和右侧任务区 | 待人工体验确认 |
| 员工 | `EmployeeAgentPanel.tsx` / `employeeAgent` | 专用企业助手入口和已确认布局，已补 Enter 发送 | 作为其他角色助手复用基准 |
| 老师 | `TeacherAgentPage.tsx` / `teacherAgent` | 独立老师处理助手页，复用员工 Agent 的对话框、输入框、场景 tab 和右侧任务区 | 待人工体验确认 |
| 学生 | `StudentAgentPage.tsx` / `studentAgent` | 独立学生服务助手页，复用员工 Agent 的对话框、输入框、场景 tab 和右侧任务区 | 待人工体验确认 |
| 管理者 | `ManagerAgentPage.tsx` / `managerAgent` | 独立报告解释助手页，复用员工 Agent 的对话框、输入框、场景 tab 和右侧任务区 | 待人工体验确认 |
| 管理员 | `KnowledgePage.tsx` / 场景问答 | 治理侧知识库问答输入框已支持 Enter 发送 | 保留治理边界，不替代业务角色助手 |

## 5. 本批修复结论

已修复：
- `frontend/src/navigation.ts` 已有 `consultantAgent`、`employeeAgent`、`teacherAgent`、`studentAgent`、`managerAgent` 五类角色助手入口。
- `frontend/src/pages/BackofficeShellPage.tsx` 将五类角色助手映射到独立页面，不再把顾问、老师、学生、管理者助手套回旧业务工作台。
- `frontend/src/pages/roleAgentShell.tsx` 复用员工 Agent 的 `enterprise-agent-*` 页面骨架，保留对话框、输入框、场景切换和右侧执行区。
- `frontend/src/styles.css` 修复 Agent 页侧栏展开态，`sidebar-expanded` 不再被强制锁成收起宽度。
- `frontend/src/pages/ConsultantAgentPage.tsx` 覆盖资料补齐、画像研判、项目推荐、跟进建议、任务创建、阶段更新、客户360。
- `frontend/src/pages/TeacherAgentPage.tsx` 覆盖请假审批、反馈处理、心理预警、学业节点、申请进度、成绩查看。
- `frontend/src/pages/StudentAgentPage.tsx` 覆盖提交请假、提交反馈、申请进度、学业考务、生活支持、心理倾诉。
- `frontend/src/pages/ManagerAgentPage.tsx` 覆盖增长总览、客户经营报告、员工日报汇总、学生心理健康周报、投诉处理周报、风险队列。

仍需人工浏览器验收：
- 逐角色登录后，侧栏是否只出现对应角色的入口。
- 顾问、老师、学生、管理者助手的对话框、输入框和右侧任务卡是否与员工 Agent 的体验一致。
- 真实 Dify 配置后，客户研判、学生服务、报告解释等 scene 的命中率和回答质量。

## 6. 新增结构验证

新增 `frontend/tests/role_agent_pages_check.js`：
- 检查四个新增角色助手页存在并使用 `RoleAgentShell`。
- 检查每个角色助手覆盖既定功能词。
- 检查共享壳复用员工 Agent 的 `enterprise-agent-shell`、`enterprise-agent-conversation`、`enterprise-agent-dialog`、`enterprise-agent-input` 结构。
- 2026-06-15 复核修正：检查共享壳不再渲染右侧结果 article 或功能范围长列表，输入框必须位于对话容器内并紧跟 dialog，右侧只保留员工 Agent 等价的任务卡和本次事项上下文。
- 检查 Agent 页侧栏展开态不再被 CSS 强制成 76px。

相关既有验证：
- `frontend/tests/navigation_check.js` 防止助手入口再次映射回旧工作台页面。
- `frontend/tests/agent_enter_send_check.js` 覆盖输入型助手的回车发送结构。
- `frontend/tests/student_teacher_agent_check.js`、`frontend/tests/customer_report_agent_check.js` 保留学生/老师与客户/报告助手相关结构检查。

## 7. 本批验证命令

```powershell
cd D:\00_Project\jiaoyu_lxfw\frontend
node tests\role_agent_pages_check.js
node tests\navigation_check.js
npm.cmd run test:auth
node tests\agent_enter_send_check.js
node tests\employee_agent_command_check.js
node tests\student_teacher_agent_check.js
node tests\customer_report_agent_check.js
npm.cmd run build

cd D:\00_Project\jiaoyu_lxfw\backend
python -m pytest tests\test_final_acceptance_readiness.py -v

cd D:\00_Project\jiaoyu_lxfw
git diff --check
```
