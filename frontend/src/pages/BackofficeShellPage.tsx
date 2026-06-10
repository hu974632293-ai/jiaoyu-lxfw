import { ShieldCheck } from "lucide-react";
import Customer360Page from "./Customer360Page";
import CustomerGrowthPage from "./CustomerGrowthPage";
import GrowthOverviewPage from "./GrowthOverviewPage";
import OperationsResourcesPage from "./OperationsResourcesPage";
import ReportsPage from "./ReportsPage";
import SystemDemoPage from "./SystemDemoPage";
import EnterpriseAssistantPage from "./EnterpriseAssistantPage";
import StudentAssistantPage from "./StudentAssistantPage";
import { roleOptions } from "../data/prototype";
import type { RoleKey } from "../data/prototype";
import { backofficeNavItems, roleVisiblePages } from "../navigation";
import type { BackofficePageKey } from "../navigation";
import type { PageProps } from "../App";

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
type LegacyBackofficePageKey = Exclude<BackofficePageKey, "growthOverview" | "customerGrowth" | "customer360" | "managementDashboard">;

const backofficeComponents: Record<LegacyBackofficePageKey, BackofficeComponent> = {
  employeeWorkspace: EnterpriseAssistantPage,
  teacherStudentService: StudentAssistantPage,
  studentService: StudentAssistantPage,
  systemGovernance: SystemDemoPage,
  operations: OperationsResourcesPage,
  reports: ReportsPage,
  systemDemo: SystemDemoPage,
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
  const visibleNavItems = visiblePages
    .map((pageKey) => backofficeNavItems.find((item) => item.key === pageKey))
    .filter((item): item is (typeof backofficeNavItems)[number] => Boolean(item));
  const current = backofficeNavItems.find((page) => page.key === activePage) ?? visibleNavItems[0] ?? backofficeNavItems[0];

  function renderCurrentPage() {
    if (activePage === "growthOverview" || activePage === "managementDashboard") {
      return <GrowthOverviewPage onNavigate={onNavigate} />;
    }
    if (activePage === "customerGrowth") {
      return <CustomerGrowthPage onNavigate={onNavigate} />;
    }
    if (activePage === "customer360") {
      return <Customer360Page selectedLeadId={selectedLeadId} onNavigate={onNavigate} />;
    }

    const CurrentPage = backofficeComponents[activePage];
    return <CurrentPage role={role} onNavigate={onNavigate} onSeedDemo={onSeedDemo} seedStatus={seedStatus} />;
  }

  return (
    <main className="workspace-shell">
      <header className="topbar">
        <div className="brand">
          <ShieldCheck size={26} aria-hidden="true" />
          <div>
            <h1>教育服务运营工作台</h1>
            <p>按角色进入对应业务后台</p>
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
        <span className="status-pill">角色重点：{currentRole.focus}</span>
        <span className="status-pill">当前模块：{current.label}</span>
        <span className="status-pill">当前客户 ID：{selectedLeadId ?? "未选择"}</span>
      </section>

      <div className="workspace-grid">
        <aside className="sidebar" aria-label="后台一级导航">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activePage === item.key ? "nav-item active" : "nav-item"}
                key={item.key}
                onClick={() => onNavigate(item.key)}
                title={item.desc}
              >
                <Icon size={18} aria-hidden="true" />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.desc}</small>
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
