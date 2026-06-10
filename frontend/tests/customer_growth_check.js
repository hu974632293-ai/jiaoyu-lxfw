const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const growth = read("src/pages/CustomerGrowthPage.tsx");
const customer360 = read("src/pages/Customer360Page.tsx");
const combined = `${growth}\n${customer360}`;

for (const text of ["新建线索", "粘贴资料", "触发研判", "客户 360", "新增跟进", "创建任务", "阶段流转"]) {
  if (!combined.includes(text)) {
    throw new Error(`缺少客户增长闭环入口: ${text}`);
  }
}

const requiredApiPatterns = [
  { label: "/api/leads", pattern: /["`]\/api\/leads["`]/ },
  { label: "/api/profile/assess", pattern: /["`]\/api\/profile\/assess["`]/ },
  { label: "/api/leads/${leadId}/follow-ups", pattern: /`\/api\/leads\/\$\{leadId\}\/follow-ups`/ },
  { label: "/api/crm/tasks", pattern: /["`]\/api\/crm\/tasks["`]/ },
  { label: "/api/leads/${leadId}/status", pattern: /`\/api\/leads\/\$\{leadId\}\/status`/ },
];

for (const { label, pattern } of requiredApiPatterns) {
  if (!pattern.test(combined)) {
    throw new Error(`缺少真实 API 调用: ${label}`);
  }
}

if (!/onNavigate\("customer360",\s*(createdId|lead\.id)/.test(growth)) {
  throw new Error("新建或列表客户应可进入客户 360");
}

console.log("customer growth check OK");
