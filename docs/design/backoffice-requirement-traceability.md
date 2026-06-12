# 后台需求覆盖追踪矩阵

## 1. 文档目的

本文件用于约束后台动线重构：本次调整不是删减需求，而是把 `教育服务/客户需求表.xlsx`、PRD 和原型结构中的需求重新分配到清晰的角色、页面和业务流程中。

后续任何页面移动、新增、隐藏或重构，都必须先能回答：

1. 服务哪个真实角色。
2. 承接哪个业务任务。
3. 对应哪个前端入口。
4. 调用哪个后端 API。
5. 落到哪个数据表。
6. 用什么验收标准证明完成。

## 2. 需求来源

| 来源 | 用途 | 备注 |
| --- | --- | --- |
| `教育服务/客户需求表.xlsx` | 最高业务需求来源 | 只读取，不纳入 Git |
| `docs/prd/教育服务业务系统PRD-v1.md` | 产品范围、角色边界、数据表和 API 分组 | 后续实现主依据 |
| `docs/prd/教育服务业务系统原型结构-v1.md` | 前端入口、页面结构和交互闭环标准 | 后台动线重构主依据 |
| `docs/design/前端视觉基线-v1.md` | 视觉风格边界 | 保留当前后台视觉，不换 UI 皮肤 |
| `docs/design/后台操作反馈统一标准-v1.md` | 操作反馈标准 | 所有写操作必须有对象级反馈 |
| `docs/superpowers/plans/2026-06-12-production-closure-plan.md` | 生产闭环补齐顺序 | 作为阶段拆分参考，不替代本矩阵 |

## 3. 总体覆盖结论

| 需求大类 | 是否纳入本次后台重构 | 当前判断 | 本次重构重点 |
| --- | --- | --- | --- |
| 客户研判 | 是 | 后端和顾问路径已有基础，页面入口和客户 360 需更清晰 | 顾问新建线索、客户 360、画像研判、推荐项目 |
| 客服 Agent | 是 | 官网和知识库已有基础，不能混入普通后台 | 公开官网、FAQ、活动报名、管理员知识来源 |
| 企业智能助手 | 是 | 已拆入员工日报、组织查询、受控查询和语音草稿，但页面需独立化 | 员工工作台、客户快捷录入、日报、组织查询 |
| 学生智能助手 | 是 | 请假、反馈、成绩、进度已有 API 基础，但角色页面混杂 | 学生申请页、老师审批/处理页、心理预警、学业进度 |
| 智能报告 | 是 | 报告 API 已有基础，管理者入口需按报告用途重排 | 管理者报告中心、老师学生服务报告、管理员快照治理 |

## 4. 客户需求表覆盖矩阵

### 4.1 客户研判

| 细分需求 | 角色 | 独立页面/动线 | 前端入口 | 后端 API | 数据表 | 当前状态 | 改造要求 | 验收标准 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 文本、PDF 简历、Excel 等来源解析 | 顾问 | 新建线索、客户 360 | 顾问后台 -> 新建线索/客户 360 | `POST /api/profile/assess` | `lead_source_file`, `lead_profile_assessment` | 已有画像研判基础 | 页面必须保留资料输入、研判结果和进入客户 360 的清晰路径 | 输入客户资料后生成研判结果，并能在客户 360 查看 |
| 判断是否符合核心产品要求 | 顾问、管理者 | 客户 360、经营报告 | 顾问客户 360、管理者报告 | `POST /api/profile/assess`, `GET /api/projects/recommendations` | `profile_rule`, `lead_recommendation` | 已有推荐基础 | 推荐结果必须出现在客户详情和经营分析中 | 客户研判后显示推荐项目和缺失字段 |
| 基于画像规则命中 | 顾问 | 客户 360 画像研判 | 顾问客户 360 | `POST /api/profile/assess` | `profile_rule`, `profile_rule_hit` | 部分已有 | 规则命中应作为详情区而非孤立卡片 | 详情中可看到命中规则、评分和建议 |

### 4.2 客服 Agent

