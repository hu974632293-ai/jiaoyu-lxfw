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
  "role-agent-capability-grid",
]) {
  if (!shellSource.includes(token)) {
    throw new Error(`独立角色助手共享壳缺少结构: ${token}`);
  }
}

const styles = fs.readFileSync(path.join(root, "src/styles.css"), "utf8");
for (const token of [
  ".enterprise-agent-shell",
  ".enterprise-agent-tabs",
  ".enterprise-agent-conversation",
  ".enterprise-agent-dialog",
  ".enterprise-agent-input",
  ".role-agent-capability-grid",
]) {
  if (!styles.includes(token)) {
    throw new Error(`独立角色助手样式缺少: ${token}`);
  }
}

const backofficeShell = fs.readFileSync(path.join(root, "src/pages/BackofficeShellPage.tsx"), "utf8");
if (!backofficeShell.includes('isSidebarCollapsed ? "sidebar-collapsed" : "sidebar-expanded"')) {
  throw new Error("角色助手所在后台壳必须保留侧边栏展开/收起状态");
}

if (/agent-workspace-grid,\s*\n\.agent-workspace-grid\.sidebar-expanded,\s*\n\.agent-workspace-grid\.sidebar-collapsed\s*\{[\s\S]*?grid-template-columns:\s*76px/.test(styles)) {
  throw new Error("Agent 布局不应把侧边栏展开态也强制成收起宽度");
}

console.log("role agent pages check OK");
