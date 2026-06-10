import { ShieldCheck } from "lucide-react";
import Customer360Page from "./Customer360Page";
import CustomerGrowthPage from "./CustomerGrowthPage";
import GrowthOverviewPage from "./GrowthOverviewPage";
import OperationsResourcesPage from "./OperationsResourcesPage";
import Phase2AssistantsPage from "./Phase2AssistantsPage";
import ReportsPage from "./ReportsPage";
import SystemDemoPage from "./SystemDemoPage";
import { roleOptions } from "../data/prototype";
import type { RoleKey } from "../data/prototype";
import { backofficeNavItems, roleVisiblePages } from "../navigation";
import type { BackofficePageKey } from "../navigation";
import type { PageKey, PageProps } from "../App";

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

type BackofficeComponent = (props: PageProps) => JSX.Element;
type LegacyBackofficePageKey = Exclude<BackofficePageKey, "growthOverview" | "customerGrowth" | "customer360">;

const backofficeComponents: Record<LegacyBackofficePageKey, BackofficeComponent> = {
  operations: OperationsResourcesPage,
  reports: ReportsPage,
  assistants: Phase2AssistantsPage,
  systemDemo: SystemDemoPage,
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

export default function BackofficeShellPage({
  role,
  activePage,
  selectedLeadId,
  onNavigate,
  onRoleChange,
  onLogout,
  onSeedDemo,
  seedStatus,
}: BackofficeShellPageProps) {
  const currentRole = roleOptions.find((item) => item.key === role) ?? roleOptions[0];
  const visiblePages = roleVisiblePages[role];
  const current = backofficeNavItems.find((page) => page.key === activePage) ?? backofficeNavItems[0];

  function navigateLegacy(page: PageKey) {
    onNavigate(legacyPageMap[page]);
  }

  function renderCurrentPage() {
    if (activePage === "growthOverview") {
      return <GrowthOverviewPage onNavigate={onNavigate} />;
    }
    if (activePage === "customerGrowth") {
      return <CustomerGrowthPage onNavigate={onNavigate} />;
    }
    if (activePage === "customer360") {
      return <Customer360Page selectedLeadId={selectedLeadId} onNavigate={onNavigate} />;
    }

    const CurrentPage = backofficeComponents[activePage];
    return <CurrentPage role={role} onNavigate={navigateLegacy} onSeedDemo={onSeedDemo} seedStatus={seedStatus} />;
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
            <select value={role} onChange={(event) => onRoleChange(event.target.value as RoleKey)}>
              {roleOptions.map((option) => (
                <option value={option.key} key={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className="ghost-button" onClick={onLogout}>
            退出到官网
          </button>
        </div>
      </header>

      <section className="status-strip" aria-label="系统状态">
        <span className="status-pill success">Dify 状态：fallback 可用</span>
        <span className="status-pill">角色重点：{currentRole.focus}</span>
        <span className="status-pill">当前模块：{current.label}</span>
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
                className={activePage === item.key ? "nav-item active" : "nav-item"}
                disabled={disabled}
                key={item.key}
                onClick={() => onNavigate(item.key)}
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
          {renderCurrentPage()}
        </section>
      </div>
    </main>
  );
}