| 细分需求 | 角色 | 独立页面/动线 | 前端入口 | 后端 API | 数据表 | 当前状态 | 改造要求 | 验收标准 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 公司信息咨询 | 游客 | 官网客服 Agent | 官网首页/企业介绍/FAQ | `POST /api/knowledge/chat` | `knowledge_source`, `chat_message` | 已有基础 | 只在官网和 FAQ 展示，不进入后台业务角色 | 游客可提问公司信息并得到回答 |
| 公司业务查询 | 游客 | 官网客服 Agent | 官网业务服务/FAQ | `POST /api/knowledge/chat` | `knowledge_source`, `knowledge_chunk` | 已有基础 | 与公开业务页联动 | 游客可查询业务并进入咨询 CTA |
| 留学政策查询 | 游客 | 官网 FAQ/客服 Agent | 官网知识/FAQ | `POST /api/knowledge/chat` | `knowledge_source`, `knowledge_chunk` | 已有基础 | 保留来源和 fallback 状态但不暴露内部话术 | 政策问题有回答和可追溯来源 |
| 课程与项目推荐 | 游客、顾问 | 官网项目推荐、客户 360 推荐 | 官网项目页、顾问客户 360 | `GET /api/projects`, `GET /api/projects/recommendations` | `course_project`, `lead_recommendation` | 已有基础 | 公开推荐和内部客户推荐分离 | 官网可看项目，客户 360 可看个性化推荐 |
| 活动与讲座报名 | 游客、顾问 | 官网活动报名、后台活动名单 | 官网活动、后台活动管理 | `GET /api/events`, `POST /api/events/{id}/registrations` | `event`, `event_registration` | 已有闭环基础 | 官网报名和后台名单使用同源数据 | 官网报名后后台名单可见并可签到 |
| 常见问题自助解答 | 游客 | 官网 FAQ | 官网知识/FAQ | `POST /api/knowledge/chat` | `knowledge_source`, `chat_session` | 已有基础 | 不展示内部 CRM、日报、心理预警等数据 | FAQ 问答不泄露内部运营数据 |
| 日常闲聊互动 | 游客 | 官网客服 Agent | 官网客服 Agent | `POST /api/knowledge/chat` | `chat_session`, `chat_message`, `agent_intent_log` | 部分已有 | 保持轻量，不影响主业务闭环 | 闲聊不阻断咨询、报名和项目推荐 |
| 知识库与数据源搭建 | 管理员 | 知识来源治理 | 管理员 -> 知识来源 | `GET/POST/PATCH /api/knowledge/sources` | `knowledge_source`, `knowledge_chunk` | 已有基础 | 只在管理员治理中展示系统状态 | 管理员可维护知识来源和同步任务 |
| 多意图识别、Prompt、人设、推荐逻辑、RAG 来源引用 | 游客、管理员 | 官网 Agent、管理员配置 | 官网 Agent、管理员知识治理 | `POST /api/knowledge/chat`, 知识来源接口 | `agent_intent_log`, `agent_prompt_config`, `recommendation_log` | 部分已有 | 业务角色不暴露实现话术 | 管理员可看配置，游客只看到业务回答 |

### 4.3 企业智能助手

| 细分需求 | 角色 | 独立页面/动线 | 前端入口 | 后端 API | 数据表 | 当前状态 | 改造要求 | 验收标准 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 意向客户录入 | 员工、顾问 | 员工客户快捷录入、顾问新建线索 | 员工工作台、客户增长 | `POST /api/leads`, `POST /api/enterprise-assistant/voice-drafts` | `lead`, `crm_lead`, `customer` | 已有基础 | 员工和顾问入口分清；AI 只能生成草稿，确认后入库 | 草稿确认后创建线索，并在队列中可见 |
| 意向客户查询 | 员工、顾问 | 员工受控查询、顾问线索队列 | 员工工作台、客户增长 | `GET /api/leads`, `POST /api/enterprise-assistant/nl2sql/query` | `lead`, `lead_follow_up`, `controlled_query_log` | 已有基础 | 受控查询和顾问队列分离 | 查询结果更新列表或返回只读统计 |
| 客户状态更新 | 员工、顾问 | 客户 360、员工快捷状态更新 | 顾问客户 360、员工工作台 | `PATCH /api/leads/{id}/status` | `lead_stage_history`, `crm_stage_history` | 已有基础 | 状态更新必须写处理历史 | 更新后客户阶段、时间线同步变化 |
| 口述日报 | 员工 | 日报提交 | 员工工作台 -> 日报提交 | `POST /api/enterprise-assistant/voice-drafts`, `POST /api/enterprise-assistant/daily-reports` | `work_daily_report`, `employee_daily_report` | 已有基础 | 语音先转文本，再生成草稿，确认后提交 | 草稿不写库，提交后日报列表可见 |
| 管理日报查阅 | 管理者 | 日报汇总 | 管理者后台 -> 日报汇总 | `GET /api/enterprise-assistant/daily-reports`, `GET /api/enterprise-assistant/daily-reports/summary` | `daily_report_summary`, `report_snapshot` | 已有基础 | 管理者页面独立展示日/周维度 | 可按日期、部门、员工查看日报汇总 |
| 组织架构查询 | 员工 | 组织查询 | 员工工作台 -> 组织查询 | `GET /api/enterprise-assistant/org-units`, `GET /api/enterprise-assistant/directory` | `organization_unit`, `employee_directory` | 已有基础 | 不能混在日报大页面里 | 搜索部门或同事后显示详情 |
| 新人入职指引 | 员工 | 新人指南 | 员工工作台 -> 新人指南 | `POST /api/knowledge/chat` | `knowledge_source`, `chat_message` | 部分已有 | 用业务语言展示，不暴露知识库实现 | 新人问题能返回制度或流程指引 |
| 学生业务综管 | 老师、员工 | 学生服务后台 | 老师工作台、员工受控入口 | `student-assistant` 系列接口 | `student_feedback_ticket`, `student_grade`, `student_leave_request` | 已有 API 基础 | 必须拆到学生服务业务页 | 老师处理、学生回显、员工受控查询不混乱 |
| NL2SQL 只读查询 | 员工、管理者 | 受控查询 | 员工工作台、管理者后台 | `POST /api/enterprise-assistant/nl2sql/query` | `controlled_query_log`, `nl2sql_query_log` | 已有基础 | 只读白名单，不允许写 SQL | 写操作语句被阻断 |
| 主动待办推送、指令式业务处理 | 员工、老师、管理者 | 待办中心、对应业务页 | 各角色工作台待办 | `notifications`, 业务处理接口 | `notification`, `todo_item`, `agent_action_log`, `audit_log` | 部分已有 | 不能只做静态待办卡 | 待办点击进入对应业务对象详情 |

