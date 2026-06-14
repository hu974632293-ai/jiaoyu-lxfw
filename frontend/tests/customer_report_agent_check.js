const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const growth = fs.readFileSync(path.join(root, "src/pages/CustomerGrowthPage.tsx"), "utf8");
const reports = fs.readFileSync(path.join(root, "src/pages/ReportsPage.tsx"), "utf8");
const styles = fs.readFileSync(path.join(root, "src/styles.css"), "utf8");

const requiredGrowthTokens = [
  "customer-assessment-agent",
  "customer-agent-result",
  "askAssessmentAssistant",
  "/api/knowledge/chat",
  "customer_assessment",
  "客户研判助手",
  "补齐研判依据",
  "生成跟进建议",
];

for (const token of requiredGrowthTokens) {
  if (!growth.includes(token)) {
    throw new Error(`客户增长页缺少客户研判 Agent 承接: ${token}`);
  }
}

const requiredReportTokens = [
  "report-assistant-panel",
  "report-agent-result",
  "askReportAssistant",
  "/api/knowledge/chat",
  "report_assistant",
  "报告解释助手",
  "解释本期变化",
  "定位待处理对象",
];

for (const token of requiredReportTokens) {
  if (!reports.includes(token)) {
    throw new Error(`报告中心缺少报告 Agent 承接: ${token}`);
  }
}

const requiredStyleTokens = [
  ".customer-assessment-agent",
  ".customer-agent-result",
  ".report-assistant-panel",
  ".report-agent-result",
  "grid-template-columns: minmax(0, 1fr) 280px",
  "overflow-wrap: anywhere",
];

for (const token of requiredStyleTokens) {
  if (!styles.includes(token)) {
    throw new Error(`客户研判/报告 Agent 样式缺少布局规则: ${token}`);
  }
}

const forbiddenBusinessCopy = ["真实 API", "原型数据", "OpenAPI", "后续 V2", "后续 V3"];

for (const token of forbiddenBusinessCopy) {
  if (growth.includes(token) || reports.includes(token)) {
    throw new Error(`客户/报告业务页不应出现实现话术: ${token}`);
  }
}

console.log("customer report agent check OK");
