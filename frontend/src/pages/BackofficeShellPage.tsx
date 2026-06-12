import { PanelLeftClose, PanelLeftOpen, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import Customer360Page from "./Customer360Page";
import CustomerGrowthPage from "./CustomerGrowthPage";
import EmployeeWorkspacePage from "./EmployeeWorkspacePage";
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

const roleShellSummaries: Record<RoleKey, { title: string; items: string[]; footnote: string }> = {
  admin: {
    title: "治理重点",
    items: ["权限与角色", "审计与通知", "知识来源"],
    footnote: "系统状态与 seed 归入治理页内处理",
  },
  manager: {
    title: "经营重点",
    items: ["增长总览", "团队日报", "风险报告"],
    footnote: "优先看趋势、风险和待决策事项",
  },
  consultant: {
    title: "顾问重点",
    items: ["客户队列", "画像研判", "跟进任务"],
    footnote: "客户 360 由客户增长场景进入",
  },
  employee: {
    title: "员工重点",
    items: ["快捷录入", "口述日报", "受控查询"],
    footnote: "低频入口保持轻量，不挤压工作区",
  },
  teacher: {
    title: "老师重点",
    items: ["请假审批", "反馈处理", "辅助预警"],
    footnote: "心理预警只做辅助识别，不替代诊断",
  },
  student: {
    title: "学生重点",
    items: ["请假反馈", "申请进度", "生活支持"],
    footnote: "学生默认使用轻量收起导航",
  },
};

const backofficeComponents: Partial<Record<BackofficePageKey, BackofficeComponent>> = {
  employeeWorkspace: EmployeeWorkspacePage,
  teacherStudentService: TeacherStudentServicePage,
  teacherLeaveApproval: TeacherLeaveApprovalWorkflowPage,
  teacherFeedback: TeacherFeedbackWorkflowPage,
  teacherPsych: TeacherStudentServicePage,
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
  const storageKey = `jiaoyu-backoffice-sidebar-${role}`;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(role === "student");
  const visibleNavItems = visiblePages
    .map((pageKey) => backofficeNavItems.find((item) => item.key === pageKey))
    .filter((item): item is (typeof backofficeNavItems)[number] => Boolean(item));
  const current = backofficeNavItems.find((page) => page.key === activePage) ?? visibleNavItems[0] ?? backofficeNavItems[0];
  const shellClass = role === "student" ? "workspace-shell student-shell" : "workspace-shell staff-shell";
  const roleSummary = roleShellSummaries[role];

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

      <div className={`workspace-grid ${role === "student" ? "student-workspace-grid" : ""} ${isSidebarCollapsed ? "sidebar-collapsed" : "sidebar-expanded"}`}>
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
            <span className="sidebar-foot-title">{roleSummary.title}</span>
            <div className="sidebar-foot-list">
              {roleSummary.items.map((item) => (
                <span>{item}</span>
              ))}
            </div>
            <small>{roleSummary.footnote}</small>
          </div>
        </aside>

        <section className="content-frame">{renderCurrentPage()}</section>
      </div>
    </main>
  );
}
