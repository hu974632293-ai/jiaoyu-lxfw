# 客户增长流水线前端重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前“功能平铺型工作台”重构为“客户增长流水线 + 客户 360 工作台”的前端结构。

**Architecture:** 继续使用当前 React/Vite/TypeScript 单页状态切换方式，不引入路由库。先重构应用壳层和导航分组，再建立客户增长主链路与客户 360，最后把运营资源、二期助手、系统与演示收纳到正确入口。

**Tech Stack:** React 18, Vite, TypeScript, lucide-react, existing `frontend/src/api/client.ts`, FastAPI `{ code, msg, data }` API.

---

## 0. 执行约束

### 必须遵守

1. 先按本计划分阶段执行，不要一次性重写所有页面。
2. 每个阶段只 stage 当前阶段相关文件，并创建中文 Git commit。
3. 每个前端代码阶段至少运行：

```bash
cd frontend
npm.cmd run build
```

4. 如果某阶段触碰后端或需要验证接口契约，再运行：

```bash
cd backend
python -m pytest -v
```

5. 不改 `frontend/src/api/client.ts` 的统一请求入口，除非发现它直接阻塞当前目标。
6. 不新增新的 UI 库、路由库、状态管理库。
7. 不把 OpenAPI、seed、fallback JSON、系统管理表格重新放回主业务首页。
8. 不把企业助手、学生助手和客户增长主链路平铺成同级首屏内容。

### 当前关键参考

- 项目规则：`AGENTS.md`
- 前端 IA spec：`docs/superpowers/specs/2026-06-10-customer-growth-pipeline-frontend-ia.md`
- 原型结构：`docs/prd/教育服务业务系统原型结构-v1.md`
- 当前前端入口：`frontend/src/App.tsx`
- 当前样式：`frontend/src/styles.css`
- 当前页面目录：`frontend/src/pages/`
- 当前原型数据：`frontend/src/data/prototype.ts`

---

## 1. 目标文件结构

本重构优先保持改动可控，不强行建立复杂目录。建议新增少量支撑文件：

| 文件 | 责任 |
| --- | --- |
| `frontend/src/App.tsx` | 应用壳层、一级导航、角色视图、页面切换和客户选择状态 |
| `frontend/src/navigation.ts` | 一级入口、角色可见入口、默认入口、页面标签等导航配置 |
| `frontend/src/pages/GrowthOverviewPage.tsx` | 新版增长总览首页 |
| `frontend/src/pages/CustomerGrowthPage.tsx` | 客户增长流水线和客户列表 |
| `frontend/src/pages/Customer360Page.tsx` | 单个客户 360 工作台 |
| `frontend/src/pages/OperationsResourcesPage.tsx` | 运营资源入口，收纳项目/课程、活动、知识库 |
| `frontend/src/pages/Phase2AssistantsPage.tsx` | 二期助手入口，收纳企业助手、学生助手 |
| `frontend/src/pages/SystemDemoPage.tsx` | 系统与演示入口，收纳系统管理、OpenAPI、seed、fallback、phase2 overview |
| `frontend/src/pages/ReportsPage.tsx` | 保留并按新版入口轻量调整 |
| `frontend/src/data/prototype.ts` | 补充客户 360、增长总览、权限矩阵所需静态展示数据 |
| `frontend/src/styles.css` | 替换全局三栏常驻布局，增加新版壳层、客户 360、分组入口样式 |

保留但逐步降级为子页面或复用页：

| 文件 | 后续用途 |
| --- | --- |
| `frontend/src/pages/EnterpriseAssistantPage.tsx` | 作为 `Phase2AssistantsPage` 内的企业助手详情视图 |
| `frontend/src/pages/StudentAssistantPage.tsx` | 作为 `Phase2AssistantsPage` 内的学生助手详情视图 |
| `frontend/src/pages/ProjectsPage.tsx` | 作为 `OperationsResourcesPage` 内的项目/课程详情视图 |
| `frontend/src/pages/EventsPage.tsx` | 作为 `OperationsResourcesPage` 内的活动详情视图 |
| `frontend/src/pages/KnowledgePage.tsx` | 作为 `OperationsResourcesPage` 或 `SystemDemoPage` 内的知识库详情视图 |
| `frontend/src/pages/SystemAdminPage.tsx` | 作为 `SystemDemoPage` 内的系统管理详情视图 |
| `frontend/src/pages/DashboardPage.tsx` | 被 `GrowthOverviewPage.tsx` 替代后可删除或停止引用 |
| `frontend/src/pages/LeadsPage.tsx` | 被 `CustomerGrowthPage.tsx` 与 `Customer360Page.tsx` 拆分后可删除或停止引用 |

