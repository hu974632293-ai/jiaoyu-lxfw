import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const srcRoot = join(projectRoot, "src");
const shellSource = readFileSync(join(srcRoot, "pages", "BackofficeShellPage.tsx"), "utf8");

const requiredPages = [
  ["studentLeaveRequest", "StudentLeaveWorkflowPage"],
  ["studentFeedbackSubmit", "StudentFeedbackWorkflowPage"],
  ["teacherLeaveApproval", "TeacherLeaveApprovalWorkflowPage"],
  ["teacherFeedback", "TeacherFeedbackWorkflowPage"],
];

for (const [pageKey, componentName] of requiredPages) {
  assert.match(
    shellSource,
    new RegExp(`${pageKey}:\\s*${componentName}`),
    `${pageKey} 应映射到独立业务组件 ${componentName}`,
  );
  assert.ok(
    existsSync(join(srcRoot, "pages", `${componentName}.tsx`)),
    `${componentName}.tsx 应存在`,
  );
}
