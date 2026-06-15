const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const pages = [
  [
    "顾问客户研判助手",
    "src/pages/ConsultantAgentPage.tsx",
    "consultant-agent-page",
    "客户研判助手",
    ["资料补齐", "画像研判", "项目推荐", "跟进建议", "任务创建", "阶段更新", "客户360"],
  ],
  [
    "老师处理助手",
    "src/pages/TeacherAgentPage.tsx",
    "teacher-agent-page",
    "老师处理助手",
    ["请假审批", "反馈处理", "心理预警", "学业节点", "申请进度", "成绩查看"],
  ],
  [
    "学生服务助手",
    "src/pages/StudentAgentPage.tsx",
    "student-agent-page",
    "学生服务助手",
    ["提交请假", "提交反馈", "申请进度", "学业考务", "生活支持", "心理倾诉"],
  ],
  [
    "管理者报告解释助手",
    "src/pages/ManagerAgentPage.tsx",
    "manager-agent-page",
    "报告解释助手",
    ["增长总览", "客户经营报告", "员工日报汇总", "学生心理健康周报", "投诉处理周报", "风险队列"],
  ],
];

for (const [label, file, className, title, coverageTokens] of pages) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`${label} 缺少独立助手页面: ${file}`);
  }
  const source = fs.readFileSync(fullPath, "utf8");
  for (const token of [
    className,
    title,
    "RoleAgentShell",
    "handleAgentKeyDown",
    'event.key === "Enter"',
    "!event.shiftKey",
    "apiRequest",
  ]) {
    if (!source.includes(token)) {
      throw new Error(`${label} 独立助手页面缺少结构: ${token}`);
    }
  }
  for (const token of coverageTokens) {
    if (!source.includes(token)) {
      throw new Error(`${label} 缺少既定角色功能体现: ${token}`);
    }
  }
}

for (const [label, file] of [
  ["老师处理助手", "src/pages/TeacherAgentPage.tsx"],
  ["学生服务助手", "src/pages/StudentAgentPage.tsx"],
]) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  for (const token of [
    "useEffect",
    "StudentItem",
    'apiRequest<StudentItem[]>("/api/student-assistant/students")',
    "selectedStudent",
    "selectedStudent.id",
  ]) {
    if (!source.includes(token)) {
      throw new Error(`${label} 发送前必须加载真实学生对象，缺少: ${token}`);
    }
  }
  if (/body:\s*JSON\.stringify\(\{\s*student_id:\s*student\.id/.test(source)) {
    throw new Error(`${label} 不应使用静态 studentRows[0] ID 发送学生助手请求`);
  }
}

for (const [label, file, tokens, forbiddenPattern] of [
  [
    "顾问客户研判助手",
    "src/pages/ConsultantAgentPage.tsx",
    [
      "LeadItem",
      'apiRequest<LeadItem[]>("/api/leads")',
      "selectedLead",
      "selectedLead.id",
      'apiRequest<AgentDraft>("/api/consultant-agent/chat"',
      'apiRequest<ConfirmResult>("/api/consultant-agent/actions/confirm"',
      "pending_actions",
      "confirmAgentActions",
      "确认写入CRM",
    ],
    /const\s+lead\s*=\s*crmPrototypeRows\[0\]|lead_id:\s*lead\.id/,
  ],
  [
    "管理者报告解释助手",
    "src/pages/ManagerAgentPage.tsx",
    ["ReportItem", 'apiRequest<ReportItem[]>("/api/reports")', "selectedReport", "selectedReport.id"],
    /const\s+reportType\s*=\s*reportTypes\[0\]/,
  ],
]) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  for (const token of tokens) {
    if (!source.includes(token)) {
      throw new Error(`${label} 必须绑定真实业务对象，缺少: ${token}`);
    }
  }
  if (forbiddenPattern.test(source)) {
    throw new Error(`${label} 不应使用静态原型对象作为正式助手发送上下文`);
  }
}

const shellSource = fs.readFileSync(path.join(root, "src/pages/roleAgentShell.tsx"), "utf8");
for (const token of [
  "role-agent-shell",
  "enterprise-agent-shell",
  "enterprise-agent-tabs",
  "enterprise-agent-conversation",
  "enterprise-agent-dialog",
  "enterprise-agent-input",
  "role-agent-task-card",
  "role-agent-composer",
  "enterprise-agent-task-card",
  "enterprise-agent-context",
]) {
  if (!shellSource.includes(token)) {
    throw new Error(`独立角色助手共享壳缺少结构: ${token}`);
  }
}

