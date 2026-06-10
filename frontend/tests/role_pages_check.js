const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const requiredFiles = [
  "src/pages/EmployeeWorkspacePage.tsx",
  "src/pages/TeacherStudentServicePage.tsx",
  "src/pages/StudentServicePage.tsx",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`缺少角色页面文件: ${file}`);
  }
}

const employee = read("src/pages/EmployeeWorkspacePage.tsx");
const teacher = read("src/pages/TeacherStudentServicePage.tsx");
const student = read("src/pages/StudentServicePage.tsx");
const shell = read("src/pages/BackofficeShellPage.tsx");
const sourceFiles = [
  "src/pages/BackofficeShellPage.tsx",
  "src/pages/EmployeeWorkspacePage.tsx",
  "src/pages/TeacherStudentServicePage.tsx",
  "src/pages/StudentServicePage.tsx",
  "src/pages/LoginPage.tsx",
  "src/navigation.ts",
].map(read).join("\n");

for (const text of ["员工工作台", "录入客户", "查询客户", "更新状态", "提交日报", "组织架构", "新人指南"]) {
  if (!employee.includes(text)) {
    throw new Error(`员工工作台缺少入口: ${text}`);
  }
}

for (const text of ["学生服务工作台", "请假审批", "反馈处理", "心理预警", "学业", "进度"]) {
  if (!teacher.includes(text)) {
    throw new Error(`老师工作台缺少入口: ${text}`);
  }
}

for (const text of ["学生服务台", "请假申请", "投诉建议", "申请进度", "考务节点", "生活支持"]) {
  if (!student.includes(text)) {
    throw new Error(`学生服务台缺少入口: ${text}`);
  }
}

for (const component of ["EmployeeWorkspacePage", "TeacherStudentServicePage", "StudentServicePage"]) {
  if (!shell.includes(component)) {
    throw new Error(`Shell 未接入角色页面: ${component}`);
  }
}

for (const forbidden of ["二期助手", "Phase2AssistantsPage"]) {
  if (sourceFiles.includes(forbidden)) {
    throw new Error(`角色后台不应继续出现: ${forbidden}`);
  }
}

console.log("role pages check OK");
