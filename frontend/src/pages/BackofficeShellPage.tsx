import { ChevronDown, PanelLeftClose, PanelLeftOpen, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import Customer360Page from "./Customer360Page";
import CustomerGrowthPage from "./CustomerGrowthPage";
import EmployeeWorkspacePage from "./EmployeeWorkspacePage";
import EmployeeAgentPanel from "./EmployeeAgentPanel";
import GrowthOverviewPage from "./GrowthOverviewPage";
import ManagementDashboardPage from "./ManagementDashboardPage";
import OperationsResourcesPage from "./OperationsResourcesPage";
import ReportsPage from "./ReportsPage";
import RoleWorkspacePage from "./RoleWorkspacePage";
import StudentFeedbackWorkflowPage from "./StudentFeedbackWorkflowPage";
import StudentGradeWorkflowPage from "./StudentGradeWorkflowPage";
import StudentApplicationProgressWorkflowPage from "./StudentApplicationProgressWorkflowPage";
import StudentExamNodesWorkflowPage from "./StudentExamNodesWorkflowPage";
import StudentLeaveWorkflowPage from "./StudentLeaveWorkflowPage";
import StudentServicePage from "./StudentServicePage";
import SystemDemoPage from "./SystemDemoPage";
import SystemGovernancePage from "./SystemGovernancePage";
import TeacherAcademicWorkflowPage from "./TeacherAcademicWorkflowPage";
import TeacherFeedbackWorkflowPage from "./TeacherFeedbackWorkflowPage";
import TeacherGradeWorkflowPage from "./TeacherGradeWorkflowPage";
import TeacherLeaveApprovalWorkflowPage from "./TeacherLeaveApprovalWorkflowPage";
import TeacherPsychWorkflowPage from "./TeacherPsychWorkflowPage";
import TeacherStudentServicePage from "./TeacherStudentServicePage";
import { roleOptions } from "../data/prototype";
import type { RoleKey } from "../data/prototype";
import { canSwitchDemoRole, getAccountVisiblePages } from "../authRules";
import type { LoginAccountProfile } from "../authRules";
import { backofficeNavItems } from "../navigation";
import type { BackofficePageKey } from "../navigation";
import type { PageProps } from "../App";

type BackofficeShellPageProps = {
  accountProfile: LoginAccountProfile;
  role: RoleKey;
  activePage: BackofficePageKey;
  selectedLeadId: number | null;
  onNavigate: (page: BackofficePageKey, leadId?: number) => void;
  onRoleViewChange: (role: RoleKey) => void;
  onLogout: () => void;
  onSeedDemo: () => Promise<void>;
  seedStatus: string;
  accessNotice: string;
};

type BackofficeComponent = (props: PageProps) => JSX.Element;

const backofficeComponents: Partial<Record<BackofficePageKey, BackofficeComponent>> = {
  employeeAgent: EmployeeAgentPanel,
  employeeWorkspace: EmployeeWorkspacePage,
  teacherStudentService: TeacherStudentServicePage,
  teacherLeaveApproval: TeacherLeaveApprovalWorkflowPage,
  teacherFeedback: TeacherFeedbackWorkflowPage,
  teacherPsych: TeacherPsychWorkflowPage,
  teacherAcademic: TeacherAcademicWorkflowPage,
  teacherGrades: TeacherGradeWorkflowPage,
  studentService: StudentServicePage,
  studentLeaveRequest: StudentLeaveWorkflowPage,
  studentFeedbackSubmit: StudentFeedbackWorkflowPage,
  studentGradeQuery: StudentGradeWorkflowPage,
  studentApplicationProgress: StudentApplicationProgressWorkflowPage,
  studentExamNodes: StudentExamNodesWorkflowPage,
  studentLifeSupport: StudentServicePage,
  systemGovernance: SystemGovernancePage,
  operations: OperationsResourcesPage,
  reports: ReportsPage,
  systemDemo: SystemDemoPage,
};

export default function BackofficeShellPage({
  accountProfile,
  role,
  activePage,
  selectedLeadId,
  onNavigate,
  onRoleViewChange,
  onLogout,
  onSeedDemo,
  seedStatus,
  accessNotice,
}: BackofficeShellPageProps) {
  const currentRole = roleOptions.find((item) => item.key === role) ?? roleOptions[0];
  const visiblePages = getAccountVisiblePages(accountProfile.key, role);
  const canSwitchRoleView = canSwitchDemoRole(accountProfile.key);
  const storageKey = `jiaoyu-backoffice-sidebar-${role}`;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(role === "student");
  const visibleNavItems = visiblePages
    .map((pageKey) => backofficeNavItems.find((item) => item.key === pageKey))
    .filter((item): item is (typeof backofficeNavItems)[number] => Boolean(item));
  const current = backofficeNavItems.find((page) => page.key === activePage) ?? visibleNavItems[0] ?? backofficeNavItems[0];
  const shellClass = role === "student" ? "workspace-shell student-shell" : "workspace-shell staff-shell";
  const isAgentPage = activePage === "employeeAgent";
  const isOrgPage = activePage === "employeeOrg";

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    setIsSidebarCollapsed(saved ? saved === "collapsed" : role === "student" || visiblePages.length <= 2);
  }, [role, storageKey, visiblePages.length]);

  function toggleSidebar() {
    setIsSidebarCollapsed((currentValue) => {
      const nextValue = !currentValue;
      window.localStorage.setItem(storageKey, nextValue ? "collapsed" : "expanded");
      return nextValue;
    });
  }

  function renderCurrentPage() {
    if (activePage === "consultantNewLead") {
      return <CustomerGrowthPage initialPanel="create" onNavigate={onNavigate} />;
    }
    if (activePage === "consultantLeadQueue") {
      return <CustomerGrowthPage onNavigate={onNavigate} />;
    }
    if (activePage === "consultantFunnel") {
      return <CustomerGrowthPage initialStatusFilter="high_potential" onNavigate={onNavigate} />;
    }
    if (activePage === "consultantCustomer360") {
      return <Customer360Page selectedLeadId={selectedLeadId} onNavigate={onNavigate} />;
    }
    if (activePage === "consultantTasks") {
      return <Customer360Page selectedLeadId={selectedLeadId} initialTab="tasks" onNavigate={onNavigate} />;
    }
    if (activePage === "consultantEvents") {
      return <Customer360Page selectedLeadId={selectedLeadId} initialTab="events" onNavigate={onNavigate} />;
    }
    if (activePage === "employeeQuickEntry") {
      return <EmployeeWorkspacePage initialView="quickEntry" role={role} onNavigate={onNavigate} onSeedDemo={onSeedDemo} seedStatus={seedStatus} />;
    }
    if (activePage === "employeeReports") {
      return <EmployeeWorkspacePage initialView="reports" role={role} onNavigate={onNavigate} onSeedDemo={onSeedDemo} seedStatus={seedStatus} />;
    }
    if (activePage === "employeeOrg") {
      return <EmployeeWorkspacePage initialView="org" role={role} onNavigate={onNavigate} onSeedDemo={onSeedDemo} seedStatus={seedStatus} />;
    }
    if (activePage === "employeeCustomerQuery") {
      return <EmployeeWorkspacePage initialView="customerQuery" role={role} onNavigate={onNavigate} onSeedDemo={onSeedDemo} seedStatus={seedStatus} />;
    }
    if (activePage === "employeeGuide") {
      return <EmployeeWorkspacePage initialView="guide" role={role} onNavigate={onNavigate} onSeedDemo={onSeedDemo} seedStatus={seedStatus} />;
    }
    if (activePage === "managerGrowthDashboard") {
      return <ManagementDashboardPage initialView="growth" onNavigate={onNavigate} />;
    }
    if (activePage === "managerDailySummary") {
      return <ManagementDashboardPage initialView="daily" onNavigate={onNavigate} />;
    }
    if (activePage === "managerPsychWeekly") {
      return <ManagementDashboardPage initialView="psych" onNavigate={onNavigate} />;
    }
    if (activePage === "managerFeedbackWeekly") {
      return <ManagementDashboardPage initialView="feedback" onNavigate={onNavigate} />;
    }
    if (activePage === "managerRiskQueue") {
      return <ManagementDashboardPage initialView="risk" onNavigate={onNavigate} />;
    }
    if (activePage === "adminUsers") {
      return <SystemGovernancePage initialView="users" role={role} onNavigate={onNavigate} onSeedDemo={onSeedDemo} seedStatus={seedStatus} />;
    }
    if (activePage === "adminRoles") {
      return <SystemGovernancePage initialView="roles" role={role} onNavigate={onNavigate} onSeedDemo={onSeedDemo} seedStatus={seedStatus} />;
    }
    if (activePage === "adminPermissions") {
      return <SystemGovernancePage initialView="permissions" role={role} onNavigate={onNavigate} onSeedDemo={onSeedDemo} seedStatus={seedStatus} />;
    }
    if (activePage === "adminAudit") {
      return <SystemGovernancePage initialView="audit" role={role} onNavigate={onNavigate} onSeedDemo={onSeedDemo} seedStatus={seedStatus} />;
    }
    if (activePage === "adminNotifications") {
      return <SystemGovernancePage initialView="notifications" role={role} onNavigate={onNavigate} onSeedDemo={onSeedDemo} seedStatus={seedStatus} />;
    }
    if (activePage === "adminKnowledgeSources") {
      return <SystemGovernancePage initialView="knowledgeSources" role={role} onNavigate={onNavigate} onSeedDemo={onSeedDemo} seedStatus={seedStatus} />;
    }
    if (activePage === "adminSystemStatus") {
      return <SystemGovernancePage initialView="systemStatus" role={role} onNavigate={onNavigate} onSeedDemo={onSeedDemo} seedStatus={seedStatus} />;
    }
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
    if (CurrentPage) {
      return <CurrentPage role={role} onNavigate={onNavigate} onSeedDemo={onSeedDemo} seedStatus={seedStatus} />;
    }

    return <RoleWorkspacePage role={role} activePage={activePage} onNavigate={onNavigate} onSeedDemo={onSeedDemo} seedStatus={seedStatus} />;
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
          {canSwitchRoleView ? (
            <div className="role-switcher demo-role-switcher" aria-label="演示视角">
              <span>演示视角</span>
              <select value={role} onChange={(event) => onRoleViewChange(event.target.value as RoleKey)}>
                {roleOptions.map((item) => (
                  <option value={item.key} key={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
              <small>{accountProfile.displayName}</small>
            </div>
          ) : null}
          <div className="role-switcher readonly-identity" aria-label="当前登录身份">
            <span>当前账号</span>
            <strong>{accountProfile.displayName} / {currentRole.label}</strong>
            <small>{accountProfile.accessScope}</small>
          </div>
          <button className="ghost-button" onClick={onLogout}>
            返回官网
          </button>
        </div>
      </header>

      <section className="status-strip" aria-label="系统状态">
        <span className="status-pill">当前模块：{current.label}</span>
        {role !== "student" ? <span className="status-pill">当前客户 ID：{selectedLeadId ?? "未选择"}</span> : null}
        {accessNotice ? <span className="status-pill warning">{accessNotice}</span> : null}
      </section>

      <div className={`workspace-grid ${role === "student" ? "student-workspace-grid" : ""} ${isAgentPage ? "agent-workspace-grid" : ""} ${isOrgPage ? "org-workspace-grid" : ""} ${isSidebarCollapsed ? "sidebar-collapsed" : "sidebar-expanded"}`}>
        <aside className="sidebar" aria-label="后台一级导航">
          <div className="sidebar-main">
            <div className="sidebar-head">
              <span className="sidebar-role-mark">{currentRole.label.slice(0, 1)}</span>
              <span className="sidebar-title">
                <strong>{currentRole.label}</strong>
                <small>{currentRole.focus}</small>
              </span>
              <button className="sidebar-toggle" onClick={toggleSidebar} title={isSidebarCollapsed ? "展开导航" : "收起导航"} aria-label={isSidebarCollapsed ? "展开导航" : "收起导航"}>
                {isSidebarCollapsed ? <PanelLeftOpen size={16} aria-hidden="true" /> : <PanelLeftClose size={16} aria-hidden="true" />}
              </button>
            </div>

            <nav className="sidebar-nav" aria-label="角色模块">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    className={activePage === item.key ? "nav-item active" : "nav-item"}
                    onClick={() => onNavigate(item.key)}
                    title={`${item.label}：${item.desc}`}
                    aria-label={item.label}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.desc}</small>
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="sidebar-foot">
            <button className="sidebar-account-card" type="button" title="当前登录用户">
              <span className="sidebar-account-avatar">{accountProfile.displayName.slice(0, 1)}</span>
              <span className="sidebar-account-text">
                <strong>{accountProfile.displayName}</strong>
                <small>{accountProfile.title}</small>
              </span>
              <ChevronDown size={15} aria-hidden="true" />
            </button>
          </div>
        </aside>

        <section className={isAgentPage ? "content-frame agent-content-frame" : "content-frame"}>{renderCurrentPage()}</section>
      </div>
    </main>
  );
}
