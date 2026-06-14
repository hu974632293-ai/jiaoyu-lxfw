const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const page = fs.readFileSync(path.join(root, "src/pages/SystemAdminPage.tsx"), "utf8");

const requiredTokens = [
  "target_url",
  "markNotificationRead",
  "handleNotification",
  "/api/notifications/${item.id}/read",
  "/api/notifications/${item.id}/handle",
  "标记已读",
  "处理完成",
  "打开对象",
];

for (const token of requiredTokens) {
  if (!page.includes(token)) {
    throw new Error(`通知闭环缺少前端承接: ${token}`);
  }
}

console.log("notification closure check OK");
