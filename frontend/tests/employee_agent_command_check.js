const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const componentPath = path.join(root, "src/pages/EmployeeAgentPanel.tsx");
const stylesPath = path.join(root, "src/styles.css");
const component = fs.readFileSync(componentPath, "utf8");
const styles = fs.readFileSync(stylesPath, "utf8");

const requiredComponentTokens = [
  "enterprise-agent-shell",
  "enterprise-agent-main",
  "enterprise-agent-conversation",
  "enterprise-agent-execution",
  "enterprise-agent-side",
  "日报草稿已生成",
  "执行队列",
  "快捷启动",
  "当前上下文",
  "提交日报",
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
  ".enterprise-agent-side",
  "grid-template-columns: minmax(0, 1fr) 270px",
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
];

for (const token of forbiddenTokens) {
  if (component.includes(token)) {
    throw new Error(`企业助手页面不应出现实现话术: ${token}`);
  }
}

console.log("employee agent command check OK");
