# 教育服务业务系统 PRD v1

## 1. 文档信息

- 产品名称：教育服务业务系统
- 当前版本：PRD v1 最终计划基线
- 资料来源：`教育服务/客户需求表.xlsx`、公司信息、公司业务、留学政策、用户研判规则、SQL 设计草稿、现有一期客户增长实现
- 核心原则：不再按“一期/二期”组织功能入口，改为按客户需求表、真实角色权限和业务任务闭环组织系统。

## 2. 产品定位

本系统定位为面向教育服务机构的“公开获客门户 + 角色权限后台 + 智能业务闭环系统”。

公开门户面向游客、潜在客户、家长、学生和合作方，负责建立企业信任、解释业务服务、展示项目活动、提供客服 Agent、承接咨询和报名。

登录后台面向顾问、员工、老师、学生、管理者和管理员，不使用统一的“角色工作台”模板，而是按角色真实工作任务配置不同后台页面。每个后台只展示当前角色有权限使用的入口，不显示无权限占位、禁用菜单或“当前角色隐藏”文案。

每个登录角色都必须有自己的默认工作台总览页。总览页用于集中呈现该角色的核心指标、待办、最近记录和功能入口；功能卡片和侧边栏导航进入同一套功能状态，进入后必须是完整功能页，而不是孤立展示卡片。

## 3. 产品目标

1. 建立可信公开官网，承接公司信息、业务咨询、政策查询、项目推荐、活动报名和 FAQ。
2. 支持顾问完成客户线索录入、研判、项目推荐、跟进、阶段流转和客户 360 管理。
3. 支持员工通过低成本入口完成客户快捷录入/查询、日报、组织架构查询、新人指南和受控查询。
4. 支持学生完成请假、反馈、进度查询、考务查询、生活支持和心理倾诉。
5. 支持老师处理请假审批、反馈工单、心理辅助预警、学业节点和申请进度。
6. 支持管理者查看客户经营、员工日报、学生心理健康和投诉处理报告。
7. 支持管理员维护用户、角色、权限、审计、通知、知识来源、OpenAPI、seed 和 fallback 状态。
8. 从零设计客户、学生、日报、投诉、活动、研判、权限、报告等核心数据表，保证所有客户需求表需求都有落表位置。

## 4. 角色与权限

| 角色 | 默认入口 | 核心任务 | 不应看到 |
| --- | --- | --- | --- |
| 游客/潜在客户 | 公开官网 + 客服 Agent | 了解公司、业务、政策、项目、活动；提交咨询；活动报名；FAQ 问答 | CRM 客户、员工日报、学生心理预警、权限审计、OpenAPI、seed |
| 顾问 | 客户增长 | 手动录入客户线索、上传/粘贴资料、触发研判、查看推荐项目、创建跟进、创建任务、更新阶段、进入客户 360 | 系统治理、员工日报明细、学生心理明细 |
| 员工 | 员工工作台 | 客户快捷录入/查询/状态更新、口述日报、组织架构查询、新人指南、受控只读查询 | 管理报表、权限矩阵、学生心理明细 |
| 老师 | 学生服务工作台 | 请假审批、反馈处理、心理辅助预警跟进、学业节点和申请进度查看 | 系统治理、客户经营全量数据 |
| 学生 | 学生服务台 | 请假申请、投诉建议、申请进度、考务节点、生活支持、心理倾诉 | 内部 CRM、老师处理队列、管理报表 |
| 管理者 | 经营管理后台 | 增长总览、客户经营报告、日报汇总、心理健康周报、投诉处理周报 | OpenAPI、seed 写操作 |
| 管理员 | 系统治理 | 用户、角色、权限、审计、通知、知识来源、系统状态、OpenAPI、seed、fallback | 顾问、员工、老师、学生、管理者的日常业务处理入口合集 |

权限展示规则：

1. 无权限一级入口直接不渲染。
2. 页面内无权限动作优先不展示；如业务上下文必须保留，只显示简短只读状态。
3. 不出现“当前角色隐藏”“该角色暂不展示”等占位文案。
4. 后台导航按角色实际功能数量调整布局，不强行套统一工作台。
5. 每个角色保留自己的默认总览工作台，但总览结构不强行统一；总览卡片、侧边栏导航和功能区状态必须一致。
6. 测试账号只作为验收和演示工具，可拥有全权限并切换演示视角；生产角色权限仍以账号绑定角色为准。

