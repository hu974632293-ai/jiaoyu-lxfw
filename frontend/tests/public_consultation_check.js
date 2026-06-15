const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src/pages/PublicPortalPage.tsx"), "utf8");

for (const token of [
  "submitConsultation",
  "/api/leads/public-consultations",
  "customerName",
  "contactInfo",
  "consultationDirection",
  "consultationBackground",
  "source_channel",
  "官网咨询",
  "线索 #",
  "已进入顾问队列",
]) {
  if (!source.includes(token)) {
    throw new Error(`公开官网咨询留资缺少顾问承接闭环: ${token}`);
  }
}

if (!/value=\{customerName\}[\s\S]*?placeholder="请输入姓名"/.test(source)) {
  throw new Error("官网咨询表单应提供姓名输入");
}

if (!/value=\{contactInfo\}[\s\S]*?placeholder="手机 \/ 微信 \/ 邮箱"/.test(source)) {
  throw new Error("官网咨询表单应提供联系方式输入");
}

console.log("public consultation check OK");
