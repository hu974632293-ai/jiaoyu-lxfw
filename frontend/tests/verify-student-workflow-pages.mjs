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
const studentPages = new Set(["StudentLeaveWorkflowPage", "StudentFeedbackWorkflowPage"]);

for (const [pageKey, componentName] of requiredPages) {
  const componentSource = readFileSync(join(srcRoot, "pages", `${componentName}.tsx`), "utf8");
  assert.match(
    shellSource,
    new RegExp(`${pageKey}:\\s*${componentName}`),
    `${pageKey} 应映射到独立业务组件 ${componentName}`,
  );
  assert.ok(
    existsSync(join(srcRoot, "pages", `${componentName}.tsx`)),
    `${componentName}.tsx 应存在`,
  );
  assert.doesNotMatch(
    componentSource,
    /className="workflow-detail-grid"/,
    `${componentName} 不应把详情和处理记录放在底部独立区域`,
  );
  assert.match(
    componentSource,
    /className="workflow-detail-column"/,
    `${componentName} 应包含同屏详情记录列`,
  );
  assert.match(
    componentSource,
    /className="timeline workflow-history-list"/,
    `${componentName} 处理记录应使用受控滚动列表`,
  );
  assert.match(
    componentSource,
    /className="panel-block workflow-history-panel"/,
    `${componentName} 处理记录卡片应使用稳定高度面板`,
  );
  assert.match(
    componentSource,
    /className="panel-block workflow-list-panel"/,
    `${componentName} 列表或队列卡片应使用稳定高度面板`,
  );
  assert.match(
    componentSource,
    /className="select-list workflow-list workflow-scroll-list"/,
    `${componentName} 列表或队列内容应使用受控滚动列表`,
  );
  if (studentPages.has(componentName)) {
    assert.match(
      componentSource,
      /className="workflow-student-layout"/,
      `${componentName} 学生端应使用本人事项两列布局`,
    );
    assert.doesNotMatch(
      componentSource,
      /<h3>学生<\/h3>/,
      `${componentName} 学生端不应渲染学生选择列`,
    );
    assert.doesNotMatch(
      componentSource,
      /studentOptions\.map/,
      `${componentName} 学生端不应遍历学生列表作为页面功能`,
    );
  } else {
    assert.match(
      componentSource,
      /className="workflow-action-layout"/,
      `${componentName} 应使用同屏业务处理布局`,
    );
  }
}
