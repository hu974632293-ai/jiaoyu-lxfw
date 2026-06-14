const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const componentPath = path.join(root, "src/pages/EmployeeAgentPanel.tsx");
const shellPath = path.join(root, "src/pages/BackofficeShellPage.tsx");
const stylesPath = path.join(root, "src/styles.css");
const component = fs.readFileSync(componentPath, "utf8");
const shell = fs.readFileSync(shellPath, "utf8");
const styles = fs.readFileSync(stylesPath, "utf8");

const requiredComponentTokens = [
  "enterprise-agent-shell",
  "enterprise-agent-main",
  "enterprise-agent-conversation",
  "enterprise-agent-execution",
  "enterprise-agent-tabs",
  "/api/knowledge/sessions/latest",
  "/api/enterprise-assistant/actions/confirm",
  "employee_agent",
  "session_id",
  "actor_username",
  "action_type",
  "action_status",
  "requires_confirmation",
  "draft",
  "business_result",
  "confirmAgentAction",
  "当前任务",
  "处理状态",
  "下一步",
  "本次事项",
  "正在处理",
  "关联内容",
];

for (const token of requiredComponentTokens) {
  if (!component.includes(token)) {
    throw new Error(`企业助手组件缺少结构或业务文案: ${token}`);
  }
}

const requiredStyleTokens = [
  ".enterprise-agent-shell",
  ".enterprise-agent-main",
  ".enterprise-agent-conversation",
  ".enterprise-agent-execution",
  ".enterprise-agent-tabs",
  ".enterprise-agent-task-card",
  "position: static",
  "grid-template-columns: minmax(0, 1fr) 236px",
  ".agent-workspace-grid",
  ".agent-content-frame",
  "height: calc(100vh - 8px)",
  "grid-template-areas:",
  '"conversation rail"',
  "grid-template-rows: auto minmax(0, 1fr) auto",
  "overflow-wrap: anywhere",
  "flex: 0 0 auto",
];

for (const token of requiredStyleTokens) {
  if (!styles.includes(token)) {
    throw new Error(`企业助手样式缺少布局规则: ${token}`);
  }
}

const forbiddenTokens = [
  "真实 API",
  "fallback",
  "原型数据",
  "seed",
  "OpenAPI",
  "后续 V2",
  "后续 V3",
  "执行队列",
  "当前上下文",
  "识别意图",
  "生成草稿",
  "写入记录",
  "跳转处理",
  "匹配员工业务场景",
  "等待业务指令",
  "enterprise-agent-quickbar",
  "enterprise-agent-tool-chip",
  "enterprise-agent-artifact",
  "enterprise-agent-artifact-actions",
  "generateDailyDraft",
  "submitDailyReport",
  "buildActionIntent",
];

for (const token of forbiddenTokens) {
  if (component.includes(token)) {
    throw new Error(`企业助手页面不应出现实现话术: ${token}`);
  }
}

const forbiddenStyleTokens = [
  "enterprise-agent-side",
  "grid-template-columns: minmax(0, 1fr) 270px 292px",
  "grid-template-columns: minmax(0, 1fr) 300px",
  "height: calc(100vh - 244px)",
  "height: calc(100vh - 188px)",
  "height: calc(100vh - 32px)",
  "  height: calc(100vh - 96px);",
  "height: min(720px, calc(100vh - 280px))",
  "min-height: calc(100vh - 190px)",
];

for (const token of forbiddenStyleTokens) {
  if (styles.includes(token)) {
    throw new Error(`企业助手不应继续使用三列或伪两列布局: ${token}`);
  }
}

for (const token of ["agent-workspace-grid", "agent-content-frame"]) {
  if (!shell.includes(token)) {
    throw new Error(`企业助手后台外壳缺少专用整屏布局: ${token}`);
  }
}

console.log("employee agent command check OK");
