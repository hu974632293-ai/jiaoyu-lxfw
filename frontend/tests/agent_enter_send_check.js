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
    label: "企业助手",
    file: "src/pages/EmployeeAgentPanel.tsx",
    handler: "handlePromptKeyDown",
    submit: "void sendPrompt(input)",
    textarea: "onKeyDown={handlePromptKeyDown}",
  },
  {
    label: "学生服务助手",
    file: "src/pages/StudentServicePage.tsx",
    handler: "handleChatKeyDown",
    submit: "void sendChat()",
    textarea: "onKeyDown={handleChatKeyDown}",
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

const buttonOnlyAgentFiles = [
  ["客户研判助手", "src/pages/CustomerGrowthPage.tsx"],
  ["报告解释助手", "src/pages/ReportsPage.tsx"],
];

for (const [label, file] of buttonOnlyAgentFiles) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  if (!source.includes(label)) {
    throw new Error(`${label} 缺少助手入口标识`);
  }
}

console.log("agent enter send check OK");