---

## 2. 阶段任务

### Task 1: 重构应用壳层和导航配置

**目标：** 先让一级入口符合新版 IA，但不迁移具体业务页面。

**Files:**

- Create: `frontend/src/navigation.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: 创建导航配置文件**

创建 `frontend/src/navigation.ts`，定义新版一级入口、角色可见入口和默认入口。

建议内容：

```ts
import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Gauge,
  Settings,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RoleKey } from "./data/prototype";

export type PageKey =
  | "growthOverview"
  | "customerGrowth"
  | "customer360"
  | "operations"
  | "reports"
  | "assistants"
  | "systemDemo";

export type NavItem = {
  key: PageKey;
  label: string;
  desc: string;
  group: "main" | "extension" | "governance";
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { key: "growthOverview", label: "增长总览", desc: "今日重点、最近客户和待办", group: "main", icon: Gauge },
  { key: "customerGrowth", label: "客户增长", desc: "CRM 流水线和客户队列", group: "main", icon: Users },
  { key: "operations", label: "运营资源", desc: "项目、活动和知识库", group: "main", icon: BriefcaseBusiness },
  { key: "reports", label: "报告中心", desc: "经营、日报、心理和投诉报告", group: "main", icon: BarChart3 },
  { key: "assistants", label: "二期助手", desc: "企业助手和学生助手", group: "extension", icon: Bot },
  { key: "systemDemo", label: "系统与演示", desc: "权限、审计、OpenAPI 和 seed", group: "governance", icon: Settings },
];

export const roleVisiblePages: Record<RoleKey, PageKey[]> = {
  admin: ["growthOverview", "customerGrowth", "operations", "reports", "assistants", "systemDemo"],
  manager: ["growthOverview", "customerGrowth", "reports", "assistants", "systemDemo"],
  consultant: ["growthOverview", "customerGrowth", "operations", "reports"],
  employee: ["assistants", "customerGrowth", "operations"],
  teacher: ["assistants", "reports", "operations"],
  student: ["assistants"],
};

export const roleDefaultPage: Record<RoleKey, PageKey> = {
  admin: "growthOverview",
  manager: "growthOverview",
  consultant: "customerGrowth",
  employee: "assistants",
  teacher: "assistants",
  student: "assistants",
};
```

- [ ] **Step 2: 更新 `App.tsx` 的页面状态**

在 `App.tsx` 中移除旧的 `PageKey`、`navItems`、`roleVisiblePages` 定义，改为从 `navigation.ts` 引入。

核心状态建议变为：

```ts
const [active, setActive] = useState<PageKey>("growthOverview");
const [role, setRole] = useState<RoleKey>("admin");
const [selectedLeadId, setSelectedLeadId] = useState<number | null>(1);
```

页面跳转函数建议变为：

```ts
function navigate(page: PageKey, leadId?: number) {
  if (typeof leadId === "number") {
    setSelectedLeadId(leadId);
  }
  setActive(page);
}
```

角色切换时使用 `roleDefaultPage`：

```ts
function changeRole(nextRole: RoleKey) {
  setRole(nextRole);
  const allowed = roleVisiblePages[nextRole];
  if (!allowed.includes(active)) {
    setActive(roleDefaultPage[nextRole]);
  }
}
```

- [ ] **Step 3: 临时映射旧页面，保证构建通过**

在新页面尚未创建前，可以临时映射：

| 新入口 | 临时组件 |
| --- | --- |
| `growthOverview` | `DashboardPage` |
| `customerGrowth` | `LeadsPage` |
| `operations` | `ProjectsPage` |
| `reports` | `ReportsPage` |
| `assistants` | `EnterpriseAssistantPage` |
| `systemDemo` | `SystemAdminPage` |

不要把旧入口继续作为一级导航展示。

- [ ] **Step 4: 移除全局常驻右侧上下文面板**

在 `App.tsx` 中删除或停止渲染旧的 `<aside className="context-panel">`。

`workspace-grid` 先改为两栏：

```css
.workspace-grid {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}
```

- [ ] **Step 5: 运行构建验证**

Run:

```bash
cd frontend
npm.cmd run build
```

Expected:

```text
tsc && vite build
✓ built
```

- [ ] **Step 6: 提交**

```bash
git status --short
git add frontend/src/App.tsx frontend/src/navigation.ts frontend/src/styles.css
git commit -m "重构前端导航壳层"
```

---

### Task 2: 实现新版增长总览首页

**目标：** 用 `GrowthOverviewPage` 替代旧 `DashboardPage` 的“四条主线陈列”，首页只展示增长状态和今日推进。

**Files:**

- Create: `frontend/src/pages/GrowthOverviewPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/data/prototype.ts`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: 在原型数据中补充增长总览数据**

在 `frontend/src/data/prototype.ts` 中新增：

```ts
export const growthMetrics = [
  { label: "今日新增", value: "12", trend: "+18%", state: "success" },
  { label: "高潜客户", value: "8", trend: "3 个需今日回访", state: "warning" },
  { label: "待跟进", value: "27", trend: "6 个超时", state: "danger" },
  { label: "活动转化", value: "42%", trend: "本周讲座", state: "success" },
];

