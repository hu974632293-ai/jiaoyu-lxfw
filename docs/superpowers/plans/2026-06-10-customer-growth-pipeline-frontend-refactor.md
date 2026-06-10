# 企业官网门户与角色工作台前端重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前打开即后台的前端重构为“公开企业官网门户 -> 登录入口 -> 按角色进入后台生产力工具”的真实企业级产品结构。

**Architecture:** 继续使用当前 React/Vite/TypeScript 单页状态切换方式，不引入路由库。新增公开官网层和登录层；登录后后台再采用“客户增长流水线 + 客户 360 工作台”结构，并按角色隐藏或展示入口。

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
7. 未登录首屏必须是公开官网门户，不允许直接进入后台工作台。
8. 官网不得展示 CRM 客户列表、客户 360、员工日报、学生心理预警明细、审计日志、权限矩阵、OpenAPI、seed、接口健康等内部信息。
9. 登录后后台才展示增长总览、客户增长、客户 360、二期助手和系统治理。
10. 当前阶段登录可用演示角色跳转，但文案必须明确真实认证、Token 和后端权限校验属于 V2 增强。

### 当前关键参考

- 项目规则：`AGENTS.md`
- 顶层 IA spec：`docs/superpowers/specs/2026-06-10-enterprise-portal-role-workbench-ia.md`
- 后台 IA spec：`docs/superpowers/specs/2026-06-10-customer-growth-pipeline-frontend-ia.md`
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
| `frontend/src/App.tsx` | 应用层级状态：公开官网、登录页、后台工作台；当前角色；页面切换 |
| `frontend/src/navigation.ts` | 公开官网导航、后台导航、角色可见入口、角色默认入口 |
| `frontend/src/pages/PublicPortalPage.tsx` | 公开官网门户容器 |
| `frontend/src/pages/LoginPage.tsx` | 登录页和演示角色跳转 |
| `frontend/src/pages/BackofficeShellPage.tsx` | 登录后后台壳层，承载后台导航和页面切换 |
| `frontend/src/pages/GrowthOverviewPage.tsx` | 登录后的增长总览首页 |
| `frontend/src/pages/CustomerGrowthPage.tsx` | 客户增长流水线和客户列表 |
| `frontend/src/pages/Customer360Page.tsx` | 单个客户 360 工作台 |
| `frontend/src/pages/OperationsResourcesPage.tsx` | 运营资源入口，收纳项目/课程、活动、知识库 |
| `frontend/src/pages/Phase2AssistantsPage.tsx` | 二期助手入口，收纳企业助手、学生助手 |
| `frontend/src/pages/SystemDemoPage.tsx` | 系统与演示入口，收纳系统管理、OpenAPI、seed、fallback、phase2 overview |
| `frontend/src/data/prototype.ts` | 补充官网、登录、客户 360、增长总览、权限矩阵所需静态展示数据 |
| `frontend/src/styles.css` | 增加官网门户、登录页、后台壳层、客户 360、分组入口样式 |

保留但逐步降级为子页面或复用页：

| 文件 | 后续用途 |
| --- | --- |
| `frontend/src/pages/EnterpriseAssistantPage.tsx` | 作为 `Phase2AssistantsPage` 内的企业助手详情视图 |
| `frontend/src/pages/StudentAssistantPage.tsx` | 作为 `Phase2AssistantsPage` 内的学生助手详情视图 |
| `frontend/src/pages/ProjectsPage.tsx` | 作为 `OperationsResourcesPage` 内的项目/课程详情视图 |
| `frontend/src/pages/EventsPage.tsx` | 作为 `OperationsResourcesPage` 内的活动详情视图 |
| `frontend/src/pages/KnowledgePage.tsx` | 作为 `OperationsResourcesPage` 或官网 FAQ 的能力参考 |
| `frontend/src/pages/ReportsPage.tsx` | 作为登录后报告中心 |
| `frontend/src/pages/SystemAdminPage.tsx` | 作为 `SystemDemoPage` 内的系统管理详情视图 |
| `frontend/src/pages/DashboardPage.tsx` | 被 `GrowthOverviewPage.tsx` 替代后可删除或停止引用 |
| `frontend/src/pages/LeadsPage.tsx` | 被 `CustomerGrowthPage.tsx` 与 `Customer360Page.tsx` 拆分后可删除或停止引用 |

