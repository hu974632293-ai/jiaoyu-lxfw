const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const page = fs.readFileSync(path.join(root, "src/pages/KnowledgePage.tsx"), "utf8");

const requiredTokens = [
  "DifyHealth",
  "dify-health-panel",
  "loadDifyHealth",
  "retrySyncJob",
  "/api/knowledge/dify-health",
  "/api/knowledge/sync-jobs/${item.id}/retry",
  "配置待完善",
  "重试同步",
];

for (const token of requiredTokens) {
  if (!page.includes(token)) {
    throw new Error(`Dify 同步预留缺少前端承接: ${token}`);
  }
}

console.log("dify sync readiness check OK");