## 5. 客户需求表完整覆盖矩阵

| 需求项 | 细分需求 | 角色 | 前端入口 | 后端/API | 数据表 |
| --- | --- | --- | --- | --- | --- |
| 客户研判 | 支持文本、PDF 简历、Excel 等来源解析 | 顾问、管理者 | 客户增长、客户 360 | `profile` | `lead_profile_assessment`, `lead_source_file` |
| 客户研判 | 判断是否符合两个核心产品要求 | 顾问、管理者 | 客户 360 画像研判 | `profile` | `profile_rule`, `lead_recommendation` |
| 客户研判 | 基于用户画像研判规则命中规则 | 顾问、管理者 | 客户 360 | `profile` | `profile_rule`, `profile_rule_hit` |
| 客服 Agent | 公司信息咨询 | 游客 | 官网客服 Agent、企业介绍 | `knowledge` | `knowledge_source`, `chat_message` |
| 客服 Agent | 公司业务查询 | 游客 | 官网客服 Agent、业务服务 | `knowledge` | `knowledge_source`, `chat_message` |
| 客服 Agent | 海外留学政策查询 | 游客 | 官网客服 Agent、FAQ | `knowledge` | `knowledge_source`, `knowledge_chunk` |
| 客服 Agent | 课程与项目推荐 | 游客、顾问 | 官网项目、客户 360 推荐 | `projects`, `profile` | `course_project`, `lead_recommendation` |
| 客服 Agent | 活动与讲座查询报名 | 游客、运营 | 官网活动 | `events` | `event`, `event_registration` |
| 客服 Agent | 常见问题自助解答 | 游客 | 官网 FAQ | `knowledge` | `knowledge_source`, `chat_session` |
| 客服 Agent | 日常闲聊互动 | 游客 | 官网客服 Agent | `knowledge` | `chat_session`, `chat_message`, `agent_intent_log` |
| 客服 Agent | 知识库与数据源搭建 | 管理员 | 系统治理、知识来源 | `knowledge` | `knowledge_source`, `knowledge_chunk` |
| 客服 Agent | 多意图识别 | 游客 | 官网客服 Agent | `knowledge` | `agent_intent_log` |
| 客服 Agent | 年轻化闲聊人设 | 游客 | 官网客服 Agent | `knowledge` | `agent_prompt_config` |
| 客服 Agent | 个性化推荐逻辑 | 游客、顾问 | 官网项目、客户 360 | `projects`, `profile` | `project_rule`, `recommendation_log` |
| 客服 Agent | RAG 问答和来源引用 | 游客、管理员 | 官网客服 Agent、知识来源 | `knowledge` | `knowledge_source`, `chat_message` |
| 客服 Agent | 活动报名自动沉淀后台 | 游客、顾问 | 官网活动报名、客户增长 | `events`, `leads` | `event_registration`, `lead` |
| 企业智能助手 | 意向客户录入 | 员工、顾问 | 员工工作台、客户增长 | `leads`, `enterprise-assistant` | `lead`, `customer` |
| 企业智能助手 | 意向客户查询 | 员工、顾问 | 员工工作台、客户增长 | `leads` | `lead`, `lead_follow_up` |
| 企业智能助手 | 客户状态更新 | 员工、顾问 | 员工工作台、客户增长 | `crm` | `lead_stage_history` |
| 企业智能助手 | 口述日报 | 员工 | 员工工作台 | `enterprise-assistant` | `employee_daily_report` |
| 企业智能助手 | 管理日报查阅 | 管理者 | 经营管理后台、报告中心 | `reports` | `daily_report_summary`, `report_snapshot` |
| 企业智能助手 | 组织架构查询 | 员工 | 员工工作台 | `enterprise-assistant` | `organization_unit`, `employee_directory` |
| 企业智能助手 | 新人入职指引 | 员工 | 员工工作台 | `knowledge` | `knowledge_source`, `chat_message` |
| 企业智能助手 | 学生业务综管 | 老师、员工 | 学生服务工作台 | `students` | `student_admin_service`, `student_feedback_ticket` |
| 企业智能助手 | NL2SQL 只读查询 | 员工、管理者 | 员工工作台 | `enterprise-assistant` | `controlled_query_log` |
| 企业智能助手 | 主动待办推送 | 员工、老师、管理者 | 通知、待办 | `notifications` | `notification`, `todo_item` |
| 企业智能助手 | 指令式业务处理 | 员工、老师 | 员工工作台、学生服务工作台 | `enterprise-assistant`, `students` | `agent_action_log`, `audit_log` |
| 学生智能助手 | 请假申请 | 学生 | 学生服务台 | `students` | `student_admin_service` |
| 学生智能助手 | 请假审批 | 老师 | 学生服务工作台 | `students` | `student_leave_approval` |
| 学生智能助手 | 心理关怀闲聊 | 学生 | 学生服务台 | `student-assistant` | `student_psych_profile`, `chat_message` |
| 学生智能助手 | 心理高危预警 | 老师、管理者 | 学生服务工作台、报告中心 | `students`, `reports` | `student_psych_alert`, `psych_follow_up` |
| 学生智能助手 | 售后投诉建议 | 学生 | 学生服务台 | `students` | `student_feedback_ticket` |
| 学生智能助手 | 工单处理与通知 | 老师、员工、学生 | 学生服务工作台、通知 | `students`, `notifications` | `student_feedback_ticket`, `notification` |
| 学生智能助手 | 学业考务查询和提醒 | 学生、老师 | 学生服务台、学生服务工作台 | `students` | `student_academic_node`, `notification` |
| 学生智能助手 | 申请进度查询 | 学生、顾问、老师 | 学生服务台、客户 360 | `students` | `student_application_progress` |
| 学生智能助手 | 海外生活知识问答 | 学生 | 学生服务台 | `knowledge` | `knowledge_source`, `chat_message` |
| 学生智能助手 | 增值转化推荐 | 学生、顾问 | 学生服务台、客户 360 | `projects`, `profile` | `lead_recommendation`, `recommendation_log` |
| 学生智能助手 | 风险识别 Prompt | 学生、老师 | 学生服务台、学生服务工作台 | `student-assistant` | `agent_prompt_config`, `student_psych_alert` |
| 学生智能助手 | 投诉智能摘要 | 老师、员工 | 学生服务工作台 | `student-assistant` | `student_feedback_ticket` |
| 学生智能助手 | 营销推荐话术 | 顾问 | 客户 360 | `profile`, `projects` | `recommendation_log` |
| 智能报告 | 全域客户经营分析报告 | 管理者 | 经营管理后台、报告中心 | `reports` | `report_snapshot`, `report_metric` |
| 智能报告 | 员工日报汇总日报 | 管理者 | 报告中心 | `reports` | `daily_report_summary`, `report_snapshot` |
| 智能报告 | 员工日报汇总周报 | 管理者 | 报告中心 | `reports` | `daily_report_summary`, `report_snapshot` |
| 智能报告 | 学生心理健康周报 | 老师、管理者 | 报告中心 | `reports` | `student_psych_alert`, `report_snapshot` |
| 智能报告 | 投诉处理周报 | 老师、管理者 | 报告中心 | `reports` | `student_feedback_ticket`, `report_snapshot` |