---

## 2. 阶段任务

### Task 1: 建立应用层级和导航配置

**目标：** 先让应用具备“公开官网 / 登录页 / 后台工作台”三层状态，但暂时复用旧后台页面，保证构建通过。

**Files:**

- Create: `frontend/src/navigation.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: 创建导航配置文件**

创建 `frontend/src/navigation.ts`，定义公开官网入口、后台入口、角色可见入口和角色默认入口。

建议内容：

```ts
import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Gauge,
  GraduationCap,
  HelpCircle,
  Home,
  LogIn,
  Mail,
  Settings,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RoleKey } from "./data/prototype";

export type AppMode = "public" | "login" | "backoffice";

export type PublicPageKey =
  | "home"
  | "about"
  | "services"
  | "publicProjects"
  | "publicEvents"
  | "faq"
  | "contact";

export type BackofficePageKey =
  | "growthOverview"
  | "customerGrowth"
  | "customer360"
  | "operations"
  | "reports"
  | "assistants"
  | "systemDemo";

export type PublicNavItem = {
  key: PublicPageKey;
  label: string;
  icon: LucideIcon;
};

export type BackofficeNavItem = {
  key: BackofficePageKey;
  label: string;
  desc: string;
  group: "main" | "extension" | "governance";
  icon: LucideIcon;
};

export const publicNavItems: PublicNavItem[] = [
  { key: "home", label: "首页", icon: Home },
  { key: "about", label: "企业介绍", icon: Building2 },
  { key: "services", label: "业务服务", icon: GraduationCap },
  { key: "publicProjects", label: "项目/课程", icon: BriefcaseBusiness },
  { key: "publicEvents", label: "活动/讲座", icon: CalendarDays },
  { key: "faq", label: "知识/FAQ", icon: HelpCircle },
  { key: "contact", label: "联系我们", icon: Mail },
];

export const backofficeNavItems: BackofficeNavItem[] = [
  { key: "growthOverview", label: "增长总览", desc: "今日重点、最近客户和待办", group: "main", icon: Gauge },
  { key: "customerGrowth", label: "客户增长", desc: "CRM 流水线和客户队列", group: "main", icon: Users },
  { key: "operations", label: "运营资源", desc: "项目、活动和知识库", group: "main", icon: BriefcaseBusiness },
  { key: "reports", label: "报告中心", desc: "经营、日报、心理和投诉报告", group: "main", icon: BarChart3 },
  { key: "assistants", label: "二期助手", desc: "企业助手和学生助手", group: "extension", icon: Bot },
  { key: "systemDemo", label: "系统与演示", desc: "权限、审计、OpenAPI 和 seed", group: "governance", icon: Settings },
];

export const roleVisiblePages: Record<RoleKey, BackofficePageKey[]> = {
  admin: ["growthOverview", "customerGrowth", "operations", "reports", "assistants", "systemDemo"],
  manager: ["growthOverview", "customerGrowth", "reports", "assistants", "systemDemo"],
  consultant: ["growthOverview", "customerGrowth", "operations", "reports"],
  employee: ["assistants", "customerGrowth", "operations"],
  teacher: ["assistants", "reports", "operations"],
  student: ["assistants"],
};

export const roleDefaultPage: Record<RoleKey, BackofficePageKey> = {
  admin: "systemDemo",
  manager: "growthOverview",
  consultant: "customerGrowth",
  employee: "assistants",
  teacher: "assistants",
  student: "assistants",
};

