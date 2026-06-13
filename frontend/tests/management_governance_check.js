const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const requiredFiles = [
  "src/pages/ManagementDashboardPage.tsx",
  "src/pages/SystemGovernancePage.tsx",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`缺少管理后台页面文件: ${file}`);
  }
}

const manager = read("src/pages/ManagementDashboardPage.tsx");
const governance = read("src/pages/SystemGovernancePage.tsx");
const shell = read("src/pages/BackofficeShellPage.tsx");
const styles = read("src/styles.css");

for (const text of ["经营管理后台", "增长总览", "客户经营报告", "员工日报汇总", "学生心理健康周报", "投诉处理周报", "风险队列"]) {
  if (!manager.includes(text)) {
    throw new Error(`经营管理后台缺少内容: ${text}`);
  }
}

for (const forbidden of ["onSeedDemo", "/api/demo/seed", "OpenAPI"]) {
  if (manager.includes(forbidden)) {
    throw new Error(`经营管理后台不应包含治理写操作或系统入口: ${forbidden}`);
  }
}

for (const text of ["系统治理", "用户", "角色", "权限", "审计", "通知", "知识来源", "OpenAPI", "seed", "fallback"]) {
  if (!governance.includes(text)) {
    throw new Error(`系统治理缺少内容: ${text}`);
  }
}

for (const component of ["ManagementDashboardPage", "SystemGovernancePage"]) {
  if (!shell.includes(component)) {
    throw new Error(`Shell 未接入管理页面: ${component}`);
  }
}

if (!/\.management-report-workspace\s*\{[\s\S]*?align-items:\s*stretch;/.test(styles)) {
  throw new Error("管理者报告工作区三列卡片应底线对齐");
}

if (!/\.management-report-workspace\s+\.report-workspace-panel\s*\{[\s\S]*?height:\s*clamp\(/.test(styles)) {
  throw new Error("管理者报告工作区卡片应使用稳定高度");
}

if (!/\.report-workspace-panel\s+\.report-row-list,[\s\S]*?\.report-workspace-panel\s+\.compact-report-list,[\s\S]*?\.management-summary-panel\s+\.compact-summary-list\s*\{[\s\S]*?flex:\s*1;[\s\S]*?overflow:\s*auto;/.test(styles)) {
  throw new Error("管理者报告工作区列表和摘要应在卡片内部滚动");
}

console.log("management governance check OK");
