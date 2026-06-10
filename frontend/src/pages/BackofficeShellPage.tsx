import { ShieldCheck } from "lucide-react";
import Customer360Page from "./Customer360Page";
import CustomerGrowthPage from "./CustomerGrowthPage";
import EmployeeWorkspacePage from "./EmployeeWorkspacePage";
import GrowthOverviewPage from "./GrowthOverviewPage";
import ManagementDashboardPage from "./ManagementDashboardPage";
import OperationsResourcesPage from "./OperationsResourcesPage";
import ReportsPage from "./ReportsPage";
import StudentServicePage from "./StudentServicePage";
import SystemDemoPage from "./SystemDemoPage";
import SystemGovernancePage from "./SystemGovernancePage";
import TeacherStudentServicePage from "./TeacherStudentServicePage";
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
  employeeWorkspace: EmployeeWorkspacePage,
  teacherStudentService: TeacherStudentServicePage,
  studentService: StudentServicePage,
  systemGovernance: SystemGovernancePage,
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
  const shellClass = role === "student" ? "workspace-shell student-shell" : "workspace-shell staff-shell";

  function renderCurrentPage() {
    if (activePage === "growthOverview") {
      return <GrowthOverviewPage onNavigate={onNavigate} />;
    }
    if (activePage === "managementDashboard") {
      return <ManagementDashboardPage onNavigate={onNavigate} />;
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
    <main className={shellClass}>
      <header className="topbar">
        <div className="brand">
          <ShieldCheck size={26} aria-hidden="true" />
          <div>
            <h1>{role === "student" ? "学生服务台" : "教育服务运营后台"}</h1>
            <p>{role === "student" ? "轻量自助服务入口" : "按角色进入对应业务后台"}</p>
          </div>
        </div>
        <div className="top-actions">
          <label className="role-switcher">
            <span>当前角色</span>
            <select value={role} onChange={(event) => onRoleChange(event.target.value as RoleKey)}>
              {roleOptions.map((option) => (
                <option value={option.key}>{option.label}</option>
              ))}
            </select>
          </label>
          <button className="ghost-button" onClick={onLogout}>
            返回官网
          </button>
        </div>
      </header>

      <section className="status-strip" aria-label="系统状态">
        <span className="status-pill">角色重点：{currentRole.focus}</span>
        <span className="status-pill">当前模块：{current.label}</span>
        {role !== "student" ? <span className="status-pill">当前客户 ID：{selectedLeadId ?? "未选择"}</span> : null}
      </section>

      <div className={role === "student" ? "workspace-grid student-workspace-grid" : "workspace-grid"}>
        <aside className="sidebar" aria-label="后台一级导航">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activePage === item.key ? "nav-item active" : "nav-item"}
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

        <section className="content-frame">{renderCurrentPage()}</section>
      </div>
    </main>
  );
}
