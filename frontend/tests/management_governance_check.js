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

console.log("management governance check OK");
