export type RoleKey = "admin" | "manager" | "consultant" | "employee" | "teacher" | "student";

export const roleOptions: Array<{ key: RoleKey; label: string; focus: string }> = [
  { key: "admin", label: "管理员", focus: "系统治理、权限、审计" },
  { key: "manager", label: "管理者", focus: "经营报告、团队日报、风险" },
  { key: "consultant", label: "顾问", focus: "CRM、跟进、活动报名" },
  { key: "employee", label: "员工", focus: "企业助手、日报、新人指南" },
  { key: "teacher", label: "老师", focus: "学生服务、审批、预警" },
  { key: "student", label: "学生", focus: "请假、反馈、进度、生活支持" },
];

export const dashboardMetrics = [
  { label: "今日新增线索", value: "12", trend: "+18%", state: "success" },
  { label: "待跟进任务", value: "27", trend: "6 个超时", state: "warning" },
  { label: "待审批请假", value: "5", trend: "老师处理", state: "warning" },
  { label: "待处理反馈", value: "9", trend: "2 个高优先级", state: "danger" },
  { label: "心理辅助预警", value: "3", trend: "仅辅助识别", state: "danger" },
  { label: "最近报告", value: "4", trend: "本周已生成", state: "success" },
];

export const workflowCards = [
  {
    key: "crm",
    title: "客户增长闭环",
    summary: "画像研判、CRM 跟进、项目推荐、活动报名和客户经营报告保持可演示。",
    status: "真实 API + 原型详情",
  },
  {
    key: "enterprise",
    title: "企业助手闭环",
    summary: "用自然语言录入客户、提交日报、查询组织架构和新人指南，写操作保留 service 校验边界。",
    status: "前端 mock",
  },
  {
    key: "student",
    title: "学生服务闭环",
    summary: "请假、反馈、申请进度、学业节点和心理风险辅助识别集中在统一工作台。",
    status: "真实 API + fallback",
  },
  {
    key: "reports",
    title: "报告决策闭环",
    summary: "客户经营、员工日报、心理健康和投诉处理报告以页面和 JSON 快照演示。",
    status: "客户经营真实 API",
  },
];

export const todoItems = [
  { title: "跟进高潜客户 王晨", meta: "CRM / 顾问 李敏 / 17:30 前", level: "高" },
  { title: "审批陈雨 6 月请假", meta: "学生助手 / 老师 周老师", level: "中" },
  { title: "补充德国双元制活动名单", meta: "活动运营 / 运营 张岚", level: "中" },
  { title: "生成投诉处理周报", meta: "报告中心 / 管理者", level: "低" },
];

export const crmPrototypeRows = [
  {
    id: 1,
    customer_name: "王晨",
    contact: "138****4210",
    status: "high_potential",
    statusLabel: "高潜跟进",
    owner: "李敏",
    project: "新加坡国际本科",
    recent: "已完成画像，家长关注费用和升学路径",
    nextTask: "今天 17:30 回访家长",
  },
  {
    id: 2,
    customer_name: "刘欣",
    contact: "136****7731",
    status: "consulting",
    statusLabel: "咨询中",
    owner: "赵凯",
    project: "德国双元制",
    recent: "询问带薪实习与语言要求",
    nextTask: "发送德语课程方案",
  },
  {
    id: 3,
    customer_name: "陈浩",
    contact: "139****2088",
    status: "lost",
    statusLabel: "暂缓/流失",
    owner: "李敏",
    project: "背景提升项目",
    recent: "预算不足，建议 3 个月后再触达",
    nextTask: "设置长期培育提醒",
  },
];

export const crmTimeline = [
  { time: "09:10", title: "客户资料进入系统", detail: "来源：企业助手自然语言录入" },
  { time: "09:14", title: "画像研判完成", detail: "命中新加坡低风险升学路径，缺少预算上限" },
  { time: "10:05", title: "知识库问答", detail: "Dify 未配置时使用 fallback，已展示原因" },
  { time: "11:30", title: "新增跟进", detail: "顾问确认家长希望参加周末讲座" },
  { time: "14:20", title: "活动报名", detail: "报名“新加坡升学说明会”，待签到" },
];

export const projectRows = [
  { name: "新加坡国际本科", country: "新加坡", category: "升学", cost: "12-18 万/年", cycle: "2-4 年", tags: ["升学", "低风险", "短学制"], status: "招生中" },
  { name: "德国双元制", country: "德国", category: "就业", cost: "6-10 万/年", cycle: "3 年", tags: ["就业", "带薪实习", "低成本"], status: "招生中" },
  { name: "语言强化计划", country: "多国家", category: "语言培训", cost: "1.5-3 万", cycle: "3-6 月", tags: ["语言", "衔接", "基础提升"], status: "常规" },
  { name: "背景提升项目", country: "多国家", category: "背景提升", cost: "0.8-2 万", cycle: "4-8 周", tags: ["竞赛", "科研", "文书素材"], status: "常规" },
];