## 6. 数据库终局设计

最终数据库从零设计以下核心表，当前 SQLite 实现需兼容后续 MySQL。字段在实现计划中细化，本文定义必须存在的业务实体。

### 6.1 用户权限与治理

| 表 | 职责 |
| --- | --- |
| `sys_user` | 统一用户账号，覆盖员工、老师、学生、管理员 |
| `sys_role` | 角色定义 |
| `sys_permission` | 权限点定义 |
| `sys_user_role` | 用户角色绑定 |
| `sys_role_permission` | 角色权限绑定 |
| `audit_log` | 关键操作审计 |
| `notification` | 通知和待办提醒 |
| `todo_item` | 角色待办任务 |

### 6.2 客户增长与研判

| 表 | 职责 |
| --- | --- |
| `customer` | 客户主档，承接潜客、成交客户、学生关联 |
| `lead` | 意向客户线索 |
| `lead_source_file` | 客户资料来源文件和文本 |
| `lead_profile_assessment` | 客户画像研判结果 |
| `profile_rule` | 画像研判规则 |
| `profile_rule_hit` | 研判命中记录 |
| `lead_recommendation` | 项目推荐结果 |
| `lead_follow_up` | 跟进记录 |
| `lead_task` | 顾问待办任务 |
| `lead_stage_history` | 客户阶段流转历史 |

