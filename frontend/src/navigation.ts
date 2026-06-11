import {
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Gauge,
  GraduationCap,
  HelpCircle,
  Home,
  LogIn,
  Mail,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  Siren,
  UserCog,
  UserPlus,
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
  | "roleOverview"
  | "consultantNewLead"
  | "consultantLeadQueue"
  | "consultantFunnel"
  | "consultantCustomer360"
  | "consultantTasks"
  | "consultantEvents"
  | "employeeQuickEntry"
  | "employeeReports"
  | "employeeOrg"
  | "employeeCustomerQuery"
  | "employeeGuide"
  | "teacherLeaveApproval"
  | "teacherFeedback"
  | "teacherPsych"
  | "teacherAcademic"
  | "teacherGrades"
  | "studentLeaveRequest"
  | "studentFeedbackSubmit"
  | "studentGradeQuery"
  | "studentApplicationProgress"
  | "studentExamNodes"
  | "studentLifeSupport"
  | "managerGrowthDashboard"
  | "managerDailySummary"
  | "managerPsychWeekly"
  | "managerFeedbackWeekly"
  | "managerRiskQueue"
  | "adminUsers"
  | "adminRoles"
  | "adminPermissions"
  | "adminAudit"
  | "adminNotifications"
  | "adminKnowledgeSources"
  | "adminSystemStatus"
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
  group: "overview" | "main" | "extension" | "governance";
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
  { key: "roleOverview", label: "工作台总览", desc: "指标、待办、最近记录和功能入口", group: "overview", icon: Gauge },
  { key: "consultantNewLead", label: "新建线索", desc: "手动录入客户资料并进入研判", group: "main", icon: UserPlus },
  { key: "consultantLeadQueue", label: "线索队列", desc: "搜索、筛选和进入客户详情", group: "main", icon: Users },
  { key: "consultantFunnel", label: "漏斗阶段", desc: "按阶段查看客户推进状态", group: "main", icon: BarChart3 },
  { key: "consultantCustomer360", label: "客户 360", desc: "客户画像、跟进和推荐项目", group: "main", icon: BriefcaseBusiness },
  { key: "consultantTasks", label: "跟进任务", desc: "今日待办、提醒和处理记录", group: "main", icon: ClipboardList },
  { key: "consultantEvents", label: "活动邀约", desc: "讲座邀约、报名名单和转化", group: "main", icon: CalendarDays },
  { key: "employeeQuickEntry", label: "快捷录入", desc: "低成本录入客户和状态", group: "main", icon: UserPlus },
  { key: "employeeReports", label: "日报/周报", desc: "提交日报并查看汇总", group: "main", icon: FileText },
  { key: "employeeOrg", label: "组织架构", desc: "部门、职责和联系人查询", group: "main", icon: Building2 },
  { key: "employeeCustomerQuery", label: "客户查询", desc: "受控查询客户状态和统计", group: "main", icon: Search },
  { key: "employeeGuide", label: "新人指南", desc: "制度、流程和操作指引", group: "main", icon: BookOpen },
  { key: "teacherLeaveApproval", label: "请假审批", desc: "查看申请、审批和记录", group: "main", icon: CalendarCheck },
  { key: "teacherFeedback", label: "反馈处理", desc: "处理投诉建议和服务工单", group: "main", icon: MessageSquare },
  { key: "teacherPsych", label: "心理预警", desc: "辅助识别、跟进和记录", group: "main", icon: Siren },
  { key: "teacherAcademic", label: "学业/进度", desc: "考务节点和申请进度查看", group: "main", icon: GraduationCap },
  { key: "teacherGrades", label: "成绩录入", desc: "登记成绩并保留修改记录", group: "main", icon: ClipboardCheck },
  { key: "studentLeaveRequest", label: "请假申请", desc: "提交请假并查看处理状态", group: "main", icon: CalendarCheck },
  { key: "studentFeedbackSubmit", label: "反馈提交", desc: "提交投诉建议和补充说明", group: "main", icon: MessageSquare },
  { key: "studentGradeQuery", label: "成绩查询", desc: "查看成绩和老师反馈", group: "main", icon: ClipboardCheck },
  { key: "studentApplicationProgress", label: "申请进度", desc: "查看阶段、材料和下一步", group: "main", icon: FileText },
  { key: "studentExamNodes", label: "考务节点", desc: "考试、材料和提醒节点", group: "main", icon: CalendarDays },
  { key: "studentLifeSupport", label: "生活支持", desc: "住宿、出行和紧急支持", group: "main", icon: HelpCircle },
  { key: "managerGrowthDashboard", label: "增长总览", desc: "线索、成交、流失和转化", group: "main", icon: BarChart3 },
  { key: "managerDailySummary", label: "日报汇总", desc: "团队日报和周报汇总", group: "main", icon: FileText },
  { key: "managerPsychWeekly", label: "心理周报", desc: "学生心理辅助风险周报", group: "main", icon: Siren },
  { key: "managerFeedbackWeekly", label: "投诉周报", desc: "投诉处理和未决风险", group: "main", icon: MessageSquare },
  { key: "managerRiskQueue", label: "风险队列", desc: "高优先级经营和服务风险", group: "main", icon: Bell },
  { key: "adminUsers", label: "用户", desc: "账号、状态和角色绑定", group: "governance", icon: Users },
  { key: "adminRoles", label: "角色", desc: "角色定义和使用范围", group: "governance", icon: UserCog },
  { key: "adminPermissions", label: "权限", desc: "权限点、菜单和接口边界", group: "governance", icon: ShieldCheck },
  { key: "adminAudit", label: "审计", desc: "关键操作和处理留痕", group: "governance", icon: ClipboardList },
  { key: "adminNotifications", label: "通知", desc: "通知、待办和已读状态", group: "governance", icon: Bell },
  { key: "adminKnowledgeSources", label: "知识来源", desc: "知识来源、同步和问答边界", group: "governance", icon: BookOpen },
  { key: "adminSystemStatus", label: "系统状态", desc: "接口、初始化和系统控制", group: "governance", icon: Settings },
  { key: "growthOverview", label: "增长总览", desc: "今日重点、最近客户和待办", group: "extension", icon: Gauge },
  { key: "customerGrowth", label: "客户增长", desc: "CRM 流水线和客户队列", group: "extension", icon: Users },
  { key: "customer360", label: "客户 360", desc: "客户画像、跟进和推荐", group: "extension", icon: BriefcaseBusiness },
  { key: "employeeWorkspace", label: "员工工作台", desc: "客户快捷操作、日报和组织架构", group: "extension", icon: Building2 },
  { key: "teacherStudentService", label: "学生服务工作台", desc: "请假审批、反馈处理和心理预警", group: "extension", icon: GraduationCap },
  { key: "studentService", label: "学生服务台", desc: "请假、反馈、进度和生活支持", group: "extension", icon: GraduationCap },
  { key: "managementDashboard", label: "经营管理后台", desc: "经营指标、报告和风险队列", group: "extension", icon: BarChart3 },
  { key: "systemGovernance", label: "系统治理", desc: "用户、权限、审计、知识来源和系统状态", group: "governance", icon: Settings },
  { key: "operations", label: "运营资源", desc: "项目、活动和知识库", group: "extension", icon: BriefcaseBusiness },
  { key: "reports", label: "报告中心", desc: "经营、日报、心理和投诉报告", group: "extension", icon: BarChart3 },
  { key: "systemDemo", label: "系统与演示", desc: "权限、审计、接口文档和初始化", group: "governance", icon: Settings },
];

