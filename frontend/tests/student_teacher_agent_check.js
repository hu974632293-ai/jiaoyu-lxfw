const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const studentPath = path.join(root, "src/pages/StudentServicePage.tsx");
const teacherPath = path.join(root, "src/pages/TeacherStudentServicePage.tsx");
const stylesPath = path.join(root, "src/styles.css");

const student = fs.readFileSync(studentPath, "utf8");
const teacher = fs.readFileSync(teacherPath, "utf8");
const styles = fs.readFileSync(stylesPath, "utf8");

const requiredStudentTokens = [
  "student-agent-panel",
  "student-agent-scope",
  "student-agent-draft-queue",
  "学生服务助手",
  "请假草稿",
  "反馈草稿",
  "进度查询",
  "生活支持",
  "确认后提交",
];

for (const token of requiredStudentTokens) {
  if (!student.includes(token)) {
    throw new Error(`学生服务台缺少 Agent 承接结构: ${token}`);
  }
}

const requiredTeacherTokens = [
  "teacher-agent-panel",
  "teacher-agent-work-queue",
  "teacher-agent-confirmation",
  "teacher-agent-composer",
  "handleTeacherAgentKeyDown",
  "askTeacherAgent",
  "老师处理助手",
  "待审批请假",
  "待处理反馈",
  "心理预警跟进",
  "确认处理",
];

for (const token of requiredTeacherTokens) {
  if (!teacher.includes(token)) {
    throw new Error(`老师学生服务工作台缺少 Agent 承接结构: ${token}`);
  }
}

const requiredStyleTokens = [
  ".student-agent-panel",
  ".student-agent-scope",
  ".student-agent-draft-queue",
  ".teacher-agent-panel",
  ".teacher-agent-work-queue",
  ".teacher-agent-confirmation",
  "grid-template-columns: minmax(0, 1fr) 280px",
  "overflow-wrap: anywhere",
];

for (const token of requiredStyleTokens) {
  if (!styles.includes(token)) {
    throw new Error(`学生/老师 Agent 样式缺少布局规则: ${token}`);
  }
}

const forbiddenBusinessCopy = ["真实 API", "原型数据", "OpenAPI", "后续 V2", "后续 V3"];

for (const token of forbiddenBusinessCopy) {
  if (student.includes(token) || teacher.includes(token)) {
    throw new Error(`学生/老师业务页不应出现实现话术: ${token}`);
  }
}

console.log("student teacher agent check OK");
