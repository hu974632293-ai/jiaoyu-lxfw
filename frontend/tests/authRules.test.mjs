import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

function loadAuthRules() {
  const sourcePath = join(import.meta.dirname, "../src/authRules.ts");
  const source = readFileSync(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const module = { exports: {} };
  const require = () => {
    throw new Error("authRules.ts should not require runtime modules in this unit test");
  };
  new Function("module", "exports", "require", compiled)(module, module.exports, require);
  return module.exports;
}

const authRules = loadAuthRules();

test("test account can access every backoffice page needed by acceptance", () => {
  for (const page of ["adminUsers", "studentLeaveRequest", "teacherLeaveApproval", "consultantLeadQueue", "employeeReports", "managerRiskQueue"]) {
    assert.equal(authRules.canAccessAccountPage("test", page), true, `${page} should be available to the test account`);
  }
});

test("admin account only exposes system governance pages", () => {
  for (const page of ["adminUsers", "adminRoles", "adminPermissions", "adminAudit", "adminNotifications", "adminKnowledgeSources", "adminSystemStatus"]) {
    assert.equal(authRules.canAccessAccountPage("admin", page), true, `${page} should be available to admin`);
  }
  for (const page of ["studentLeaveRequest", "teacherLeaveApproval", "consultantLeadQueue", "employeeReports", "managerRiskQueue"]) {
    assert.equal(authRules.canAccessAccountPage("admin", page), false, `${page} should not be in the admin production view`);
  }
});

test("test account can render menus by demo role view", () => {
  assert.equal(authRules.canSwitchDemoRole("test"), true);
  assert.equal(authRules.canSwitchDemoRole("admin"), false);
  assert.deepEqual(authRules.getAccountVisiblePages("test", "student"), authRules.roleVisiblePages.student);
  assert.deepEqual(authRules.getAccountVisiblePages("test", "consultant"), authRules.roleVisiblePages.consultant);
  assert.deepEqual(authRules.getAccountVisiblePages("admin", "student"), authRules.roleVisiblePages.admin);
});

test("student account cannot access staff, teacher, manager, or admin pages", () => {
  assert.equal(authRules.canAccessAccountPage("student", "studentLeaveRequest"), true);
  for (const page of ["employeeReports", "teacherLeaveApproval", "managerRiskQueue", "adminPermissions"]) {
    assert.equal(authRules.canAccessAccountPage("student", page), false, `${page} should be denied for student`);
  }
});

test("manager, consultant, and teacher inherit employee workspace entries", () => {
  for (const account of ["manager", "consultant", "teacher"]) {
    assert.equal(authRules.canAccessAccountPage(account, "employeeReports"), true, `${account} should access employee reports`);
    assert.equal(authRules.canAccessAccountPage(account, "employeeOrg"), true, `${account} should access organization lookup`);
    assert.equal(authRules.canAccessAccountPage(account, "employeeAgent"), true, `${account} should access enterprise assistant`);
  }
});

test("employee account can access enterprise assistant from employee workspace", () => {
  assert.equal(authRules.canAccessAccountPage("employee", "employeeAgent"), true);
  assert.equal(authRules.getAccountVisiblePages("employee").includes("employeeAgent"), true);
});

test("login shortcuts fill accounts without directly deciding permission scope", () => {
  assert.equal(authRules.loginShortcuts.enterprise.accountKey, "consultant");
  assert.equal(authRules.loginShortcuts.student.accountKey, "student");
  assert.equal(authRules.loginShortcuts.test.accountKey, "test");
});

test("username and password authentication returns the account-bound role", () => {
  assert.equal(authRules.authenticateLogin("test", "test123")?.role, "admin");
  assert.equal(authRules.authenticateLogin("student", "student123")?.role, "student");
  assert.equal(authRules.authenticateLogin("test", "wrong"), null);
});