export const eventPrototypeRows = [
  { name: "新加坡升学说明会", type: "讲座", time: "06-15 19:30", target: "高三/大一客户", signed: 26, capacity: 40, status: "报名中" },
  { name: "德国双元制家长专场", type: "直播", time: "06-18 20:00", target: "就业导向客户", signed: 18, capacity: 50, status: "报名中" },
  { name: "留学行前生活支持", type: "学生服务", time: "06-21 15:00", target: "在读学生", signed: 34, capacity: 60, status: "待签到" },
];

export const enterpriseQuickCommands = [
  "帮我录入一个客户：王晨，高三，想去新加坡读本科，家长关注费用",
  "提交今天日报：跟进 8 个客户，2 个高潜，风险是德国项目材料不齐",
  "查一下双元制事业部负责人和新人入职流程",
  "用受控查询看本周高潜线索数量",
];

export const studentRows = [
  { id: 1, name: "陈雨", project: "新加坡国际本科", owner: "周老师", status: "申请材料补充中", risk: "低" },
  { id: 2, name: "林可", project: "德国双元制", owner: "王老师", status: "签证准备", risk: "中" },
  { id: 3, name: "赵宁", project: "语言强化计划", owner: "周老师", status: "课程进行中", risk: "高" },
];

export const studentServiceItems = [
  { title: "请假申请", status: "待老师审批", detail: "陈雨申请 06-12 至 06-13 请假，原因：家庭事务" },
  { title: "反馈工单", status: "处理中", detail: "林可反馈宿舍网络不稳定，已分配给生活支持老师" },
  { title: "申请进度", status: "材料补充", detail: "文书初稿完成，推荐信待上传" },
  { title: "学业节点", status: "本周提醒", detail: "语言测试模拟考 06-16，论文提纲 06-20 截止" },
];

export const psychAlerts = [
  { student: "赵宁", level: "高", reason: "连续表达睡眠差和强烈焦虑", status: "老师已介入" },
  { student: "林可", level: "中", reason: "签证等待导致压力上升", status: "待二次回访" },
];

export const reportTypes = [
  { key: "customer", title: "客户经营分析", mode: "真实 API", summary: "新增、成交、流失、高潜客户和跟进建议" },
  { key: "daily", title: "员工日报汇总", mode: "前端 mock", summary: "团队进展、产出、风险和待协调事项" },
  { key: "psych", title: "学生心理健康周报", mode: "前端 mock", summary: "风险学生、情绪标签、趋势和跟进建议" },
  { key: "feedback", title: "投诉处理周报", mode: "前端 mock", summary: "投诉数量、分类、处理时效和未决风险" },
];

export const mockReportSnapshots = [
  { title: "员工日报周汇总", type: "daily", period: "2026-W24", risk: "德国项目材料跟进压力较高" },
  { title: "学生心理健康周报", type: "psych", period: "2026-W24", risk: "3 名学生需要老师持续观察" },
  { title: "投诉处理周报", type: "feedback", period: "2026-W24", risk: "住宿类反馈集中在网络和缴费说明" },
];

export const adminUsers = [
  { name: "系统管理员", account: "admin", role: "管理员", status: "启用" },
  { name: "李敏", account: "limin", role: "顾问", status: "启用" },
  { name: "周老师", account: "zhoulaoshi", role: "老师", status: "启用" },
  { name: "陈雨", account: "chenyu", role: "学生", status: "演示账号" },
];

export const permissions = [
  { module: "CRM", code: "crm:lead:write", desc: "新增线索、跟进和状态流转" },
  { module: "学生助手", code: "student:leave:approve", desc: "审批请假和处理反馈" },
  { module: "报告中心", code: "report:snapshot:read", desc: "查看报告快照和风险提示" },
  { module: "系统管理", code: "system:audit:read", desc: "查看关键操作审计" },
];

export const auditRows = [
  { operator: "李敏", action: "新增跟进", resource: "CRM 线索 #1", time: "10:32", detail: "记录家长回访结论" },
  { operator: "周老师", action: "审批请假", resource: "请假 #L-102", time: "11:08", detail: "同意，已通知学生" },
  { operator: "系统", action: "Dify fallback", resource: "知识问答 #K-56", time: "11:45", detail: "未配置 Dify，使用模板答案" },
  { operator: "管理者", action: "生成报告", resource: "客户经营报告", time: "14:16", detail: "保存 JSON 快照" },
];

export const notifications = [
  { title: "高潜客户需要今日回访", receiver: "李敏", status: "未读" },
  { title: "学生心理辅助预警待跟进", receiver: "周老师", status: "未读" },
  { title: "日报周汇总已生成", receiver: "管理者", status: "已读" },
];
