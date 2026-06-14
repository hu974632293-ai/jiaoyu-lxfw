import type { RoleKey } from "./data/prototype";

export type EnterpriseAgentSceneKey = "daily" | "org" | "customer" | "guide";

export type EnterpriseAgentSceneConfig = {
  key: EnterpriseAgentSceneKey;
  label: string;
  shortLabel: string;
  hint: string;
  prompt: string;
};

export type EnterpriseAgentTaskSummary = {
  taskType: string;
  subject: string;
  related: string;
  waitingFor: string;
  resultLabel: string;
};

export const enterpriseAgentSceneKeys: EnterpriseAgentSceneKey[] = ["daily", "org", "customer", "guide"];

const sceneCatalog: Record<EnterpriseAgentSceneKey, EnterpriseAgentSceneConfig> = {
  daily: {
    key: "daily",
    label: "日报",
    shortLabel: "日",
    hint: "口述转草稿",
    prompt: "今天跟进了王同学申请材料，联系家长确认预算，发现签证材料还缺资产证明。帮我生成日报草稿。",
  },
  org: {
    key: "org",
    label: "组织",
    shortLabel: "组",
    hint: "按事项找负责人",
    prompt: "学生服务投诉现在谁负责？请给出处理入口和下一步。",
  },
  customer: {
    key: "customer",
    label: "客户",
    shortLabel: "客",
    hint: "查询受控客户信息",
    prompt: "查询本周高潜客户数量，并告诉我需要跟进的重点。",
  },
  guide: {
    key: "guide",
    label: "指南",
    shortLabel: "新",
    hint: "新人制度流程",
    prompt: "新人入职第一周需要完成哪些事项？",
  },
};

const managerDailyScene: EnterpriseAgentSceneConfig = {
  ...sceneCatalog.daily,
  hint: "团队汇总",
  prompt: "汇总今天团队日报，说明主要进展、风险和下一步。",
};

const roleSceneKeys: Record<RoleKey, EnterpriseAgentSceneKey[]> = {
  admin: ["org", "guide"],
  manager: ["daily", "org", "guide"],
  consultant: ["daily", "org", "customer", "guide"],
  employee: ["daily", "org", "guide"],
  teacher: ["daily", "org", "guide"],
  student: [],
};

const taskSummaries: Record<EnterpriseAgentSceneKey, EnterpriseAgentTaskSummary> = {
  daily: {
    taskType: "日报草稿",
    subject: "我的日报",
    related: "今日跟进记录",
    waitingFor: "风险事项和明日计划",
    resultLabel: "日报草稿",
  },
  org: {
    taskType: "查找负责人",
    subject: "负责人查询",
    related: "学生服务投诉",
    waitingFor: "负责人和处理入口",
    resultLabel: "负责人建议",
  },
  customer: {
    taskType: "客户查询",
    subject: "受控客户信息",
    related: "本周高潜客户",
    waitingFor: "重点跟进名单",
    resultLabel: "客户摘要",
  },
  guide: {
    taskType: "新人指南",
    subject: "新人流程",
    related: "入职第一周事项",
    waitingFor: "步骤和联系人",
    resultLabel: "流程指引",
  },
};

const managerDailySummary: EnterpriseAgentTaskSummary = {
  taskType: "日报汇总",
  subject: "团队日报",
  related: "团队进展和风险",
  waitingFor: "汇总口径和风险定位",
  resultLabel: "日报汇总",
};

export function getEnterpriseAgentSceneKeys(role: RoleKey): EnterpriseAgentSceneKey[] {
  return [...roleSceneKeys[role]];
}

export function getDefaultEnterpriseAgentScene(role: RoleKey): EnterpriseAgentSceneKey {
  return roleSceneKeys[role][0] ?? "guide";
}

export function getEnterpriseAgentSceneForRole(role: RoleKey, scene: EnterpriseAgentSceneKey): EnterpriseAgentSceneConfig {
  if (role === "manager" && scene === "daily") {
    return managerDailyScene;
  }
  return sceneCatalog[scene];
}

export function getEnterpriseAgentScenesForRole(role: RoleKey): EnterpriseAgentSceneConfig[] {
  return roleSceneKeys[role].map((scene) => getEnterpriseAgentSceneForRole(role, scene));
}

export function getEnterpriseAgentTaskSummary(role: RoleKey, scene: EnterpriseAgentSceneKey): EnterpriseAgentTaskSummary {
  if (role === "manager" && scene === "daily") {
    return managerDailySummary;
  }
  return taskSummaries[scene];
}
