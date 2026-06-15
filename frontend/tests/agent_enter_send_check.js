const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const checks = [
  {
    label: "公开客服 Agent",
    file: "src/pages/PublicPortalPage.tsx",
    handler: "handleAgentKeyDown",
    submit: "void askAgent()",
    textarea: "onKeyDown={handleAgentKeyDown}",
  },
  {
    label: "员工企业助手",
    file: "src/pages/EmployeeAgentPanel.tsx",
    handler: "handlePromptKeyDown",
    submit: "void sendPrompt(input)",
    textarea: "onKeyDown={handlePromptKeyDown}",
  },
  {
    label: "顾问客户研判助手",
    file: "src/pages/CustomerGrowthPage.tsx",
    handler: "handleAssessmentAgentKeyDown",
    submit: "void askAssessmentAssistant()",
    textarea: "onKeyDown={handleAssessmentAgentKeyDown}",
  },
  {
    label: "老师处理助手",
    file: "src/pages/TeacherStudentServicePage.tsx",
    handler: "handleTeacherAgentKeyDown",
    submit: "void askTeacherAgent()",
    textarea: "onKeyDown={handleTeacherAgentKeyDown}",
  },
  {
    label: "学生服务助手",
    file: "src/pages/StudentServicePage.tsx",
    handler: "handleChatKeyDown",
    submit: "void sendChat()",
    textarea: "onKeyDown={handleChatKeyDown}",
  },
  {
    label: "管理者报告解释助手",
    file: "src/pages/ReportsPage.tsx",
    handler: "handleReportAgentKeyDown",
    submit: "void askReportAssistant()",
    textarea: "onKeyDown={handleReportAgentKeyDown}",
  },
  {
    label: "知识库场景问答",
    file: "src/pages/KnowledgePage.tsx",
    handler: "handleQuestionKeyDown",
    submit: "void ask()",
    textarea: "onKeyDown={handleQuestionKeyDown}",
  },
];

for (const check of checks) {
  const source = fs.readFileSync(path.join(root, check.file), "utf8");
  for (const token of [
    check.handler,
    'event.key === "Enter"',
    "!event.shiftKey",
    "event.preventDefault()",
    check.submit,
    check.textarea,
  ]) {
    if (!source.includes(token)) {
      throw new Error(`${check.label} 缺少回车发送验收点: ${token}`);
    }
  }
}

console.log("agent enter send check OK");