export const loginNavItem = { label: "登录", icon: LogIn };
```

- [ ] **Step 2: 更新 `App.tsx` 顶层状态**

在 `App.tsx` 中新增模式状态：

```ts
const [mode, setMode] = useState<AppMode>("public");
const [publicPage, setPublicPage] = useState<PublicPageKey>("home");
const [backofficePage, setBackofficePage] = useState<BackofficePageKey>("growthOverview");
const [role, setRole] = useState<RoleKey>("admin");
const [selectedLeadId, setSelectedLeadId] = useState<number | null>(1);
```

新增跳转函数：

```ts
function openLogin() {
  setMode("login");
}

function enterBackoffice(nextRole: RoleKey) {
  setRole(nextRole);
  setBackofficePage(roleDefaultPage[nextRole]);
  setMode("backoffice");
}

function logoutToPortal() {
  setMode("public");
  setPublicPage("home");
}

function navigateBackoffice(page: BackofficePageKey, leadId?: number) {
  if (typeof leadId === "number") {
    setSelectedLeadId(leadId);
  }
  setBackofficePage(page);
}
```

- [ ] **Step 3: 临时渲染三层结构**

在真正创建 `PublicPortalPage`、`LoginPage`、`BackofficeShellPage` 前，可以先用占位结构：

```tsx
if (mode === "public") {
  return <div className="public-shell">公开官网门户占位 <button onClick={openLogin}>登录</button></div>;
}

if (mode === "login") {
  return <div className="login-shell">登录占位 <button onClick={() => enterBackoffice("admin")}>管理员进入</button></div>;
}
```

后台暂时渲染旧工作台内容，但只在 `mode === "backoffice"` 时出现。

- [ ] **Step 4: 移除未登录直接后台的默认路径**

确认 `App` 初始状态是：

```ts
const [mode, setMode] = useState<AppMode>("public");
```

不得以 `growthOverview` 或旧 `dashboard` 作为未登录首屏。

- [ ] **Step 5: 运行构建验证**

```bash
cd frontend
npm.cmd run build
```

- [ ] **Step 6: 提交**

```bash
git status --short
git add frontend/src/App.tsx frontend/src/navigation.ts frontend/src/styles.css
git commit -m "建立官网登录后台层级"
```

---

### Task 2: 实现公开官网门户

**目标：** 未登录用户进入企业官网，可了解企业背景、业务服务、项目活动、FAQ 和联系方式。

**Files:**

- Create: `frontend/src/pages/PublicPortalPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/data/prototype.ts`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: 补充官网展示数据**

在 `frontend/src/data/prototype.ts` 中新增：

```ts
export const publicServices = [
  { title: "留学规划", desc: "结合学生背景、预算和目标国家设计申请路径。" },
  { title: "国际本科", desc: "面向升学家庭，提供新加坡等方向的本科路径规划。" },
  { title: "德国双元制", desc: "就业导向，强调语言准备、企业实习和职业路径。" },
  { title: "语言培训", desc: "提供语言基础提升、考试准备和课程衔接。" },
  { title: "背景提升", desc: "围绕竞赛、科研、文书素材和能力证明做规划。" },
  { title: "学生服务", desc: "覆盖申请进度、学业节点、请假反馈和生活支持。" },
];

export const publicFaqs = [
  { question: "公司主要提供哪些服务？", answer: "提供留学规划、国际本科、德国双元制、语言培训、背景提升和学生服务支持。" },
  { question: "没有配置 Dify 时 FAQ 是否可用？", answer: "可用。系统会展示 fallback 答案和原因，不阻断公开咨询。" },
  { question: "如何预约项目咨询？", answer: "可通过官网联系表单、活动报名或电话微信咨询入口提交需求。" },
];
```

- [ ] **Step 2: 创建 `PublicPortalPage.tsx`**

Props 建议：

```ts
import type { PublicPageKey } from "../navigation";

