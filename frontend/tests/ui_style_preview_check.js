const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const previewPath = path.join(root, "design-previews", "task7-style-directions.html");

if (!fs.existsSync(previewPath)) {
  throw new Error("缺少 Task 7 UI 风格效果图预览页");
}

const preview = fs.readFileSync(previewPath, "utf8");

for (const text of ["简约大气", "科技高级感", "绚烂花哨", "稳重政企"]) {
  if (!preview.includes(text)) {
    throw new Error(`缺少 UI 风格方向: ${text}`);
  }
}

for (const text of ["官网首页", "登录页", "顾问客户增长", "员工工作台", "老师学生服务工作台", "管理员系统治理"]) {
  const count = preview.split(text).length - 1;
  if (count < 4) {
    throw new Error(`每套风格都应覆盖页面: ${text}`);
  }
}

const formalSources = [
  "src/App.tsx",
  "src/styles.css",
  "src/pages/PublicPortalPage.tsx",
  "src/pages/BackofficeShellPage.tsx",
].map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");

for (const text of ["方案 A：简约大气", "方案 B：科技高级感", "方案 C：绚烂花哨", "方案 D：稳重政企"]) {
  if (formalSources.includes(text)) {
    throw new Error(`风格方案不应写入正式前端: ${text}`);
  }
}

console.log("ui style preview check OK");
