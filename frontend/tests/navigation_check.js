const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const files = [
  "src/navigation.ts",
  "src/App.tsx",
  "src/pages/LoginPage.tsx",
  "src/pages/BackofficeShellPage.tsx",
].map((file) => path.join(root, file));

const contents = Object.fromEntries(
  files.map((file) => [path.relative(root, file).replace(/\\/g, "/"), fs.readFileSync(file, "utf8")])
);
const allText = Object.values(contents).join("\n");

const requiredPageKeys = [
  "consultantAgent",
  "customerGrowth",
  "customer360",
  "employeeWorkspace",
  "employeeAgent",
  "teacherAgent",
  "teacherStudentService",
  "studentAgent",
  "studentService",
  "managerAgent",
  "managementDashboard",
  "systemGovernance",
];

for (const key of requiredPageKeys) {
  if (!contents["src/navigation.ts"].includes(`"${key}"`)) {
    throw new Error(`缺少后台 page key: ${key}`);
  }
}

const expectedDefaults = {
  admin: "roleOverview",
  manager: "roleOverview",
  consultant: "roleOverview",
  employee: "roleOverview",
  teacher: "roleOverview",
  student: "roleOverview",
};

for (const [role, page] of Object.entries(expectedDefaults)) {
  const pattern = new RegExp(`${role}:\\s*"${page}"`);
  if (!pattern.test(contents["src/navigation.ts"])) {
    throw new Error(`角色 ${role} 默认入口应为 ${page}`);
  }
}

for (const forbidden of ["二期助手", "当前角色隐藏", "角色暂不展示", '"assistants"']) {
  if (allText.includes(forbidden)) {
    throw new Error(`不应继续出现: ${forbidden}`);
  }
}

if (/disabled=\{disabled\}/.test(contents["src/pages/BackofficeShellPage.tsx"])) {
  throw new Error("后台导航不应渲染禁用入口");
}

const expectedAgentNav = [
  ["consultantAgent", "客户研判助手"],
  ["employeeAgent", "企业助手"],
  ["teacherAgent", "老师处理助手"],
  ["studentAgent", "学生服务助手"],
  ["managerAgent", "报告解释助手"],
];

for (const [key, label] of expectedAgentNav) {
  if (!contents["src/navigation.ts"].includes(`key: "${key}", label: "${label}"`)) {
    throw new Error(`缺少角色助手导航项: ${label}`);
  }
}

const expectedAgentMappings = [
  "consultantAgent: ConsultantAgentPage",
  "employeeAgent: EmployeeAgentPanel",
  "teacherAgent: TeacherAgentPage",
  "studentAgent: StudentAgentPage",
  "managerAgent: ManagerAgentPage",
];

for (const token of expectedAgentMappings) {
  if (!contents["src/pages/BackofficeShellPage.tsx"].includes(token)) {
    throw new Error(`角色助手缺少独立页面映射: ${token}`);
  }
}

const forbiddenAgentShellMappings = [
  "consultantAgent: CustomerGrowthPage",
  "teacherAgent: TeacherStudentServicePage",
  "studentAgent: StudentServicePage",
  "managerAgent: ReportsPage",
  'if (activePage === "consultantAgent")',
  'if (activePage === "managerAgent")',
];

for (const token of forbiddenAgentShellMappings) {
  if (contents["src/pages/BackofficeShellPage.tsx"].includes(token)) {
    throw new Error(`角色助手不应套用原工作台页面: ${token}`);
  }
}

if (!/const isAgentPage = \["consultantAgent", "employeeAgent", "teacherAgent", "studentAgent", "managerAgent"\]\.includes\(activePage\)/.test(contents["src/pages/BackofficeShellPage.tsx"])) {
  throw new Error("角色助手页应统一使用 agent-workspace-grid 布局");
}

console.log("navigation check OK");
