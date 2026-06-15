const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src/pages/PublicPortalPage.tsx"), "utf8");

for (const token of [
  "lastRegistration",
  "setLastRegistration(registration)",
  "lastRegistration.lead_id",
  "线索 #",
  "已进入顾问队列",
]) {
  if (!source.includes(token)) {
    throw new Error(`公开官网报名缺少顾问承接可见状态: ${token}`);
  }
}

console.log("public portal registration check OK");
