import type { RoleKey } from "./data/prototype";
import type { BackofficePageKey } from "./navigation";

export type LoginAccountKey = "admin" | "manager" | "consultant" | "employee" | "teacher" | "student" | "test";
export type LoginShortcutKey = "enterprise" | "student" | "test";

export type LoginAccountProfile = {
  key: LoginAccountKey;
  username: string;
  password: string;
  displayName: string;
  role: RoleKey;
  title: string;
  accessScope: string;
};

export type LoginShortcut = {
  key: LoginShortcutKey;
  label: string;
  desc: string;
  accountKey: LoginAccountKey;
};

const allBackofficePages: BackofficePageKey[] = [
  "roleOverview",
  "consultantNewLead",
  "consultantLeadQueue",
  "consultantFunnel",
  "consultantCustomer360",
  "consultantTasks",
  "consultantEvents",
  "employeeQuickEntry",
  "employeeReports",
  "employeeOrg",
  "employeeCustomerQuery",
  "employeeGuide",
  "employeeAgent",
  "teacherLeaveApproval",
  "teacherFeedback",
  "teacherPsych",
  "teacherAcademic",
  "teacherGrades",
  "studentLeaveRequest",
  "studentFeedbackSubmit",
  "studentGradeQuery",
  "studentApplicationProgress",
  "studentExamNodes",
  "studentLifeSupport",
  "managerGrowthDashboard",
  "managerDailySummary",
  "managerPsychWeekly",
  "managerFeedbackWeekly",
  "managerRiskQueue",
  "adminUsers",
  "adminRoles",
  "adminPermissions",
  "adminAudit",
  "adminNotifications",
  "adminKnowledgeSources",
  "adminSystemStatus",
  "growthOverview",
  "customerGrowth",
  "customer360",
  "employeeWorkspace",
  "teacherStudentService",
  "studentService",
  "managementDashboard",
  "systemGovernance",
  "operations",
  "reports",
  "systemDemo",
];

const employeePages: BackofficePageKey[] = ["employeeQuickEntry", "employeeReports", "employeeOrg", "employeeCustomerQuery", "employeeGuide", "employeeAgent"];
const adminGovernancePages: BackofficePageKey[] = [
  "roleOverview",
  "adminUsers",
  "adminRoles",
  "adminPermissions",
  "adminAudit",
  "adminNotifications",
  "adminKnowledgeSources",
  "adminSystemStatus",
  "employeeAgent",
];

export const roleVisiblePages: Record<RoleKey, BackofficePageKey[]> = {
  admin: adminGovernancePages,
  manager: ["roleOverview", "managerGrowthDashboard", "managerDailySummary", "managerPsychWeekly", "managerFeedbackWeekly", "managerRiskQueue", ...employeePages, "reports"],
  consultant: ["roleOverview", "consultantNewLead", "consultantLeadQueue", "consultantFunnel", "consultantCustomer360", "consultantTasks", "consultantEvents", ...employeePages],
  employee: ["roleOverview", ...employeePages],
  teacher: ["roleOverview", "teacherLeaveApproval", "teacherFeedback", "teacherPsych", "teacherAcademic", "teacherGrades", ...employeePages],
  student: ["roleOverview", "studentLeaveRequest", "studentFeedbackSubmit", "studentGradeQuery", "studentApplicationProgress", "studentExamNodes", "studentLifeSupport"],
};

export const loginAccounts: Record<LoginAccountKey, LoginAccountProfile> = {
  admin: {
    key: "admin",
    username: "admin",
    password: "admin123",
    displayName: "系统管理员",
    role: "admin",
    title: "系统治理管理员",
    accessScope: "全部后台界面权限",
  },
  manager: {
    key: "manager",
    username: "manager",
    password: "manager123",
    displayName: "王管理者",
    role: "manager",
    title: "经营管理者",
    accessScope: "经营管理后台 + 员工工作台",
  },
  consultant: {
    key: "consultant",
    username: "consultant",
    password: "consultant123",
    displayName: "李顾问",
    role: "consultant",
    title: "客户增长顾问",
    accessScope: "客户增长 + 员工工作台",
  },
  employee: {
    key: "employee",
    username: "employee",
    password: "employee123",
    displayName: "张员工",
    role: "employee",
    title: "运营员工",
    accessScope: "员工工作台",
  },
  teacher: {
    key: "teacher",
    username: "teacher",
    password: "teacher123",
    displayName: "周老师",
    role: "teacher",
    title: "学生服务老师",
    accessScope: "学生服务工作台 + 员工工作台",
  },
  student: {
    key: "student",
    username: "student",
    password: "student123",
    displayName: "陈同学",
    role: "student",
    title: "学生用户",
    accessScope: "学生服务台",
  },
  test: {
    key: "test",
    username: "test",
    password: "test123",
    displayName: "全权限测试账号",
    role: "admin",
    title: "验收与演示账号",
    accessScope: "全部后台界面权限",
  },
};

export const loginShortcuts: Record<LoginShortcutKey, LoginShortcut> = {
  enterprise: {
    key: "enterprise",
    label: "企业版",
    desc: "填入内部人员账号，用于进入企业业务后台。",
    accountKey: "consultant",
  },
  student: {
    key: "student",
    label: "学生版",
    desc: "填入学生账号，用于进入学生服务台。",
    accountKey: "student",
  },
  test: {
    key: "test",
    label: "测试账号",
    desc: "填入全权限账号，用于验收和演示。",
    accountKey: "test",
  },
};

export function isLoginAccountKey(value: string | null): value is LoginAccountKey {
  return Boolean(value && Object.prototype.hasOwnProperty.call(loginAccounts, value));
}

export function authenticateLogin(username: string, password: string): LoginAccountProfile | null {
  const normalizedUsername = username.trim();
  return Object.values(loginAccounts).find((account) => account.username === normalizedUsername && account.password === password) ?? null;
}

export function canSwitchDemoRole(accountKey: LoginAccountKey): boolean {
  return accountKey === "test";
}

export function canUseAccountRoleView(accountKey: LoginAccountKey, role: RoleKey): boolean {
  return canSwitchDemoRole(accountKey) || loginAccounts[accountKey].role === role;
}

export function getAccountVisiblePages(accountKey: LoginAccountKey, role: RoleKey = loginAccounts[accountKey].role): BackofficePageKey[] {
  return roleVisiblePages[canUseAccountRoleView(accountKey, role) ? role : loginAccounts[accountKey].role];
}

export function canAccessAccountPage(accountKey: LoginAccountKey, page: BackofficePageKey): boolean {
  return canSwitchDemoRole(accountKey) ? allBackofficePages.includes(page) : getAccountVisiblePages(accountKey).includes(page);
}

export function getAccountDefaultPage(accountKey: LoginAccountKey): BackofficePageKey {
  return "roleOverview";
}