### 6.3 项目课程与活动

| 表 | 职责 |
| --- | --- |
| `course_project` | 项目/课程主表 |
| `project_pathway` | 项目路径，例如 2+2、0.5/1+2、德国双元制 |
| `project_tag` | 项目标签 |
| `project_rule` | 推荐规则 |
| `project_material` | 项目公开资料 |
| `event` | 活动/讲座 |
| `event_registration` | 活动报名，支持线索和学生 |
| `event_checkin` | 活动签到 |

### 6.4 知识库与 Agent

| 表 | 职责 |
| --- | --- |
| `knowledge_source` | 公司信息、业务、政策、新人指南、生活支持等知识来源 |
| `knowledge_chunk` | 知识切片 |
| `chat_session` | 问答会话 |
| `chat_message` | 问答消息 |
| `agent_intent_log` | 意图识别记录 |
| `agent_action_log` | Agent 调用业务动作记录 |
| `agent_prompt_config` | 场景 prompt 配置 |
| `controlled_query_log` | 受控只读查询记录 |
| `dify_fallback_log` | Dify fallback 记录 |

### 6.5 员工工作台

| 表 | 职责 |
| --- | --- |
| `employee_profile` | 员工档案 |
| `employee_daily_report` | 员工日报 |
| `daily_report_summary` | 日报日/周汇总 |
| `organization_unit` | 组织架构 |
| `employee_directory` | 员工通讯录 |

### 6.6 学生服务

| 表 | 职责 |
| --- | --- |
| `student_profile` | 学生档案 |
| `student_admin_service` | 请假、考务等行政服务申请 |
| `student_leave_approval` | 请假审批 |
| `student_feedback_ticket` | 投诉建议工单 |
| `student_academic_node` | 学业考务节点 |
| `student_application_progress` | 文书、院校申请、签证等进度 |
| `student_psych_profile` | 心理辅助画像 |
| `student_psych_alert` | 心理辅助预警 |
| `psych_follow_up` | 老师跟进记录 |

### 6.7 报告中心

| 表 | 职责 |
| --- | --- |
| `report_snapshot` | 报告快照 |
| `report_metric` | 报告指标 |
| `report_generation_log` | 报告生成日志 |
| `recommendation_log` | 推荐和转化建议记录 |

## 7. 前端信息架构

```text
公开官网门户
  -> 登录入口
    -> 顾问：客户增长
    -> 员工：员工工作台
    -> 老师：学生服务工作台
    -> 学生：学生服务台
    -> 管理者：经营管理后台
    -> 管理员：系统治理
```

公开官网：

- 首页
- 企业介绍
- 业务服务
- 项目/课程
- 活动/讲座
- 知识/FAQ
- 联系咨询
- 登录

登录后台：

- 顾问：客户增长、客户 360
- 员工：客户快捷操作、日报、组织架构、新人指南
- 老师：请假审批、反馈处理、心理预警、学业/进度
- 学生：请假、反馈、进度、考务、生活支持
- 管理者：经营总览、报告中心
- 管理员：系统治理、知识来源、系统状态和演示控制

后台角色工作台：

| 角色 | 默认总览 | 总览必须提供的可进入功能 |
| --- | --- | --- |
| 顾问 | 客户增长工作台 | 新建线索、线索队列、漏斗阶段、客户 360、跟进任务、活动邀约 |
| 员工 | 员工工作台 | 快捷录入、日报/周报、组织架构、客户查询、新人指南 |
| 老师 | 学生服务工作台 | 请假审批、反馈处理、心理预警、学业/进度、成绩录入 |
| 学生 | 学生服务台 | 请假申请、反馈提交、成绩查询、申请进度、考务节点、生活支持 |
| 管理者 | 经营管理后台 | 增长总览、日报汇总、心理周报、投诉周报、风险队列 |
| 管理员 | 系统治理 | 用户、角色、权限、审计、通知、知识来源、系统状态 |