type PublicPortalPageProps = {
  activePage: PublicPageKey;
  onNavigate: (page: PublicPageKey) => void;
  onLogin: () => void;
};
```

页面必须包含：

- 顶部公开导航。
- 首页首屏。
- 企业介绍。
- 业务服务。
- 项目/课程展示。
- 活动/讲座。
- 知识/FAQ。
- 联系我们。
- 登录按钮。

核心结构：

```tsx
export default function PublicPortalPage({ activePage, onNavigate, onLogin }: PublicPortalPageProps) {
  return (
    <main className="public-shell">
      <header className="public-topbar">
        <button className="public-brand" onClick={() => onNavigate("home")}>教育服务</button>
        <nav className="public-nav">{/* publicNavItems */}</nav>
        <button className="icon-button" onClick={onLogin}>登录后台</button>
      </header>
      <section className="public-content">
        {/* 根据 activePage 渲染公开页面 */}
      </section>
    </main>
  );
}
```

- [ ] **Step 3: 确保官网不展示内部数据**

`PublicPortalPage` 不得 import：

```ts
auditRows
notifications
adminUsers
permissions
```

不得渲染 OpenAPI、seed、phase2 overview、CRM 客户列表、客户 360。

- [ ] **Step 4: 更新 `App.tsx` 使用 `PublicPortalPage`**

```tsx
if (mode === "public") {
  return <PublicPortalPage activePage={publicPage} onNavigate={setPublicPage} onLogin={openLogin} />;
}
```

- [ ] **Step 5: 添加官网样式**

在 `styles.css` 中增加：

```css
.public-shell {
  min-height: 100vh;
  background: #f6f8fb;
}

.public-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 16px 28px;
  background: white;
  border-bottom: 1px solid var(--line);
}

.public-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.public-nav button,
.public-brand {
  border: 0;
  background: transparent;
  color: var(--ink);
  padding: 8px 10px;
  border-radius: 6px;
}

.public-nav button.active {
  background: #edf6ff;
  color: var(--blue);
}

.public-content {
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}

.public-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 24px;
  align-items: center;
  min-height: 420px;
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
git add frontend/src/App.tsx frontend/src/pages/PublicPortalPage.tsx frontend/src/data/prototype.ts frontend/src/styles.css
git commit -m "实现公开官网门户"
```

---

### Task 3: 实现登录页和角色跳转

**目标：** 登录页连接官网与后台，按角色进入不同默认工作台。

**Files:**

- Create: `frontend/src/pages/LoginPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: 创建 `LoginPage.tsx`**

Props：

```ts
import type { RoleKey } from "../data/prototype";

type LoginPageProps = {
  onLogin: (role: RoleKey) => void;
  onBackToPortal: () => void;
};
```

页面内容：

- 左侧说明：登录后进入企业级运营后台。
- 右侧演示角色选择。
- 明确说明：当前是演示登录，真实认证属于 V2。

角色按钮：

```tsx
const demoRoles: Array<{ role: RoleKey; title: string; desc: string }> = [
  { role: "admin", title: "管理员", desc: "系统管理、权限、审计和演示控制" },
  { role: "manager", title: "管理者", desc: "增长总览、报告中心和风险视图" },
  { role: "consultant", title: "顾问", desc: "客户增长、客户 360 和跟进任务" },
  { role: "employee", title: "员工", desc: "企业助手、日报和组织信息" },
  { role: "teacher", title: "老师", desc: "学生助手老师视图" },
  { role: "student", title: "学生", desc: "学生服务自助入口" },
];
```

- [ ] **Step 2: 更新 `App.tsx` 登录渲染**

```tsx
if (mode === "login") {
  return <LoginPage onLogin={enterBackoffice} onBackToPortal={logoutToPortal} />;
}
```

- [ ] **Step 3: 验证角色默认入口**

确认 `enterBackoffice("consultant")` 后后台默认页为 `customerGrowth`，`enterBackoffice("student")` 后默认页为 `assistants`。

- [ ] **Step 4: 添加登录页样式**

