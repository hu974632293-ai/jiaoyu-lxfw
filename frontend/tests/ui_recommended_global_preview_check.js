const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const previewPath = path.join(root, "design-previews", "task7-recommended-global-preview.html");
const screenshotPath = path.resolve(root, "..", "docs", "superpowers", "specs", "task7-style-screenshots", "task7-recommended-global-preview-full.png");

if (!fs.existsSync(previewPath)) {
  throw new Error("缺少推荐组合全局预览页");
}

const preview = fs.readFileSync(previewPath, "utf8");

for (const text of ["公开官网", "登录入口", "顾问客户增长", "员工工作台", "老师学生服务", "学生服务台", "经营管理", "系统治理"]) {
  if (!preview.includes(text)) {
    throw new Error(`全局预览缺少页面: ${text}`);
  }
}

for (const text of ["服务策展", "可信台账", "智能指挥舱", "新建线索", "初始化 seed", "OpenAPI"]) {
  if (!preview.includes(text)) {
    throw new Error(`全局预览缺少推荐组合关键内容: ${text}`);
  }
}

if (!fs.existsSync(screenshotPath) || fs.statSync(screenshotPath).size < 100000) {
  throw new Error("缺少推荐组合全局预览截图或截图文件过小");
}

console.log("ui recommended global preview check OK");
