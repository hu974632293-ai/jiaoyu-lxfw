import { useMemo, useState } from "react";
import { FileText, RefreshCw, ShieldCheck } from "lucide-react";
import { apiRequest } from "./api/client";
import DashboardPage from "./pages/DashboardPage";
import EnterpriseAssistantPage from "./pages/EnterpriseAssistantPage";
import LeadsPage from "./pages/LeadsPage";
import ProjectsPage from "./pages/ProjectsPage";
import ReportsPage from "./pages/ReportsPage";
import SystemAdminPage from "./pages/SystemAdminPage";
import { roleOptions } from "./data/prototype";
import type { RoleKey } from "./data/prototype";
import {
  backofficeNavItems,
  publicNavItems,
  roleDefaultPage,
  roleVisiblePages,
} from "./navigation";
import type { AppMode, BackofficePageKey, PublicPageKey } from "./navigation";

export type PageKey =
  | "dashboard"
  | "crm"
  | "projects"
  | "events"
  | "enterprise"
  | "student"
  | "knowledge"
  | "reports"
  | "admin";

export type PageProps = {
  role: RoleKey;
  onNavigate: (page: PageKey) => void;
  onSeedDemo: () => Promise<void>;
  seedStatus: string;
};

type BackofficeComponent = (props: PageProps) => JSX.Element;

const backofficeComponents: Record<BackofficePageKey, BackofficeComponent> = {
  growthOverview: DashboardPage,
  customerGrowth: LeadsPage,
  customer360: LeadsPage,
  operations: ProjectsPage,
  reports: ReportsPage,
  assistants: EnterpriseAssistantPage,
  systemDemo: SystemAdminPage,
};

const legacyPageMap: Record<PageKey, BackofficePageKey> = {
  dashboard: "growthOverview",
  crm: "customerGrowth",
  projects: "operations",
  events: "operations",
  enterprise: "assistants",
  student: "assistants",
  knowledge: "operations",
  reports: "reports",
  admin: "systemDemo",
};

