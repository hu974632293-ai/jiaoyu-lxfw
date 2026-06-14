import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

function loadEnterpriseAgentRules() {
  const sourcePath = join(import.meta.dirname, "../src/enterpriseAgentRules.ts");
  const source = readFileSync(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const module = { exports: {} };
  const require = () => {
    throw new Error("enterpriseAgentRules.ts should not require runtime modules in this unit test");
  };
  new Function("module", "exports", "require", compiled)(module, module.exports, require);
  return module.exports;
}

const agentRules = loadEnterpriseAgentRules();

test("enterprise agent scenes are role scoped and do not expose customer by default", () => {
  assert.deepEqual(agentRules.getEnterpriseAgentSceneKeys("consultant"), ["daily", "org", "customer", "guide"]);
  assert.deepEqual(agentRules.getEnterpriseAgentSceneKeys("employee"), ["daily", "org", "guide"]);
  assert.deepEqual(agentRules.getEnterpriseAgentSceneKeys("teacher"), ["daily", "org", "guide"]);
  assert.deepEqual(agentRules.getEnterpriseAgentSceneKeys("manager"), ["daily", "org", "guide"]);
  assert.deepEqual(agentRules.getEnterpriseAgentSceneKeys("admin"), ["org", "guide"]);
  assert.deepEqual(agentRules.getEnterpriseAgentSceneKeys("student"), []);
});

test("manager daily scene uses summary wording instead of personal draft wording", () => {
  const managerDaily = agentRules.getEnterpriseAgentScenesForRole("manager").find((scene) => scene.key === "daily");
  assert.equal(managerDaily?.label, "日报");
  assert.equal(managerDaily?.hint, "团队汇总");
  assert.match(managerDaily?.prompt ?? "", /汇总/);
});
