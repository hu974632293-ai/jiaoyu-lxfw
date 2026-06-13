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
  "customerGrowth",
  "customer360",
  "employeeWorkspace",
  "employeeAgent",
  "teacherStudentService",
  "studentService",
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

if (!/key:\s*"employeeAgent"/.test(contents["src/navigation.ts"])) {
  throw new Error("员工企业助手缺少导航项");
}

if (!/employeeAgent:\s*EmployeeAgentPanel/.test(contents["src/pages/BackofficeShellPage.tsx"])) {
  throw new Error("员工企业助手缺少页面映射");
}

console.log("navigation check OK");