### 4.4 学生智能助手

| 细分需求 | 角色 | 独立页面/动线 | 前端入口 | 后端 API | 数据表 | 当前状态 | 改造要求 | 验收标准 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 请假申请 | 学生 | 请假申请 | 学生服务台 -> 请假申请 | `GET/POST/PATCH /api/student-assistant/leaves` | `student_leave_request`, `student_admin_service` | 已有 API 基础 | 独立页面，含申请、我的请假、详情、撤销、记录 | 学生提交后自己可见状态 |
| 请假审批 | 老师 | 请假审批 | 老师工作台 -> 请假审批 | `POST /api/student-assistant/leaves/{id}/approve` | `student_leave_approval` | 已有 API 基础 | 独立审批页，含队列、详情、操作、历史 | 老师同意/驳回后学生端刷新可见 |
| 心理关怀闲聊 | 学生 | 心理倾诉/生活支持 | 学生服务台 -> 心理倾诉 | `POST /api/student-assistant/chat` | `student_psych_profile`, `chat_message` | 已有基础 | 必须保留“辅助识别，不替代诊断” | 学生可表达情绪，系统只做辅助提示 |
| 心理高危预警 | 老师、管理者 | 心理预警跟进、心理周报 | 老师工作台、管理者报告 | `POST /api/student-assistant/chat`, `GET /api/student-assistant/teacher-tasks`, `POST /api/reports/generate` | `student_psych_alert`, `psych_follow_up`, `report_snapshot` | 部分已有 | 老师跟进页和管理报告分离 | 高风险记录进入老师队列和周报 |
| 售后投诉建议 | 学生 | 反馈提交 | 学生服务台 -> 反馈提交 | `POST /api/student-assistant/feedback-tickets` | `student_feedback_ticket` | 已有 API 基础 | 独立页面，含提交、我的反馈、补充、状态 | 学生提交后能看到工单状态 |
| 工单处理与通知 | 老师、员工、学生 | 反馈处理 | 老师工作台 -> 反馈处理 | `reply/handle/close/archive` 系列接口 | `student_feedback_ticket`, `notification` | 已有 API 基础 | 独立处理页，含队列、详情、操作、历史 | 老师处理后学生端状态同步 |
| 学业考务查询和提醒 | 学生、老师 | 考务节点、学业进度 | 学生服务台、老师工作台 | `GET /api/student-assistant/students/{id}/academic-events` | `student_academic_node`, `student_academic_event`, `notification` | 已有基础 | 从学生服务大页中拆出 | 可查看节点、提醒和状态 |
| 申请进度查询 | 学生、顾问、老师 | 申请进度 | 学生服务台、客户 360、老师学业/进度 | `GET /api/student-assistant/students/{id}/application-progress` | `student_application_progress` | 已有基础 | 学生只看自己的，老师/顾问看服务对象 | 进度节点和下一步清晰展示 |
| 海外生活知识问答 | 学生 | 生活支持 | 学生服务台 -> 生活支持 | `POST /api/student-assistant/chat`, `knowledge` | `knowledge_source`, `chat_message` | 部分已有 | 与心理倾诉区分 | 生活问题有知识答复 |
| 增值转化推荐 | 学生、顾问 | 项目推荐 | 学生服务台、客户 360 | `GET /api/projects/recommendations` | `lead_recommendation`, `recommendation_log` | 部分已有 | 推荐必须标注为业务推荐，不替代顾问判断 | 学生端看到合适项目，顾问端可承接 |
| 风险识别 Prompt、投诉摘要、营销推荐话术 | 学生、老师、顾问 | 心理预警、反馈处理、推荐话术 | 对应业务页 | `student-assistant`, `profile`, `projects` | `agent_prompt_config`, `student_psych_alert`, `student_feedback_ticket`, `recommendation_log` | 部分已有 | AI 仅做辅助草稿或摘要 | AI 输出需由用户确认或作为辅助说明 |