export const growthFocusItems = [
  { leadId: 1, title: "王晴 17:30 回访家长", meta: "新加坡本科 / 高潜 / 缺预算上限", priority: "高" },
  { leadId: 2, title: "刘欢发送德国双元制材料", meta: "咨询中 / 关注带薪实习", priority: "中" },
  { leadId: 3, title: "陈浩设置长期培育提醒", meta: "预算不足 / 3 个月后再触达", priority: "低" },
];
```

- [ ] **Step 2: 创建 `GrowthOverviewPage.tsx`**

组件 props 使用当前 `PageProps`，点击客户进入客户 360。

核心结构：

```tsx
import { ArrowRight, RefreshCw } from "lucide-react";
import type { PageProps } from "../App";
import { crmPrototypeRows, growthFocusItems, growthMetrics } from "../data/prototype";

export default function GrowthOverviewPage({ onNavigate, onSeedDemo, seedStatus }: PageProps) {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">增长总览</p>
          <h2>今天客户增长该推进什么</h2>
          <p>聚焦高潜客户、待跟进任务、最近客户和报告风险，不再陈列全部二期功能。</p>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={onSeedDemo}>
            <RefreshCw size={16} aria-hidden="true" />
            初始化演示数据
          </button>
          <button className="icon-button" onClick={() => onNavigate("customerGrowth")}>
            进入客户增长 <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="metric-grid">
        {growthMetrics.map((metric) => (
          <article className={`metric-card ${metric.state}`} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <em>{metric.trend}</em>
          </article>
        ))}
      </section>

      <section className="split-layout">
        <div className="panel-block">
          <div className="section-title">
            <h3>今日重点</h3>
            <span className="status-pill">{seedStatus}</span>
          </div>
          <div className="task-list">
            {growthFocusItems.map((item) => (
              <button className="task-row clickable" key={item.title} onClick={() => onNavigate("customer360", item.leadId)}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.meta}</span>
                </div>
                <em>{item.priority}</em>
              </button>
            ))}
          </div>
        </div>

        <div className="panel-block">
          <div className="section-title">
            <h3>最近客户</h3>
            <button className="tiny-button" onClick={() => onNavigate("customerGrowth")}>查看全部</button>
          </div>
          <div className="task-list">
            {crmPrototypeRows.map((lead) => (
              <button className="task-row clickable" key={lead.id} onClick={() => onNavigate("customer360", lead.id)}>
                <div>
                  <strong>{lead.customer_name}</strong>
                  <span>{lead.statusLabel} / {lead.project}</span>
                </div>
                <em>客户 360</em>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: 更新 `App.tsx` 使用新首页**

将 `growthOverview` 映射到 `GrowthOverviewPage`。

- [ ] **Step 4: 增加可点击任务行样式**

在 `frontend/src/styles.css` 中增加：

```css
.task-row.clickable {
  width: 100%;
  text-align: left;
  color: inherit;
}

.task-row.clickable:hover {
  border-color: #b9d3ea;
  background: #f5faff;
}
```

- [ ] **Step 5: 运行构建验证**

```bash
cd frontend
npm.cmd run build
```

- [ ] **Step 6: 提交**

```bash
git status --short
git add frontend/src/App.tsx frontend/src/pages/GrowthOverviewPage.tsx frontend/src/data/prototype.ts frontend/src/styles.css
git commit -m "实现增长总览首页"
```

---

### Task 3: 拆出客户增长列表和客户 360

**目标：** 将旧 `LeadsPage` 的列表和详情逻辑拆成客户增长队列与客户 360 工作台。

**Files:**

- Create: `frontend/src/pages/CustomerGrowthPage.tsx`
- Create: `frontend/src/pages/Customer360Page.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/data/prototype.ts`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: 调整 `PageProps` 支持客户 360**

在 `App.tsx` 中将 `PageProps` 扩展为：

```ts
export type PageProps = {
  role: RoleKey;
  selectedLeadId: number | null;
  onNavigate: (page: PageKey, leadId?: number) => void;
  onSeedDemo: () => Promise<void>;
  seedStatus: string;
};
```

所有页面调用 `onNavigate("xxx")` 仍然可用。

- [ ] **Step 2: 创建 `CustomerGrowthPage.tsx`**

保留 `GET /api/leads`，失败时使用 `crmPrototypeRows`。列表点击进入 `customer360`。

核心 API：

```ts
apiRequest<Lead[]>("/api/leads")
```

核心交互：

```tsx
<tr key={lead.id} onClick={() => onNavigate("customer360", lead.id)}>
  <td>
    <strong>{lead.customer_name}</strong>
    <span>{lead.contact}</span>
  </td>
  <td><span className="badge">{lead.statusLabel}</span></td>
  <td>{lead.project}</td>
  <td>{lead.owner}</td>
  <td>{lead.nextTask}</td>
</tr>
```

页面必须包含阶段漏斗：

```tsx
const pipelineStages = [
  { label: "新线索", count: 12 },
  { label: "已画像", count: 9 },
  { label: "咨询中", count: 15 },
  { label: "活动邀约", count: 7 },
  { label: "成交/流失", count: 6 },
];
```

- [ ] **Step 3: 创建 `Customer360Page.tsx`**

复用 `LeadsPage` 中已有 API：

```ts
apiRequest<LeadDetail>(`/api/leads/${leadId}`)
apiRequest<TimelineItem[]>(`/api/leads/${leadId}/timeline`)
apiRequest(`/api/leads/${leadId}/status`, { method: "PATCH", body: JSON.stringify(...) })
apiRequest(`/api/leads/${leadId}/follow-ups`, { method: "POST", body: JSON.stringify(...) })
apiRequest("/api/crm/tasks", { method: "POST", body: JSON.stringify(...) })
apiRequest(`/api/crm/tasks/${taskId}/complete`, { method: "PATCH", body: JSON.stringify(...) })
```

客户 360 内部 tabs 初始可用本地状态：

```ts
type Customer360Tab = "overview" | "profile" | "recommendations" | "consulting" | "tasks" | "events" | "reports";

const tabs: Array<{ key: Customer360Tab; label: string }> = [
  { key: "overview", label: "客户概览" },
  { key: "profile", label: "画像研判" },
  { key: "recommendations", label: "推荐项目" },
  { key: "consulting", label: "咨询记录" },
  { key: "tasks", label: "跟进任务" },
  { key: "events", label: "活动报名" },
  { key: "reports", label: "报告快照" },
];
```

右侧建议面板必须只在该页面内渲染：

```tsx
<aside className={isAdviceOpen ? "customer-advice-panel" : "customer-advice-panel collapsed"}>
  <button className="tiny-button" onClick={() => setIsAdviceOpen((value) => !value)}>
    {isAdviceOpen ? "收起" : "展开"}
  </button>
  {isAdviceOpen && (
    <>
      <h3>AI 建议 / 下一步动作</h3>
      <div className="compact-card">
        <strong>补充预算上限</strong>
        <span>影响项目报价和路径推荐。</span>
      </div>
    </>
  )}
</aside>
```

- [ ] **Step 4: 更新 `App.tsx` 页面映射**

将：

| PageKey | Component |
| --- | --- |
| `customerGrowth` | `CustomerGrowthPage` |
| `customer360` | `Customer360Page` |

如果 `active === "customer360"` 且当前角色不可见 `customerGrowth`，仍应允许从合法入口进入；但学生角色不应能直接进入。

- [ ] **Step 5: 增加客户 360 样式**

在 `styles.css` 中增加：

```css
.customer-360-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 14px;
  align-items: start;
}

.customer-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.customer-tab {
  border: 1px solid var(--line);
  background: white;
  color: var(--ink);
  border-radius: 6px;
  padding: 8px 10px;
}

.customer-tab.active {
  border-color: #b9d3ea;
  background: #edf6ff;
  color: var(--blue);
}

.customer-advice-panel {
  border: 1px solid var(--line);
  background: #f8fbff;
  border-radius: 8px;
  padding: 14px;
}

.customer-advice-panel.collapsed {
  min-height: auto;
}
```

- [ ] **Step 6: 运行构建验证**

```bash
cd frontend
npm.cmd run build
```

- [ ] **Step 7: 提交**

```bash
git status --short
git add frontend/src/App.tsx frontend/src/pages/CustomerGrowthPage.tsx frontend/src/pages/Customer360Page.tsx frontend/src/data/prototype.ts frontend/src/styles.css
git commit -m "建立客户增长和客户360工作台"
```

---

### Task 4: 收纳运营资源

**目标：** 将项目/课程、活动运营、知识库从一级导航移入运营资源入口。

**Files:**

- Create: `frontend/src/pages/OperationsResourcesPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/ProjectsPage.tsx`
- Modify: `frontend/src/pages/EventsPage.tsx`
- Modify: `frontend/src/pages/KnowledgePage.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: 创建运营资源容器页**

`OperationsResourcesPage` 内部维护子视图：

```ts
type OperationsView = "overview" | "projects" | "events" | "knowledge";
const [view, setView] = useState<OperationsView>("overview");
```

概览卡片：

```tsx
const resourceCards = [
  { key: "projects", title: "项目/课程", desc: "项目资料、标签、推荐规则说明" },
  { key: "events", title: "活动运营", desc: "活动创建、报名名单和签到" },
  { key: "knowledge", title: "知识库", desc: "Dify 来源、问答日志和 fallback" },
] as const;
```

- [ ] **Step 2: 在容器页中复用旧页面**

渲染逻辑：

```tsx
if (view === "projects") return <ProjectsPage {...props} />;
if (view === "events") return <EventsPage {...props} />;
if (view === "knowledge") return <KnowledgePage {...props} />;
```

概览页只提供入口，不复制项目、活动、知识库的完整表格。

- [ ] **Step 3: 调整子页面返回入口**

在 `ProjectsPage`、`EventsPage`、`KnowledgePage` 顶部文案中弱化“一级模块”表达，按钮跳转按新版入口：

- 项目相关客户：`onNavigate("customerGrowth")`
- 活动报名相关客户：`onNavigate("customerGrowth")`
- 知识问答关联客户：`onNavigate("customerGrowth")`

- [ ] **Step 4: 更新 `App.tsx` 映射**

`operations` 使用 `OperationsResourcesPage`。

- [ ] **Step 5: 运行构建验证**

```bash
cd frontend
npm.cmd run build
```

- [ ] **Step 6: 提交**

```bash
git status --short
git add frontend/src/App.tsx frontend/src/pages/OperationsResourcesPage.tsx frontend/src/pages/ProjectsPage.tsx frontend/src/pages/EventsPage.tsx frontend/src/pages/KnowledgePage.tsx frontend/src/styles.css
git commit -m "收纳项目活动和知识库入口"
```

---

### Task 5: 收纳二期助手

**目标：** 将企业助手、学生助手作为二期扩展入口展示，并保留真实 API 页面能力。

**Files:**

- Create: `frontend/src/pages/Phase2AssistantsPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/EnterpriseAssistantPage.tsx`
- Modify: `frontend/src/pages/StudentAssistantPage.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: 创建二期助手容器页**

内部子视图：

```ts
type AssistantView = "overview" | "enterprise" | "student";
const [view, setView] = useState<AssistantView>("overview");
```

概览只展示两个入口：

```tsx
<section className="resource-entry-grid">
  <button className="resource-entry-card" onClick={() => setView("enterprise")}>
    <strong>企业助手</strong>
    <span>客户自然语言录入、日报、组织架构、新人指南、受控 NL2SQL</span>
  </button>
  <button className="resource-entry-card" onClick={() => setView("student")}>
    <strong>学生助手</strong>
    <span>请假、反馈、心理辅助预警、学业进度和生活支持</span>
  </button>
</section>
```

- [ ] **Step 2: 复用企业助手和学生助手页面**

```tsx
if (view === "enterprise") return <EnterpriseAssistantPage {...props} />;
if (view === "student") return <StudentAssistantPage {...props} />;
```

- [ ] **Step 3: 调整企业助手跳转**

在 `EnterpriseAssistantPage.tsx` 中，将创建或更新客户后的跳转改为客户增长：

```ts
if (data.intent === "create_lead" || data.intent === "update_lead_status") {
  onNavigate("customerGrowth");
}
```

顶部按钮：

```tsx
<button className="icon-button secondary" onClick={() => onNavigate("customerGrowth")}>查看客户增长</button>
<button className="icon-button" onClick={() => onNavigate("reports")}>日报汇总报告</button>
```

- [ ] **Step 4: 调整学生助手跳转**

在 `StudentAssistantPage.tsx` 中保持：

```tsx
<button className="icon-button secondary" onClick={() => onNavigate("operations")}>生活支持问答</button>
<button className="icon-button" onClick={() => onNavigate("reports")}>生成学生周报</button>
```

心理预警文案保留“辅助识别，不替代专业心理诊断”。

- [ ] **Step 5: 更新 `App.tsx` 映射**

`assistants` 使用 `Phase2AssistantsPage`。

- [ ] **Step 6: 运行构建验证**

```bash
cd frontend
npm.cmd run build
```

- [ ] **Step 7: 提交**

```bash
git status --short
git add frontend/src/App.tsx frontend/src/pages/Phase2AssistantsPage.tsx frontend/src/pages/EnterpriseAssistantPage.tsx frontend/src/pages/StudentAssistantPage.tsx frontend/src/styles.css
git commit -m "收纳企业助手和学生助手入口"
```

---

### Task 6: 建立系统与演示入口

**目标：** 将系统管理、OpenAPI、seed、fallback 状态、phase2 overview 集中到系统与演示区域。

**Files:**

- Create: `frontend/src/pages/SystemDemoPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/SystemAdminPage.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: 创建 `SystemDemoPage.tsx`**

该页面接收 `onSeedDemo` 和 `seedStatus`，并调用：

```ts
apiRequest<Phase2Overview>("/api/phase2/overview")
```

页面结构：

```tsx
<section className="resource-entry-grid">
  <article className="resource-entry-card">
    <strong>演示控制</strong>
    <button className="icon-button" onClick={onSeedDemo}>初始化演示数据</button>
    <a className="icon-button secondary" href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer">OpenAPI</a>
  </article>
  <article className="resource-entry-card">
    <strong>接口状态</strong>
    <span>{seedStatus}</span>
  </article>
</section>
```

- [ ] **Step 2: 在系统与演示中复用系统管理页**

可以先在 `SystemDemoPage` 下方直接渲染：

```tsx
<SystemAdminPage {...props} />
```

如果页面过长，改成内部 tab：

```ts
type SystemDemoView = "overview" | "admin";
```

- [ ] **Step 3: 调整 `SystemAdminPage` 文案**

明确它是治理区，不是客户增长主链路：

```tsx
<p>这里展示角色权限、审计日志和通知中心，用于证明企业级治理边界。</p>
```

- [ ] **Step 4: 更新 `App.tsx` 映射**

`systemDemo` 使用 `SystemDemoPage`。

- [ ] **Step 5: 运行构建验证**

```bash
cd frontend
npm.cmd run build
```

- [ ] **Step 6: 提交**

```bash
git status --short
git add frontend/src/App.tsx frontend/src/pages/SystemDemoPage.tsx frontend/src/pages/SystemAdminPage.tsx frontend/src/styles.css
git commit -m "建立系统与演示控制台"
```

---

### Task 7: 清理旧入口和视觉密度

**目标：** 去掉不再使用的旧页面入口和全局拥挤结构，确保用户只能从新版 IA 进入业务。

**Files:**

- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`
- Optional delete if unused: `frontend/src/pages/DashboardPage.tsx`
- Optional delete if unused: `frontend/src/pages/LeadsPage.tsx`
- Optional delete if unused: `frontend/src/pages/AssessmentPage.tsx`
- Optional delete if unused: `frontend/src/pages/ChatPage.tsx`

- [ ] **Step 1: 检查旧页面是否仍被引用**

Run:

```bash
rg -n "DashboardPage|LeadsPage|AssessmentPage|ChatPage|enterprise\"|student\"|knowledge\"|admin\"" frontend/src
```

Expected:

- `DashboardPage`、`LeadsPage` 不应再被 `App.tsx` 引用。
- `enterprise`、`student`、`knowledge`、`admin` 不应作为 `PageKey` 出现。

- [ ] **Step 2: 删除确认无引用的旧页面**

只有在 `rg` 确认没有引用时删除。不要删除仍被容器页复用的页面。

可删除候选：

```text
frontend/src/pages/DashboardPage.tsx
frontend/src/pages/LeadsPage.tsx
frontend/src/pages/AssessmentPage.tsx
frontend/src/pages/ChatPage.tsx
```

- [ ] **Step 3: 清理样式中的旧三栏常驻布局**

保留兼容类名，但不要让默认工作区回到三栏。

确认：

```css
.workspace-grid {
  grid-template-columns: 240px minmax(0, 1fr);
}
```

如果 `.context-panel` 只被旧页面使用且无引用，可以删除相关样式；如果不确定，保留但不在 `App.tsx` 渲染。

- [ ] **Step 4: 运行构建验证**

```bash
cd frontend
npm.cmd run build
```

- [ ] **Step 5: 提交**

```bash
git status --short
git add frontend/src
git commit -m "清理旧工作台入口"
```

---

### Task 8: 最终验证

**目标：** 确认文档、前端构建、后端测试和关键链路没有被破坏。

**Files:**

- No required file changes.

- [ ] **Step 1: 前端构建**

```bash
cd frontend
npm.cmd run build
```

Expected:

```text
✓ built
```

- [ ] **Step 2: 后端测试**

```bash
cd backend
python -m pytest -v
```

Expected:

```text
passed
```

- [ ] **Step 3: 检查旧入口残留**

```bash
rg -n "总览、CRM、项目/课程、活动运营、企业助手、学生助手、知识库、报告中心、系统管理|四条演示主线|context-panel" frontend/src docs AGENTS.md
```

Expected:

- 不应在前端用户界面文案中出现旧“九个同级入口”描述。
- `context-panel` 如果仍存在，只能是未渲染的兼容样式，不应在 `App.tsx` 中渲染。

- [ ] **Step 4: 检查 Git 状态**

```bash
git status --short
```

Expected:

- 没有未提交的阶段性改动。
- 如果有验证生成物，不要提交 `dist/`、`.superpowers/`、`node_modules/`。

---

## 3. 验收标准

1. 首页是增长总览，不再是全功能陈列。
2. 一级导航只有：增长总览、客户增长、运营资源、报告中心、二期助手、系统与演示。
3. CRM / 客户增长成为主入口。
4. 点击客户能进入客户 360。
5. 客户 360 内部有客户概览、画像研判、推荐项目、咨询记录、跟进任务、活动报名、报告快照。
6. 右侧 AI 建议只在客户 360 内按需出现，并可收起。
7. 企业助手、学生助手统一在二期助手内。
8. 项目、活动、知识库统一在运营资源内。
9. OpenAPI、seed、fallback、权限审计统一在系统与演示内。
10. 不同角色看到不同入口；学生角色不能看到 CRM 和系统管理入口。
11. `npm.cmd run build` 通过。
12. 后端测试在最终验证阶段通过，确认未破坏已有 API。

## 4. 风险和处理

| 风险 | 处理 |
| --- | --- |
| `App.tsx` 一次性改动过大 | 先抽 `navigation.ts`，再逐步替换页面 |
| 旧页面内还引用旧 PageKey | 每阶段运行 TypeScript build，用类型错误暴露问题 |
| 客户 360 过早做成大而全页面 | 第一版只做 tabs 和已存在 API，复杂内容后续补充 |
| 二期助手又变成大首页 | `Phase2AssistantsPage` 只放企业助手和学生助手入口，详情进入子视图 |
| 系统与演示污染主界面 | seed、OpenAPI、fallback 只在 `SystemDemoPage` 常驻 |
| 角色权限被误认为生产鉴权 | 页面文案明确当前是角色视图演示，生产级接口鉴权属于 V2 增强 |

## 5. 执行选择

计划执行时推荐使用 **Subagent-Driven**：每个 Task 独立执行、构建验证、提交，再进入下一个 Task。

如果在当前会话内执行，使用 **Inline Execution**：按 Task 顺序推进，每个 Task 完成后汇报验证结果和 commit。
