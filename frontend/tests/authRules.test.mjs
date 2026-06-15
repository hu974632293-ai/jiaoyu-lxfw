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

function loadApiClient() {
  const sourcePath = join(import.meta.dirname, "../src/api/client.ts");
  const source = readFileSync(sourcePath, "utf8").replace(
    'const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";',
    'const API_BASE = "http://127.0.0.1:8000";',
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const module = { exports: {} };
  const require = () => {
    throw new Error("client.ts should not require runtime modules in this unit test");
  };
  new Function("module", "exports", "require", compiled)(module, module.exports, require);
  return module.exports;
}

function loadLoginPage(clientExports, authRulesExports = authRules) {
  const sourcePath = join(import.meta.dirname, "../src/pages/LoginPage.tsx");
  const source = readFileSync(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  const icon = () => null;
  const require = (name) => {
    if (name === "lucide-react") {
      return { ArrowLeft: icon, Building2: icon, GraduationCap: icon, KeyRound: icon, LockKeyhole: icon, ShieldCheck: icon, User: icon };
    }
    if (name === "react") {
      return { useState: () => ["", () => undefined] };
    }
    if (name === "react/jsx-runtime") {
      return { jsx: () => null, jsxs: () => null };
    }
    if (name === "../api/client") {
      return clientExports;
    }
    if (name === "../authRules") {
      return authRulesExports;
    }
    throw new Error(`Unexpected module ${name}`);
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

test("admin account exposes governance pages without business role assistants", () => {
  for (const page of ["adminUsers", "adminRoles", "adminPermissions", "adminAudit", "adminNotifications", "adminKnowledgeSources", "adminSystemStatus"]) {
    assert.equal(authRules.canAccessAccountPage("admin", page), true, `${page} should be available to admin`);
  }
  for (const page of ["employeeAgent", "consultantAgent", "teacherAgent", "studentAgent", "managerAgent", "studentLeaveRequest", "teacherLeaveApproval", "consultantLeadQueue", "employeeReports", "employeeCustomerQuery", "managerRiskQueue"]) {
    assert.equal(authRules.canAccessAccountPage("admin", page), false, `${page} should not be in the admin production view`);
  }
});

test("test account can render menus by demo role view", () => {
  assert.equal(authRules.canSwitchDemoRole("test"), true);
  assert.equal(authRules.canSwitchDemoRole("admin"), false);
  assert.deepEqual(authRules.getAccountVisiblePages("test", "student"), authRules.roleVisiblePages.student);
  assert.deepEqual(authRules.getAccountVisiblePages("test", "employee"), authRules.roleVisiblePages.employee);
  assert.equal(authRules.getAccountVisiblePages("test", "employee").includes("employeeAgent"), true);
  assert.equal(authRules.getAccountVisiblePages("test", "consultant").includes("consultantAgent"), true);
  assert.equal(authRules.getAccountVisiblePages("test", "teacher").includes("teacherAgent"), true);
  assert.equal(authRules.getAccountVisiblePages("test", "student").includes("studentAgent"), true);
  assert.equal(authRules.getAccountVisiblePages("test", "manager").includes("managerAgent"), true);
  assert.deepEqual(authRules.getAccountVisiblePages("test", "consultant"), authRules.roleVisiblePages.consultant);
  assert.deepEqual(authRules.getAccountVisiblePages("admin", "student"), authRules.roleVisiblePages.admin);
});

test("student account cannot access staff, teacher, manager, admin, or enterprise agent pages", () => {
  assert.equal(authRules.canAccessAccountPage("student", "studentLeaveRequest"), true);
  for (const page of ["employeeReports", "employeeAgent", "teacherLeaveApproval", "managerRiskQueue", "adminPermissions"]) {
    assert.equal(authRules.canAccessAccountPage("student", page), false, `${page} should be denied for student`);
  }
});

test("business roles expose their own assistant instead of sharing employee assistant", () => {
  assert.equal(authRules.canAccessAccountPage("employee", "employeeAgent"), true);
  assert.equal(authRules.canAccessAccountPage("consultant", "consultantAgent"), true);
  assert.equal(authRules.canAccessAccountPage("teacher", "teacherAgent"), true);
  assert.equal(authRules.canAccessAccountPage("student", "studentAgent"), true);
  assert.equal(authRules.canAccessAccountPage("manager", "managerAgent"), true);
  for (const account of ["manager", "consultant", "teacher"]) {
    assert.equal(authRules.canAccessAccountPage(account, "employeeAgent"), false, `${account} should not reuse employee enterprise assistant`);
    assert.equal(authRules.canAccessAccountPage(account, "employeeReports"), false, `${account} should not receive employee daily reports by default`);
    assert.equal(authRules.canAccessAccountPage(account, "employeeGuide"), false, `${account} should not receive employee guide by default`);
  }
});

test("employee customer query stays in employee workspace only", () => {
  assert.equal(authRules.canAccessAccountPage("employee", "employeeCustomerQuery"), true);
  for (const account of ["consultant", "teacher", "manager", "admin"]) {
    assert.equal(authRules.canAccessAccountPage(account, "employeeCustomerQuery"), false, `${account} should not access customer query by default`);
  }
});

test("manager, consultant, and teacher keep role-specific entries", () => {
  for (const account of ["manager", "consultant", "teacher"]) {
    assert.equal(authRules.canAccessAccountPage(account, "roleOverview"), true, `${account} should access role overview`);
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

test("shared api client sends saved access token as bearer header", async () => {
  const storage = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
  };
  const client = loadApiClient();
  client.setAccessToken("front-token");
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "http://127.0.0.1:8000/api/protected");
    assert.equal(options.headers.Authorization, "Bearer front-token");
    assert.equal(options.headers["X-Trace"], "task5");
    return {
      status: 200,
      json: async () => ({ code: 0, msg: "ok", data: { ok: true } }),
    };
  };

  const data = await client.apiRequest("/api/protected", { headers: { "X-Trace": "task5" } });

  assert.deepEqual(data, { ok: true });
});

test("shared api client clears access token after unauthorized response", async () => {
  const storage = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
  };
  const client = loadApiClient();
  client.setAccessToken("expired-token");
  globalThis.fetch = async () => ({
    status: 401,
    json: async () => ({ code: 40100, msg: "请先登录", data: null }),
  });

  await assert.rejects(() => client.apiRequest("/api/auth/me"), /请先登录/);

  assert.equal(client.getAccessToken(), null);
});

test("login submit calls backend login, saves token, and maps returned user to account", async () => {
  let savedToken = "";
  const loginPage = loadLoginPage({
    apiRequest: async (path, options) => {
      assert.equal(path, "/api/auth/login");
      assert.equal(options.method, "POST");
      assert.deepEqual(JSON.parse(options.body), { username: "student", password: "student123" });
      return {
        access_token: "student-token",
        user: { username: "student", role: "student", real_name: "陈同学" },
      };
    },
    setAccessToken: (token) => {
      savedToken = token;
    },
  });

  const accountKey = await loginPage.loginWithCredentials("student", "student123");

  assert.equal(savedToken, "student-token");
  assert.equal(accountKey, "student");
});