### 4.5 智能报告

| 细分需求 | 角色 | 独立页面/动线 | 前端入口 | 后端 API | 数据表 | 当前状态 | 改造要求 | 验收标准 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 全域客户经营分析报告 | 管理者、管理员 | 增长总览/报告中心 | 管理者后台、管理员报告治理 | `POST /api/reports/generate`, `GET /api/reports` | `report_snapshot`, `report_metric` | 已有基础 | 管理者看业务报告，管理员看快照和状态 | 生成后打开最新报告详情 |
| 员工日报汇总日报 | 管理者 | 日报汇总 | 管理者后台 -> 日报汇总 | `POST /api/reports/generate`, `daily-reports/summary` | `daily_report_summary`, `report_snapshot` | 已有基础 | 日报汇总页独立 | 按日生成和查看摘要 |
| 员工日报汇总周报 | 管理者 | 周报汇总 | 管理者后台 -> 日报汇总 | `POST /api/reports/generate`, `daily-reports/summary` | `daily_report_summary`, `report_snapshot` | 已有基础 | 与日报维度可切换 | 按周生成和查看摘要 |
| 学生心理健康周报 | 老师、管理者 | 心理周报 | 老师学生服务报告、管理者报告 | `POST /api/reports/generate` | `student_psych_alert`, `report_snapshot` | 已有基础 | 老师只看学生服务相关，管理者看汇总 | 周报包含风险、跟进和提示 |
| 投诉处理周报 | 老师、管理者 | 投诉周报 | 老师反馈处理、管理者报告 | `POST /api/reports/generate` | `student_feedback_ticket`, `report_snapshot` | 已有基础 | 与反馈处理队列联动 | 周报反映未关闭、超时和处理状态 |

## 5. 角色页面承接清单

| 角色 | 总览页保留 | 必须拆出的独立业务页 |
| --- | --- | --- |
| 游客/潜在客户 | 官网首页 | 企业介绍、业务服务、项目/课程、活动/讲座、FAQ/客服 Agent、联系咨询 |
| 顾问 | 客户增长总览 | 新建线索、线索队列、客户 360、画像研判、跟进任务、活动邀约 |
| 员工 | 员工工作台总览 | 客户快捷录入、客户查询/状态更新、日报提交、日报/周报、组织查询、新人指南、受控查询 |
| 老师 | 学生服务工作台总览 | 请假审批、反馈处理、心理预警、学业/进度、成绩录入、学生服务报告 |
| 学生 | 学生服务台总览 | 请假申请、反馈提交、成绩查询、申请进度、考务节点、生活支持、心理倾诉 |
| 管理者 | 经营管理总览 | 增长总览、日报汇总、心理周报、投诉周报、风险队列 |
| 管理员 | 系统治理总览 | 用户管理、角色权限、审计日志、通知管理、知识来源、系统状态、OpenAPI/seed/fallback |

## 6. 不得丢失的单点需求

这些需求不一定天然是一条完整动线，但必须在对应角色页面中明确体现：

1. 顾问手动录入客户线索。
2. PDF/文本/Excel 客户资料来源。
3. 项目和课程推荐。
4. 官网活动报名自动沉淀后台。
5. 员工口述日报和结构化草稿确认。
6. 员工组织架构和通讯录查询。
7. 新人指南知识问答。
8. NL2SQL 只读白名单和阻断写 SQL。
9. 学生海外生活知识问答。
10. 心理风险提示安全文案：辅助识别，不替代诊断。
11. 投诉/反馈摘要和处理历史。
12. 学生成绩录入和学生只读查询。
13. 管理者日/周报表、心理周报、投诉周报。
14. 管理员知识来源、OpenAPI、seed、fallback、系统状态。
15. 权限、审计、通知和待办。

## 7. 后续实现勾选规则

后续每批改造完成前，必须在本矩阵中完成勾选：

1. 需求是否有角色。
2. 需求是否有独立页面或明确承接区。
3. 需求是否有 API。
4. 需求是否有数据表。
5. 需求是否有发起方和处理方视角。
6. 是否存在普通业务角色暴露实现话术。
7. 是否支持刷新后恢复当前位置。
8. 是否通过后端测试、前端构建和手动链路验收。
