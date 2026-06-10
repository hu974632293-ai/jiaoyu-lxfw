import {
  BarChart3,
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
  | "employeeWorkspace"
  | "teacherStudentService"
  | "studentService"
  | "managementDashboard"
  | "systemGovernance"
  | "operations"
  | "reports"
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
  { key: "employeeWorkspace", label: "员工工作台", desc: "客户快捷操作、日报和组织架构", group: "main", icon: Building2 },
  { key: "teacherStudentService", label: "学生服务工作台", desc: "请假审批、反馈处理和心理预警", group: "main", icon: GraduationCap },
  { key: "studentService", label: "学生服务台", desc: "请假、反馈、进度和生活支持", group: "main", icon: GraduationCap },
  { key: "managementDashboard", label: "经营管理后台", desc: "经营指标、报告和风险队列", group: "main", icon: BarChart3 },
  { key: "systemGovernance", label: "系统治理", desc: "用户、权限、审计、知识来源和演示控制", group: "governance", icon: Settings },
  { key: "operations", label: "运营资源", desc: "项目、活动和知识库", group: "main", icon: BriefcaseBusiness },
  { key: "reports", label: "报告中心", desc: "经营、日报、心理和投诉报告", group: "main", icon: BarChart3 },
  { key: "systemDemo", label: "系统与演示", desc: "权限、审计、OpenAPI 和 seed", group: "governance", icon: Settings },
];

export const roleVisiblePages: Record<RoleKey, BackofficePageKey[]> = {
  admin: ["systemGovernance"],
  manager: ["managementDashboard", "customerGrowth", "reports"],
  consultant: ["customerGrowth", "customer360", "operations", "reports"],
  employee: ["employeeWorkspace", "customerGrowth", "operations"],
  teacher: ["teacherStudentService", "reports"],
  student: ["studentService"],
};

export const roleDefaultPage: Record<RoleKey, BackofficePageKey> = {
  admin: "systemGovernance",
  manager: "managementDashboard",
  consultant: "customerGrowth",
  employee: "employeeWorkspace",
  teacher: "teacherStudentService",
  student: "studentService",
};

export const loginNavItem = { label: "登录", icon: LogIn };
