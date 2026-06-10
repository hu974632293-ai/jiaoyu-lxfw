const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const previewPath = path.join(root, "design-previews", "task7-skill-combo-directions.html");
const screenshotPath = path.resolve(root, "..", "docs", "superpowers", "specs", "task7-style-screenshots", "task7-skill-combo-directions-full.png");

if (!fs.existsSync(previewPath)) {
  throw new Error("缺少 Task 7 skill 组合自由发挥预览页");
}

if (!fs.existsSync(screenshotPath) || fs.statSync(screenshotPath).size < 100000) {
  throw new Error("缺少 Task 7 skill 组合效果图截图或截图文件过小");
}

const preview = fs.readFileSync(previewPath, "utf8");

const requiredDirections = [
  "服务策展 Editorial Portal",
  "智能运营 Command Center",
  "可信台账 Governance Ledger",
  "任务动线 Service Flow OS",
  "空间画布 Workbench Canvas",
];

for (const text of requiredDirections) {
  if (!preview.includes(text)) {
    throw new Error(`缺少自由发挥效果图: ${text}`);
  }
}

const requiredSkills = [
  "product-design:get-context",
  "product-design:ideate",
  "frontend-design",
  "impeccable craft",
  "design-taste-frontend",
  "gsap motion thinking",
  "image-to-code mindset",
  "browser screenshot QA",
];

for (const text of requiredSkills) {
  if (!preview.includes(text)) {
    throw new Error(`缺少 skill 组合说明: ${text}`);
  }
}

const layoutMarkers = [
  "editorial-layout",
  "command-layout",
  "ledger-layout",
  "flow-layout",
  "canvas-layout",
];

for (const marker of layoutMarkers) {
  if (!preview.includes(marker)) {
    throw new Error(`缺少差异化布局结构: ${marker}`);
  }
}

console.log("ui skill combo preview check OK");