export const roleVisiblePages: Record<RoleKey, BackofficePageKey[]> = {
  admin: ["roleOverview", "adminUsers", "adminRoles", "adminPermissions", "adminAudit", "adminNotifications", "adminKnowledgeSources", "adminSystemStatus"],
  manager: ["roleOverview", "managerGrowthDashboard", "managerDailySummary", "managerPsychWeekly", "managerFeedbackWeekly", "managerRiskQueue"],
  consultant: ["roleOverview", "consultantNewLead", "consultantLeadQueue", "consultantFunnel", "consultantCustomer360", "consultantTasks", "consultantEvents"],
  employee: ["roleOverview", "employeeQuickEntry", "employeeReports", "employeeOrg", "employeeCustomerQuery", "employeeGuide"],
  teacher: ["roleOverview", "teacherLeaveApproval", "teacherFeedback", "teacherPsych", "teacherAcademic", "teacherGrades"],
  student: ["roleOverview", "studentLeaveRequest", "studentFeedbackSubmit", "studentGradeQuery", "studentApplicationProgress", "studentExamNodes", "studentLifeSupport"],
};

export const roleDefaultPage: Record<RoleKey, BackofficePageKey> = {
  admin: "roleOverview",
  manager: "roleOverview",
  consultant: "roleOverview",
  employee: "roleOverview",
  teacher: "roleOverview",
  student: "roleOverview",
};

export const appModeKeys: AppMode[] = ["public", "login", "backoffice"];
export const publicPageKeys = publicNavItems.map((item) => item.key);
export const backofficePageKeys = backofficeNavItems.map((item) => item.key);

export function isAppMode(value: string | null): value is AppMode {
  return Boolean(value && appModeKeys.includes(value as AppMode));
}

export function isPublicPageKey(value: string | null): value is PublicPageKey {
  return Boolean(value && publicPageKeys.includes(value as PublicPageKey));
}

export function isBackofficePageKey(value: string | null): value is BackofficePageKey {
  return Boolean(value && backofficePageKeys.includes(value as BackofficePageKey));
}

export const loginNavItem = { label: "登录", icon: LogIn };