```css
.login-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 24px;
  align-items: center;
  padding: 40px;
  background: #f6f8fb;
}

.login-panel {
  border: 1px solid var(--line);
  background: white;
  border-radius: 8px;
  padding: 22px;
  box-shadow: var(--shadow);
}

.role-login-grid {
  display: grid;
  gap: 10px;
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
git add frontend/src/App.tsx frontend/src/pages/LoginPage.tsx frontend/src/styles.css
git commit -m "实现登录页和角色跳转"
```

---

### Task 4: 建立登录后后台壳层

**目标：** 后台导航只在登录后出现，并按角色显示入口。

**Files:**

- Create: `frontend/src/pages/BackofficeShellPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: 创建 `BackofficeShellPage.tsx`**

Props：

```ts
import type { RoleKey } from "../data/prototype";
import type { BackofficePageKey } from "../navigation";

type BackofficeShellPageProps = {
  role: RoleKey;
  activePage: BackofficePageKey;
  selectedLeadId: number | null;
  onNavigate: (page: BackofficePageKey, leadId?: number) => void;
  onRoleChange: (role: RoleKey) => void;
  onLogout: () => void;
  onSeedDemo: () => Promise<void>;
  seedStatus: string;
};
```

后台壳层职责：

- 顶部显示当前角色和退出到官网。
- 左侧显示角色可见后台导航。
- 主内容区根据 `activePage` 渲染页面。
- 不渲染公开官网导航。

- [ ] **Step 2: 临时映射旧后台页面**

在新后台页面未完全创建前，使用临时映射：

| BackofficePageKey | 临时组件 |
| --- | --- |
| `growthOverview` | `DashboardPage` |
| `customerGrowth` | `LeadsPage` |
| `operations` | `ProjectsPage` |
| `reports` | `ReportsPage` |
| `assistants` | `EnterpriseAssistantPage` |
| `systemDemo` | `SystemAdminPage` |

`customer360` 暂时也可渲染 `LeadsPage` 或简单 empty state，Task 6 再实现。

- [ ] **Step 3: 更新 `App.tsx` 使用后台壳层**

```tsx
if (mode === "backoffice") {
  return (
    <BackofficeShellPage
      role={role}
      activePage={backofficePage}
      selectedLeadId={selectedLeadId}
      onNavigate={navigateBackoffice}
      onRoleChange={enterBackoffice}
      onLogout={logoutToPortal}
      onSeedDemo={seedDemo}
      seedStatus={seedStatus}
    />
  );
}
```

- [ ] **Step 4: 移除全局常驻右侧上下文面板**

确认后台壳层不渲染旧的全局 `<aside className="context-panel">`。

后台默认两栏：

```css
.workspace-grid {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
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
git add frontend/src/App.tsx frontend/src/pages/BackofficeShellPage.tsx frontend/src/styles.css
git commit -m "建立登录后后台壳层"
```

---

### Task 5: 实现登录后的增长总览

**目标：** 用 `GrowthOverviewPage` 替代旧 `DashboardPage` 的“四条主线陈列”，后台首页只展示增长状态和今日推进。

**Files:**

- Create: `frontend/src/pages/GrowthOverviewPage.tsx`
- Modify: `frontend/src/pages/BackofficeShellPage.tsx`
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

页面点击客户进入 `customer360`，点击“进入客户增长”进入 `customerGrowth`。

- [ ] **Step 3: 更新后台映射**

`BackofficeShellPage` 中将 `growthOverview` 映射到 `GrowthOverviewPage`。

- [ ] **Step 4: 运行构建验证**

```bash
cd frontend
npm.cmd run build
```

- [ ] **Step 5: 提交**

```bash
git status --short
git add frontend/src/pages/BackofficeShellPage.tsx frontend/src/pages/GrowthOverviewPage.tsx frontend/src/data/prototype.ts frontend/src/styles.css
git commit -m "实现后台增长总览"
```

---

### Task 6: 建立客户增长列表和客户 360

**目标：** 将旧 `LeadsPage` 的列表和详情逻辑拆成客户增长队列与客户 360 工作台。

**Files:**

- Create: `frontend/src/pages/CustomerGrowthPage.tsx`
- Create: `frontend/src/pages/Customer360Page.tsx`
- Modify: `frontend/src/pages/BackofficeShellPage.tsx`
- Modify: `frontend/src/data/prototype.ts`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: 创建 `CustomerGrowthPage.tsx`**

保留 `GET /api/leads`，失败时使用 `crmPrototypeRows`。列表点击进入 `customer360`。

核心 API：

```ts
apiRequest<Lead[]>("/api/leads")
```

页面必须包含阶段漏斗：

```ts
const pipelineStages = [
  { label: "新线索", count: 12 },
  { label: "已画像", count: 9 },
  { label: "咨询中", count: 15 },
  { label: "活动邀约", count: 7 },
  { label: "成交/流失", count: 6 },
];
```

- [ ] **Step 2: 创建 `Customer360Page.tsx`**

复用旧 `LeadsPage` 中已有 API：

```ts
apiRequest<LeadDetail>(`/api/leads/${leadId}`)
apiRequest<TimelineItem[]>(`/api/leads/${leadId}/timeline`)
apiRequest(`/api/leads/${leadId}/status`, { method: "PATCH", body: JSON.stringify(...) })
apiRequest(`/api/leads/${leadId}/follow-ups`, { method: "POST", body: JSON.stringify(...) })
apiRequest("/api/crm/tasks", { method: "POST", body: JSON.stringify(...) })
apiRequest(`/api/crm/tasks/${taskId}/complete`, { method: "PATCH", body: JSON.stringify(...) })
```

客户 360 tabs：

```ts
type Customer360Tab = "overview" | "profile" | "recommendations" | "consulting" | "tasks" | "events" | "reports";
```

右侧建议面板必须只在该页面内渲染，并可收起。

- [ ] **Step 3: 更新后台映射**

`BackofficeShellPage` 中：

| BackofficePageKey | Component |
| --- | --- |
| `customerGrowth` | `CustomerGrowthPage` |
| `customer360` | `Customer360Page` |

- [ ] **Step 4: 添加客户 360 样式**

增加 `.customer-360-layout`、`.customer-tabs`、`.customer-advice-panel` 等样式。

- [ ] **Step 5: 运行构建验证**

```bash
cd frontend
npm.cmd run build
```

- [ ] **Step 6: 提交**

```bash
git status --short
git add frontend/src/pages/BackofficeShellPage.tsx frontend/src/pages/CustomerGrowthPage.tsx frontend/src/pages/Customer360Page.tsx frontend/src/data/prototype.ts frontend/src/styles.css
git commit -m "建立客户增长和客户360工作台"
```

---

### Task 7: 收纳运营资源

**目标：** 将项目/课程、活动运营、知识库从后台一级导航移入运营资源入口。

**Files:**

- Create: `frontend/src/pages/OperationsResourcesPage.tsx`
- Modify: `frontend/src/pages/BackofficeShellPage.tsx`
- Modify: `frontend/src/pages/ProjectsPage.tsx`
- Modify: `frontend/src/pages/EventsPage.tsx`
- Modify: `frontend/src/pages/KnowledgePage.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: 创建运营资源容器页**

内部子视图：

```ts
type OperationsView = "overview" | "projects" | "events" | "knowledge";
```

概览只提供项目/课程、活动运营、知识库入口，不复制完整表格。

- [ ] **Step 2: 在容器页复用旧页面**

```tsx
if (view === "projects") return <ProjectsPage {...props} />;
if (view === "events") return <EventsPage {...props} />;
if (view === "knowledge") return <KnowledgePage {...props} />;
```

- [ ] **Step 3: 更新后台映射**

`operations` 使用 `OperationsResourcesPage`。

- [ ] **Step 4: 运行构建验证**

```bash
cd frontend
npm.cmd run build
```

- [ ] **Step 5: 提交**

```bash
git status --short
git add frontend/src/pages/BackofficeShellPage.tsx frontend/src/pages/OperationsResourcesPage.tsx frontend/src/pages/ProjectsPage.tsx frontend/src/pages/EventsPage.tsx frontend/src/pages/KnowledgePage.tsx frontend/src/styles.css
git commit -m "收纳项目活动和知识库入口"
```

---

### Task 8: 收纳二期助手

**目标：** 将企业助手、学生助手作为二期扩展入口展示，并保留真实 API 页面能力。

**Files:**

- Create: `frontend/src/pages/Phase2AssistantsPage.tsx`
- Modify: `frontend/src/pages/BackofficeShellPage.tsx`
- Modify: `frontend/src/pages/EnterpriseAssistantPage.tsx`
- Modify: `frontend/src/pages/StudentAssistantPage.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: 创建二期助手容器页**

内部子视图：

```ts
type AssistantView = "overview" | "enterprise" | "student";
```

概览只展示企业助手和学生助手两个入口。

- [ ] **Step 2: 复用企业助手和学生助手页面**

```tsx
if (view === "enterprise") return <EnterpriseAssistantPage {...props} />;
if (view === "student") return <StudentAssistantPage {...props} />;
```

- [ ] **Step 3: 调整企业助手跳转**

创建或更新客户后跳转 `customerGrowth`，不跳回旧 `enterprise` 页面键。

- [ ] **Step 4: 调整学生助手跳转**

生活支持问答跳转 `operations`，学生周报跳转 `reports`。

- [ ] **Step 5: 更新后台映射**

`assistants` 使用 `Phase2AssistantsPage`。

- [ ] **Step 6: 运行构建验证**

```bash
cd frontend
npm.cmd run build
```

- [ ] **Step 7: 提交**

```bash
git status --short
git add frontend/src/pages/BackofficeShellPage.tsx frontend/src/pages/Phase2AssistantsPage.tsx frontend/src/pages/EnterpriseAssistantPage.tsx frontend/src/pages/StudentAssistantPage.tsx frontend/src/styles.css
git commit -m "收纳企业助手和学生助手入口"
```

---

### Task 9: 建立系统与演示入口

**目标：** 将系统管理、OpenAPI、seed、fallback 状态、phase2 overview 集中到登录后的系统与演示区域。

**Files:**

- Create: `frontend/src/pages/SystemDemoPage.tsx`
- Modify: `frontend/src/pages/BackofficeShellPage.tsx`
- Modify: `frontend/src/pages/SystemAdminPage.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: 创建 `SystemDemoPage.tsx`**

该页面接收 `onSeedDemo` 和 `seedStatus`，并调用：

```ts
apiRequest<Phase2Overview>("/api/phase2/overview")
```

页面集中展示：

- 初始化演示数据。
- OpenAPI。
- Dify/fallback 状态。
- phase2 overview。
- 系统管理入口。

- [ ] **Step 2: 复用系统管理页**

可以在 `SystemDemoPage` 下方直接渲染：

```tsx
<SystemAdminPage {...props} />
```

如果页面过长，改成内部 tab。

- [ ] **Step 3: 更新后台映射**

`systemDemo` 使用 `SystemDemoPage`。

- [ ] **Step 4: 运行构建验证**

```bash
cd frontend
npm.cmd run build
```

- [ ] **Step 5: 提交**

```bash
git status --short
git add frontend/src/pages/BackofficeShellPage.tsx frontend/src/pages/SystemDemoPage.tsx frontend/src/pages/SystemAdminPage.tsx frontend/src/styles.css
git commit -m "建立系统与演示控制台"
```

---

### Task 10: 清理旧入口和最终验证

**目标：** 去掉不再使用的旧页面入口和全局拥挤结构，确保未登录和登录后入口都符合新版 IA。

**Files:**

- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/BackofficeShellPage.tsx`
- Modify: `frontend/src/styles.css`
- Optional delete if unused: `frontend/src/pages/DashboardPage.tsx`
- Optional delete if unused: `frontend/src/pages/LeadsPage.tsx`
- Optional delete if unused: `frontend/src/pages/AssessmentPage.tsx`
- Optional delete if unused: `frontend/src/pages/ChatPage.tsx`

- [ ] **Step 1: 检查旧页面是否仍被引用**

```bash
rg -n "DashboardPage|LeadsPage|AssessmentPage|ChatPage|enterprise\"|student\"|knowledge\"|admin\"|dashboard\"|crm\"" frontend/src
```

Expected:

- `DashboardPage`、`LeadsPage` 不应再被后台壳层引用。
- `enterprise`、`student`、`knowledge`、`admin`、`dashboard`、`crm` 不应作为旧 `PageKey` 出现。

- [ ] **Step 2: 删除确认无引用的旧页面**

只有在 `rg` 确认没有引用时删除。不要删除仍被容器页复用的页面。

可删除候选：

```text
frontend/src/pages/DashboardPage.tsx
frontend/src/pages/LeadsPage.tsx
frontend/src/pages/AssessmentPage.tsx
frontend/src/pages/ChatPage.tsx
```

- [ ] **Step 3: 前端构建**

```bash
cd frontend
npm.cmd run build
```

- [ ] **Step 4: 后端测试**

```bash
cd backend
python -m pytest -v
```

- [ ] **Step 5: 检查内部信息没有出现在官网**

```bash
rg -n "OpenAPI|demo/seed|phase2/overview|审计日志|权限点|客户 360|CRM 客户" frontend/src/pages/PublicPortalPage.tsx
```

Expected:

- 无命中，或仅命中“登录后可使用”等非公开内部展示说明。

- [ ] **Step 6: 提交**

```bash
git status --short
git add frontend/src
git commit -m "完成门户与后台入口清理"
```

---

## 3. 验收标准

1. 未登录用户看到的是企业官网门户，不是后台工作台。
2. 官网能展示企业背景、业务服务、项目/课程、活动/讲座、知识 FAQ、联系我们和登录入口。
3. 登录页能按角色进入对应后台默认入口。
4. 管理员、管理者、顾问、员工、老师、学生看到的后台入口不同。
5. CRM / 客户增长是顾问和管理者的后台主入口。
6. 点击客户能进入客户 360。
7. 企业助手、学生助手统一在二期助手内。
8. 项目、活动、知识库统一在运营资源内。
9. OpenAPI、seed、fallback、权限审计统一在系统与演示内，且只在登录后可见。
10. 官网不展示内部运营数据。
11. `npm.cmd run build` 通过。
12. 最终阶段 `python -m pytest -v` 通过，确认未破坏已有后端 API。

## 4. 风险和处理

| 风险 | 处理 |
| --- | --- |
| 官网和后台状态混在 `App.tsx` 中变复杂 | 先抽 `navigation.ts`，再用 `PublicPortalPage`、`LoginPage`、`BackofficeShellPage` 分层 |
| 旧后台默认首屏残留 | `App` 初始 `mode` 必须是 `public` |
| 官网误展示内部信息 | `PublicPortalPage` 不 import 审计、权限、通知、CRM 客户列表等内部数据 |
| 登录被误认为生产鉴权 | 登录页文案明确当前是演示角色跳转，V2 再补真实认证 |
| 客户 360 过早做成大而全页面 | 第一版只做 tabs 和已存在 API，复杂内容后续补充 |
| 二期助手又变成大首页 | `Phase2AssistantsPage` 只放企业助手和学生助手入口，详情进入子视图 |

## 5. 执行选择

计划执行时推荐使用 **Subagent-Driven**：每个 Task 独立执行、构建验证、提交，再进入下一个 Task。

如果在当前会话内执行，使用 **Inline Execution**：按 Task 顺序推进，每个 Task 完成后汇报验证结果和 commit。
