import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const pageSource = readFileSync(join(import.meta.dirname, "../src/pages/EmployeeWorkspacePage.tsx"), "utf8");
const cssSource = readFileSync(join(import.meta.dirname, "../src/styles.css"), "utf8");

test("employee org view uses a dedicated aligned side-panel layout", () => {
  assert.match(pageSource, /employee-org-workspace/);
  assert.match(pageSource, /employee-org-scroll-list/);
  assert.match(pageSource, /employee-directory-scroll-list/);
  assert.match(pageSource, /<div className="source-list employee-directory-scroll-list">[\s\S]*selectedContact \? \(/);

  assert.match(cssSource, /\.employee-org-workspace,\s*\n\.employee-workbench-grid-single\s*>\s*\.side-stack\.employee-org-workspace\s*\{[\s\S]*?align-items:\s*stretch;/);
  assert.match(cssSource, /\.employee-workbench-grid-single\s*>\s*\.side-stack\.employee-org-workspace/);
  assert.match(cssSource, /\.employee-org-workspace\s+\.employee-org-panel,\s*\n\.employee-org-workspace\s+\.employee-directory-panel\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-rows:\s*auto auto auto minmax\(0,\s*1fr\);[\s\S]*?height:\s*clamp\(/);
  assert.match(cssSource, /\.employee-org-scroll-list,\s*\n\.employee-directory-scroll-list\s*\{[\s\S]*?height:\s*auto;[\s\S]*?min-height:\s*0;[\s\S]*?align-self:\s*stretch;/);
});
