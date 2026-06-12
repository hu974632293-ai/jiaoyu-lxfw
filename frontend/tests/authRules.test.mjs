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
    throw new Error("authRules.ts 不应依赖运行时模块");
  };
  new Function("module", "exports", "require", compiled)(module, module.exports, require);
  return module.exports;
}

const authRules = loadAuthRules();

test("测试账号拥有全部后台页面权限", () => {
  for (const page of ["adminUsers", "studentLeaveRequest", "teacherLeaveApproval", "consultantLeadQueue", "employeeReports", "managerRiskQueue"]) {
    assert.equal(authRules.canAccessAccountPage("test", page), true, `${page} 应允许测试账号访问`);
  }
});

test("学生账号不能访问内部员工、老师、管理者或管理员页面", () => {
  assert.equal(authRules.canAccessAccountPage("student", "studentLeaveRequest"), true);
  for (const page of ["employeeReports", "teacherLeaveApproval", "managerRiskQueue", "adminPermissions"]) {
    assert.equal(authRules.canAccessAccountPage("student", page), false, `${page} 应拒绝学生访问`);
  }
});

test("管理者、顾问、老师继承员工工作台入口", () => {
  for (const account of ["manager", "consultant", "teacher"]) {
    assert.equal(authRules.canAccessAccountPage(account, "employeeReports"), true, `${account} 应允许访问员工日报`);
    assert.equal(authRules.canAccessAccountPage(account, "employeeOrg"), true, `${account} 应允许访问组织架构`);
  }
});

test("登录快捷入口只填充账号，不直接决定权限", () => {
  assert.equal(authRules.loginShortcuts.enterprise.accountKey, "consultant");
  assert.equal(authRules.loginShortcuts.student.accountKey, "student");
  assert.equal(authRules.loginShortcuts.test.accountKey, "test");
});

test("账号密码认证成功后返回账号绑定角色", () => {
  assert.equal(authRules.authenticateLogin("test", "test123")?.role, "admin");
  assert.equal(authRules.authenticateLogin("student", "student123")?.role, "student");
  assert.equal(authRules.authenticateLogin("test", "wrong"), null);
});