export default function App() {
  const [mode, setMode] = useState<AppMode>("public");
  const [publicPage, setPublicPage] = useState<PublicPageKey>("home");
  const [backofficePage, setBackofficePage] = useState<BackofficePageKey>("growthOverview");
  const [role, setRole] = useState<RoleKey>("admin");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(1);
  const [seedStatus, setSeedStatus] = useState("演示数据未初始化");

  const currentRole = roleOptions.find((item) => item.key === role) ?? roleOptions[0];
  const visiblePages = useMemo(() => roleVisiblePages[role], [role]);
  const current = backofficeNavItems.find((page) => page.key === backofficePage) ?? backofficeNavItems[0];
  const CurrentPage = backofficeComponents[backofficePage];

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

  function navigateLegacy(page: PageKey) {
    navigateBackoffice(legacyPageMap[page]);
  }

  async function seedDemo() {
    setSeedStatus("正在初始化演示数据...");
    try {
      await apiRequest("/api/demo/seed", { method: "POST" });
      setSeedStatus("演示数据初始化成功");
    } catch (error) {
      setSeedStatus(error instanceof Error ? error.message : "演示数据初始化失败");
    }
  }

  if (mode === "public") {
    return (
      <main className="public-shell">
        <header className="public-topbar">
          <button className="public-brand" onClick={() => setPublicPage("home")}>
            教育服务官网
          </button>
          <nav className="public-nav" aria-label="公开官网导航">
            {publicNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className={publicPage === item.key ? "active" : ""}
                  key={item.key}
                  onClick={() => setPublicPage(item.key)}
                >
                  <Icon size={16} aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <button className="icon-button" onClick={openLogin}>
            登录后台
          </button>
        </header>

        <section className="public-content">
          <div className="public-placeholder">
            <p className="eyebrow">公开官网门户占位</p>
            <h1>面向学生、家长和合作方的教育服务入口</h1>
            <p>
              Task 1 先建立应用层级。完整官网内容会在 Task 2 实现；当前未登录用户不会直接进入 CRM、客户 360、系统治理或演示控制台。
            </p>
            <div className="public-actions">
              <button className="icon-button secondary" onClick={() => setPublicPage("publicProjects")}>
                查看项目
              </button>
              <button className="icon-button secondary" onClick={() => setPublicPage("contact")}>
                咨询服务
              </button>
              <button className="icon-button" onClick={openLogin}>
                登录后台
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (mode === "login") {
    return (
      <main className="login-shell">
        <section>
          <p className="eyebrow">登录入口占位</p>
          <h1>演示角色进入后台生产力工具</h1>
          <p>Task 1 先建立登录层。真实账号、Token、会话管理和后端权限校验属于后续 V2/V3 增强。</p>
          <button className="ghost-button" onClick={logoutToPortal}>
            返回官网
          </button>
        </section>
        <section className="login-panel">
          <h2>选择演示角色</h2>
          <div className="role-login-grid">
            {roleOptions.map((option) => (
              <button className="nav-item" key={option.key} onClick={() => enterBackoffice(option.key)}>
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.focus}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="workspace-shell">
      <header className="topbar">
        <div className="brand">
          <ShieldCheck size={26} aria-hidden="true" />
          <div>
            <h1>教育服务运营工作台</h1>
            <p>登录后后台：客户增长流水线与角色生产力工具</p>
          </div>
        </div>
        <div className="top-actions">
          <label className="role-switcher">
            <span>当前角色</span>
            <select value={role} onChange={(event) => enterBackoffice(event.target.value as RoleKey)}>
              {roleOptions.map((option) => (
                <option value={option.key} key={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className="ghost-button" onClick={logoutToPortal}>
            退出到官网
          </button>
          <a className="icon-button secondary" href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer" title="打开 OpenAPI">
            <FileText size={16} aria-hidden="true" />
            OpenAPI
          </a>
          <button className="icon-button" onClick={seedDemo} title="调用 POST /api/demo/seed 初始化演示数据">
            <RefreshCw size={16} aria-hidden="true" />
            初始化演示数据
          </button>
        </div>
      </header>

      <section className="status-strip" aria-label="系统状态">
        <span className="status-pill success">Dify 状态：fallback 可用</span>
        <span className="status-pill">角色重点：{currentRole.focus}</span>
        <span className="status-pill">当前客户 ID：{selectedLeadId ?? "未选择"}</span>
        <span className={seedStatus.includes("成功") ? "status-pill success" : seedStatus.includes("失败") || seedStatus.includes("请求") ? "status-pill danger" : "status-pill"}>
          {seedStatus}
        </span>
      </section>

      <div className="workspace-grid">
        <aside className="sidebar" aria-label="后台一级导航">
          {backofficeNavItems.map((item) => {
            const Icon = item.icon;
            const disabled = !visiblePages.includes(item.key);
            return (
              <button
                className={backofficePage === item.key ? "nav-item active" : "nav-item"}
                disabled={disabled}
                key={item.key}
                onClick={() => navigateBackoffice(item.key)}
                title={disabled ? `${currentRole.label}角色暂不展示该入口` : item.desc}
              >
                <Icon size={18} aria-hidden="true" />
                <span>
                  <strong>{item.label}</strong>
                  <small>{disabled ? "当前角色隐藏" : item.desc}</small>
                </span>
              </button>
            );
          })}
        </aside>

        <section className="content-frame">
          <CurrentPage role={role} onNavigate={navigateLegacy} onSeedDemo={seedDemo} seedStatus={seedStatus} />
        </section>

        <aside className="context-panel" aria-label="后台上下文">
          <div className="context-block">
            <h2>当前上下文</h2>
            <p className="muted">角色：{currentRole.label}</p>
            <p className="muted">模块：{current.label}</p>
            <p className="muted">客户 ID：{selectedLeadId ?? "未选择"}</p>
            <div className="compact-card">
              <strong>Task 1 说明</strong>
              <span>旧后台页面暂时复用；客户 360 和后台壳层会在后续 Task 拆分。</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
