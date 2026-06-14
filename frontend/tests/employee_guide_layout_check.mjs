import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const pageSource = readFileSync(join(import.meta.dirname, "../src/pages/EmployeeWorkspacePage.tsx"), "utf8");
const cssSource = readFileSync(join(import.meta.dirname, "../src/styles.css"), "utf8");

test("employee guide view uses compact guide content instead of the long directory layout", () => {
  assert.match(pageSource, /const guideDirectoryContacts = directoryContacts\.slice\(0,\s*4\);/);
  assert.match(pageSource, /employee-guide-contact-panel/);
  assert.doesNotMatch(pageSource, /\{showOrg \|\| showGuide \? <section className="panel-block employee-directory-panel">/);

  assert.match(cssSource, /\.employee-guide-workspace\s+\.employee-guide-panel\s*\{[\s\S]*?min-height:\s*0;/);
  assert.match(cssSource, /\.employee-guide-workspace\s+\.guide-list\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(cssSource, /\.employee-guide-contact-list\s*\{[\s\S]*?max-height:\s*clamp\(/);
});