## 8. 前端文案和布局约束

1. 删除大段解释性文字，只保留必要标题、字段、按钮、状态、空状态、错误和风险提示。
2. 不在业务页面解释项目阶段、规划或技术债。
3. 各角色后台不套统一模板，按功能数量合理排布。
4. 避免大面积空白、长列表堆叠、无权限占位和重复状态说明。
5. 顾问页优先给出“新建线索”主操作。
6. 员工页优先给出“录入/查询/日报”快速动作。
7. 老师页优先给出待审批、待处理、待跟进队列。
8. 学生页优先给出自助服务入口。
9. 管理者页优先展示指标和报告。
10. 管理员页优先使用表格和治理配置。
11. UI 效果图阶段至少输出 3 套整体风格方案；每套都要覆盖登录入口和主要角色后台的布局方向；官网已确认时不强制重做官网首页。

## 9. API 分组规划

| 分组 | 说明 |
| --- | --- |
| `auth` | 登录、会话、Token，生产化阶段补齐 |
| `demo` | 演示数据初始化 |
| `profile` | 客户画像研判 |
| `leads` | 线索和客户增长 |
| `crm` | 跟进、任务、时间线、阶段历史 |
| `projects` | 项目/课程和推荐规则 |
| `events` | 活动、报名、签到 |
| `knowledge` | Dify 问答、知识来源、同步、fallback |
| `employee` | 员工日报、组织架构、新人指南、受控查询 |
| `students` | 学生档案、请假、反馈、学业节点、申请进度、心理辅助 |
| `reports` | 报告生成、列表、详情 |
| `users` | 用户管理 |
| `roles` | 角色和权限 |
| `audit` | 审计日志 |
| `notifications` | 通知和待办 |

## 10. 验收标准

1. 客户需求表五类需求全部能在覆盖矩阵中找到角色、入口、API 和表。
2. 顾问可从后台显著入口手动新建客户线索。
3. 学生、老师、员工不再进入“二期助手”，而是进入各自业务页面。
4. 无权限后台入口不展示，不出现隐藏占位。
5. 官网不展示内部运营数据。
6. 数据库终局设计覆盖客户、学生、日报、投诉、活动、研判、报告、权限、Agent 日志。
7. 前端页面文案精简，布局没有大面积空白和长列表堆叠。
8. 每个阶段完成后运行对应验证并提交中文 commit。

### 10.1 生产级业务闭环补充原则

1. 跨角色业务对象不得只实现单端入口；请假、反馈、成绩、日报、活动报名、CRM 跟进等对象必须同时覆盖发起方、处理方和管理方的必要视角。
2. 每个核心业务对象至少需要明确：创建入口、列表查询、详情查看、状态更新或处理动作、处理历史、发起方回显、审计或通知。
3. 有状态流转的对象必须显示当前状态、处理人、处理时间和下一步动作；不能只显示静态卡片或汇总数字。
4. 搜索、筛选、漏斗节点、列表项、审批按钮、报名按钮等交互必须改变业务结果或进入业务详情；不可作为无数据联动的装饰。
5. 前端刷新后应恢复当前业务位置；关键页面不能因为刷新回到官网首页或默认模块。
6. 普通业务角色页面只展示业务语言，不展示内部实现状态；系统状态、OpenAPI、seed、fallback 等只归入管理员治理页面。
7. 每个角色默认工作台必须能作为总览导航页使用；点击总览功能卡片和点击侧边栏对应入口应进入同一功能区，并保持 URL/状态一致。
8. 每个功能区必须具备与业务匹配的完整布局，包括标题、指标、搜索/筛选、列表、详情、创建/编辑/处理入口、状态反馈、处理记录、空状态和错误状态。

## 11. 当前不做

1. 不做真实心理诊断或医疗建议。
2. 不允许任意 SQL 写操作。
3. 不提交 `教育服务/` 原始资料。
4. 不把 OpenAPI、seed、fallback、权限矩阵展示到公开官网。
5. 不再以“一期/二期助手”作为用户可见分类。
