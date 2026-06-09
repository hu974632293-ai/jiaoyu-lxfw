import { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Bot,
  Database,
  FileText,
  GraduationCap,
  LayoutDashboard,
  RefreshCw,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiRequest } from "./api/client";
import DashboardPage from "./pages/DashboardPage";
import EnterpriseAssistantPage from "./pages/EnterpriseAssistantPage";
import EventsPage from "./pages/EventsPage";
import KnowledgePage from "./pages/KnowledgePage";
import LeadsPage from "./pages/LeadsPage";
import ProjectsPage from "./pages/ProjectsPage";
import ReportsPage from "./pages/ReportsPage";
import StudentAssistantPage from "./pages/StudentAssistantPage";
import SystemAdminPage from "./pages/SystemAdminPage";
import { auditRows, notifications, roleOptions } from "./data/prototype";
import type { RoleKey } from "./data/prototype";

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

type NavItem = {
  key: PageKey;
  label: string;
  desc: string;
  icon: LucideIcon;
  component: (props: PageProps) => JSX.Element;
};

const navItems: NavItem[] = [
  { key: "dashboard", label: "总览", desc: "四条主线和运营状态", icon: LayoutDashboard, component: DashboardPage },
  { key: "crm", label: "CRM", desc: "线索、跟进和阶段流转", icon: Users, component: LeadsPage },
  { key: "projects", label: "项目/课程", desc: "项目标签和推荐说明", icon: GraduationCap, component: ProjectsPage },
  { key: "events", label: "活动运营", desc: "报名、名单和签到", icon: Activity, component: EventsPage },
  { key: "enterprise", label: "企业助手", desc: "员工自然语言入口", icon: Bot, component: EnterpriseAssistantPage },
  { key: "student", label: "学生助手", desc: "学生服务和老师处理", icon: BookOpen, component: StudentAssistantPage },
  { key: "knowledge", label: "知识库", desc: "Dify 问答和 fallback", icon: Database, component: KnowledgePage },
  { key: "reports", label: "报告中心", desc: "报告生成和 JSON 快照", icon: BarChart3, component: ReportsPage },
  { key: "admin", label: "系统管理", desc: "角色、权限、审计", icon: Settings, component: SystemAdminPage },
];

const roleVisiblePages: Record<RoleKey, PageKey[]> = {
  admin: ["dashboard", "crm", "projects", "events", "enterprise", "student", "knowledge", "reports", "admin"],
  manager: ["dashboard", "crm", "events", "enterprise", "student", "knowledge", "reports", "admin"],
  consultant: ["dashboard", "crm", "projects", "events", "knowledge", "reports"],
  employee: ["dashboard", "crm", "enterprise", "knowledge", "reports"],
  teacher: ["dashboard", "student", "knowledge", "reports"],
  student: ["dashboard", "student", "knowledge"],
};

export default function App() {
  const [active, setActive] = useState<PageKey>("dashboard");
  const [role, setRole] = useState<RoleKey>("admin");
  const [seedStatus, setSeedStatus] = useState("演示数据未初始化");

  const currentRole = roleOptions.find((item) => item.key === role) ?? roleOptions[0];
  const visiblePages = useMemo(() => roleVisiblePages[role], [role]);
  const current = navItems.find((page) => page.key === active) ?? navItems[0];
  const CurrentPage = current.component;

  function changeRole(nextRole: RoleKey) {
    setRole(nextRole);
    const allowed = roleVisiblePages[nextRole];
    if (!allowed.includes(active)) {
      setActive(allowed[0]);
    }
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

  return (
    <main className="workspace-shell">
      <header className="topbar">
        <div className="brand">
          <ShieldCheck size={26} aria-hidden="true" />
          <div>
            <h1>教育服务运营工作台</h1>
            <p>二期 V1 中保真原型：真实 API 与前端 mock 混合演示</p>
          </div>
        </div>
        <div className="top-actions">
          <label className="role-switcher">
            <span>当前角色</span>
            <select value={role} onChange={(event) => changeRole(event.target.value as RoleKey)}>
              {roleOptions.map((option) => (
                <option value={option.key} key={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
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
        <span className={seedStatus.includes("成功") ? "status-pill success" : seedStatus.includes("失败") || seedStatus.includes("请求") ? "status-pill danger" : "status-pill"}>
          {seedStatus}
        </span>
      </section>

      <div className="workspace-grid">
        <aside className="sidebar" aria-label="一级导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            const disabled = !visiblePages.includes(item.key);
            return (
              <button
                className={active === item.key ? "nav-item active" : "nav-item"}
                disabled={disabled}
                key={item.key}
                onClick={() => setActive(item.key)}
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
          <CurrentPage role={role} onNavigate={setActive} onSeedDemo={seedDemo} seedStatus={seedStatus} />
        </section>

        <aside className="context-panel" aria-label="右侧上下文">
          <div className="context-block">
            <h2>当前上下文</h2>
            <p className="muted">角色：{currentRole.label}</p>
            <p className="muted">模块：{current.label}</p>
            <div className="compact-card">
              <strong>当前客户</strong>
              <span>王晨 / 新加坡国际本科 / 高潜跟进</span>
            </div>
            <div className="compact-card">
              <strong>当前学生</strong>
              <span>陈雨 / 申请材料补充中 / 低风险</span>
            </div>
          </div>
          <div className="context-block">
            <h2>待办提醒</h2>
            {notifications.map((item) => (
              <div className="mini-row" key={item.title}>
                <span>{item.title}</span>
                <em>{item.status}</em>
              </div>
            ))}
          </div>
          <div className="context-block">
            <h2>最近操作</h2>
            {auditRows.slice(0, 3).map((item) => (
              <div className="mini-row" key={`${item.operator}-${item.time}`}>
                <span>{item.action}</span>
                <em>{item.time}</em>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