for (const token of ["role-agent-result", "role-agent-capability-grid", "<small>"]) {
  if (shellSource.includes(token)) {
    throw new Error(`独立角色助手共享壳不应继续使用撑高右侧的旧结构: ${token}`);
  }
}

if (!/enterprise-agent-dialog[^]*?<\/div>\s*<form[^]*?enterprise-agent-input[^]*?<\/form>\s*<\/section>\s*<aside[^]*?enterprise-agent-execution/.test(shellSource)) {
  throw new Error("独立角色助手输入框必须在对话容器内、紧跟对话区之后，右侧信息不能插在中间");
}

const styles = fs.readFileSync(path.join(root, "src/styles.css"), "utf8");
for (const token of [
  ".enterprise-agent-shell",
  ".enterprise-agent-tabs",
  ".enterprise-agent-conversation",
  ".enterprise-agent-dialog",
  ".enterprise-agent-input",
  ".enterprise-agent-execution",
  "grid-template-rows: auto minmax(0, 1fr) auto",
  "overflow-y: auto",
]) {
  if (!styles.includes(token)) {
    throw new Error(`独立角色助手样式缺少: ${token}`);
  }
}

for (const token of [".role-agent-result", ".role-agent-capability-grid"]) {
  if (styles.includes(token)) {
    throw new Error(`独立角色助手样式不应保留旧右侧长列表规则: ${token}`);
  }
}

for (const selector of [".consultant-agent-page", ".teacher-agent-page", ".student-agent-page", ".manager-agent-page"]) {
  const selectorIndex = styles.indexOf(selector);
  const blockStart = selectorIndex >= 0 ? styles.indexOf("{", selectorIndex) : -1;
  const blockEnd = blockStart >= 0 ? styles.indexOf("}", blockStart) : -1;
  const block = blockStart >= 0 && blockEnd >= 0 ? styles.slice(blockStart, blockEnd) : "";
  if (!block.includes("height: 100%") || !block.includes("min-height: 0")) {
    throw new Error(`独立角色助手外层必须撑满右侧内容框，避免底部留白: ${selector}`);
  }
}

if (!/\.enterprise-agent-main\s*\{[^}]*height:\s*100%/m.test(styles)) {
  throw new Error("Agent 主工作区必须撑满 shell 剩余高度，保证对话区和右侧任务区底线对齐");
}

const backofficeShell = fs.readFileSync(path.join(root, "src/pages/BackofficeShellPage.tsx"), "utf8");
if (!backofficeShell.includes('isSidebarCollapsed ? "sidebar-collapsed" : "sidebar-expanded"')) {
  throw new Error("角色助手所在后台壳必须保留侧边栏展开/收起状态");
}

if (/agent-workspace-grid,\s*\n\.agent-workspace-grid\.sidebar-expanded,\s*\n\.agent-workspace-grid\.sidebar-collapsed\s*\{[\s\S]*?grid-template-columns:\s*76px/.test(styles)) {
  throw new Error("Agent 布局不应把侧边栏展开态也强制成收起宽度");
}

const appSource = fs.readFileSync(path.join(root, "src/App.tsx"), "utf8");
const backofficeShellSource = fs.readFileSync(path.join(root, "src/pages/BackofficeShellPage.tsx"), "utf8");
const consultantAgentSource = fs.readFileSync(path.join(root, "src/pages/ConsultantAgentPage.tsx"), "utf8");
const customerGrowthSource = fs.readFileSync(path.join(root, "src/pages/CustomerGrowthPage.tsx"), "utf8");
const customer360Source = fs.readFileSync(path.join(root, "src/pages/Customer360Page.tsx"), "utf8");

for (const token of [
  "selectedLeadId?: number | null",
  "consultantAgent: ConsultantAgentPage",
  "selectedLeadId={selectedLeadId}",
  "ConsultantAgentPageProps",
  "selectedLeadId?: number | null",
  "leads.find((item) => item.id === selectedLeadId)",
  'onNavigate("consultantCustomer360", selectedLead.id)',
  "查看客户360",
]) {
  const combined = `${appSource}\n${backofficeShellSource}\n${consultantAgentSource}`;
  if (!combined.includes(token)) {
    throw new Error(`顾问Agent可见闭环缺少: ${token}`);
  }
}

for (const token of ['onNavigate("consultantAgent"', "交给助手"]) {
  if (!customerGrowthSource.includes(token) && !customer360Source.includes(token)) {
    throw new Error(`客户增长/客户360必须能带当前客户进入顾问Agent，缺少: ${token}`);
  }
}

console.log("role agent pages check OK");
