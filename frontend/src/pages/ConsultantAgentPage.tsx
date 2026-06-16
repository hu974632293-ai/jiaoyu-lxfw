import { useEffect, useState, type KeyboardEvent } from "react";
import { apiRequest } from "../api/client";
import { crmPrototypeRows } from "../data/prototype";
import { RoleAgentShell } from "./roleAgentShell";
import type { BackofficePageKey } from "../navigation";

type PendingAction = {
  action_type: "create_follow_up" | "create_task" | "update_lead_status";
  label: string;
  draft: Record<string, string | number | null>;
};

type PendingActionType = PendingAction["action_type"];

type AgentDraft = {
  answer: string;
  intent: string;
  idempotency_key: string;
  requires_confirmation: boolean;
  confirmation_endpoint: string;
  lead_context: {
    id: number;
    customer_name: string;
    status: string;
    source_channel?: string;
  };
  pending_actions: PendingAction[];
};

type ConfirmResult = {
  lead_id: number;
  results: Array<{ action_type: string; target_type: string; target_id: number }>;
  idempotent: boolean;
};

type LeadItem = {
  id: number;
  customer_name: string;
  status: string;
  owner_id?: number | null;
  source_channel?: string;
};

type ConsultantAgentPageProps = {
  selectedLeadId?: number | null;
  onNavigate: (page: BackofficePageKey, leadId?: number) => void;
};

const scenes = [
  { key: "consultant", label: "客户承接" },
];

const promptByScene: Record<string, string> = {
  consultant: "请接住这个客户线索，结合客户360信息生成下一步跟进、待办任务和阶段建议。",
};

const consultantNaturalLanguagePrompts = [
  { key: "followup", label: "帮我接住这个客户线索，生成下一步跟进和待办。" },
  { key: "assessment", label: "这个客户现在最该补哪些信息，风险点是什么？" },
  { key: "customer360", label: "帮我总结客户360里顾问今天要优先看的内容。" },
];

const capabilities = [
  { title: "客户承接", detail: "直接说目标，助手会转成可确认CRM动作" },
  { title: "画像研判", detail: "生成意向和风险依据" },
  { title: "项目推荐", detail: "解释匹配理由" },
  { title: "跟进建议", detail: "整理沟通话术" },
  { title: "任务创建", detail: "生成待办草稿" },
  { title: "阶段更新", detail: "提示阶段变化" },
  { title: "客户360", detail: "定位关键记录" },
];

function formatTime() {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date());
}

function draftFieldLabel(field: string) {
  const labels: Record<string, string> = {
    follow_type: "跟进方式",
    content: "跟进内容",
    next_action: "下一步",
    title: "任务标题",
    due_time: "截止时间",
    status: "目标阶段",
    reason: "更新原因",
  };
  return labels[field] ?? field;
}

export default function ConsultantAgentPage({ selectedLeadId, onNavigate }: ConsultantAgentPageProps) {
  const [activeScene, setActiveScene] = useState(scenes[0].key);
  const [question, setQuestion] = useState(promptByScene.consultant);
  const [result, setResult] = useState<AgentDraft | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null);
  const [selectedActionTypes, setSelectedActionTypes] = useState<PendingActionType[]>([]);
  const [editedActionDrafts, setEditedActionDrafts] = useState<Record<string, PendingAction["draft"]>>({});
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [message, setMessage] = useState("正在加载客户队列");
  const selectedLead = leads.find((item) => item.id === selectedLeadId) ?? leads[0] ?? null;
  const displayLead = selectedLead
    ? {
        customer_name: selectedLead.customer_name,
        project: selectedLead.source_channel || "客户增长",
        recent: selectedLead.status,
        statusLabel: selectedLead.status,
      }
    : crmPrototypeRows[0];

  useEffect(() => {
    void loadLeads();
  }, []);

  async function loadLeads() {
    setLoadingLeads(true);
    try {
      const data = await apiRequest<LeadItem[]>("/api/leads");
      setLeads(data);
      setMessage(data.find((item) => item.id === selectedLeadId) || data[0] ? "等待顾问输入" : "暂无可研判客户");
    } catch (error) {
      setMessage(error instanceof Error ? `客户队列加载失败：${error.message}` : "客户队列加载失败");
    } finally {
      setLoadingLeads(false);
    }
  }

  function changeScene(nextScene: string) {
    setQuestion(consultantNaturalLanguagePrompts.find((item) => item.key === nextScene)?.label ?? promptByScene.consultant);
  }

  async function sendAgentQuestion() {
    const content = question.trim();
    if (!content) {
      setMessage("请先输入客户研判问题");
      return;
    }
    if (!selectedLead) {
      setMessage(loadingLeads ? "正在加载客户队列，请稍后再发送" : "暂无可研判客户，暂不能发送");
      return;
    }
    setSending(true);
    setConfirmResult(null);
    setMessage("正在生成客户研判建议");
    try {
      const data = await apiRequest<AgentDraft>("/api/consultant-agent/chat", {
        method: "POST",
        body: JSON.stringify({
          lead_id: selectedLead.id,
          message: content,
        }),
      });
      setResult(data);
      setSelectedActionTypes(data.pending_actions.map((item) => item.action_type));
      setEditedActionDrafts(Object.fromEntries(data.pending_actions.map((item) => [item.action_type, { ...item.draft }])));
      setMessage(data.requires_confirmation ? "已生成待确认CRM动作" : "已提供可用研判参考");
    } catch (error) {
      setMessage(error instanceof Error ? `研判助手暂不可用：${error.message}` : "研判助手暂不可用");
    } finally {
      setSending(false);
    }
  }

  async function confirmAgentActions() {
    const confirmableActions = buildConfirmableActions();
    if (!selectedLead || !result?.pending_actions.length) {
      setMessage("暂无可确认的CRM动作");
      return;
    }
    if (!confirmableActions.length) {
      setMessage("请至少选择一个CRM动作");
      return;
    }
    setConfirming(true);
    setMessage("正在写入CRM记录");
    try {
      const data = await apiRequest<ConfirmResult>("/api/consultant-agent/actions/confirm", {
        method: "POST",
        body: JSON.stringify({
          lead_id: selectedLead.id,
          idempotency_key: result.idempotency_key,
          pending_actions: confirmableActions,
        }),
      });
      setConfirmResult(data);
      setMessage(data.idempotent ? "CRM动作已确认过" : "CRM动作已写入");
      await loadLeads();
    } catch (error) {
      setMessage(error instanceof Error ? `CRM写入失败：${error.message}` : "CRM写入失败");
    } finally {
      setConfirming(false);
    }
  }

  function buildConfirmableActions() {
    if (!result) return [];
    return result.pending_actions
      .filter((item) => selectedActionTypes.includes(item.action_type))
      .map((item) => ({
        ...item,
        draft: editedActionDrafts[item.action_type] ?? item.draft,
      }));
  }

  function togglePendingAction(actionType: PendingActionType) {
    setSelectedActionTypes((current) =>
      current.includes(actionType)
        ? current.filter((item) => item !== actionType)
        : [...current, actionType],
    );
  }

  function updatePendingActionDraft(actionType: PendingActionType, field: string, value: string) {
    setEditedActionDrafts((current) => ({
      ...current,
      [actionType]: {
        ...(current[actionType] ?? {}),
        [field]: value,
      },
    }));
  }

  function handleAgentKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendAgentQuestion();
    }
  }

  return (
    <div className="consultant-agent-page">
      <RoleAgentShell
        title="客户研判助手"
        subtitle="直接描述客户目标，助手会读取真实客户上下文并生成可确认CRM动作"
        sceneLabel="客户承接"
        sceneHint="顾问专属"
        sceneTags={consultantNaturalLanguagePrompts}
        activeTag=""
        onTagChange={changeScene}
        question={question}
        onQuestionChange={setQuestion}
        onSend={sendAgentQuestion}
        sending={sending || confirming || loadingLeads || !selectedLead}
        statusLabel={message}
        statusDetail={`最近更新：${formatTime()}`}
        taskTitle="当前客户"
        taskItems={[
          { label: "客户", value: displayLead.customer_name },
          { label: "来源", value: displayLead.project },
          { label: "状态", value: displayLead.statusLabel },
        ]}
        capabilities={capabilities}
        resultTitle={result ? "研判结果" : "等待研判"}
        resultBody={result?.answer ?? "输入客户目标后，助手会读取真实客户资料，生成资料补齐、跟进任务、阶段更新和客户360查看要点。"}
        onQuestionKeyDown={handleAgentKeyDown}
      >
        <div className="role-agent-message user">{question}</div>
        <div className="role-agent-message assistant">
          {result?.answer ?? "你可以直接说想完成的客户承接目标，我会基于当前客户资料生成可确认的CRM动作。"}
          {result?.pending_actions.length ? (
            <div className="role-agent-confirm-box">
              {result.pending_actions.map((item) => (
                <div key={item.action_type}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedActionTypes.includes(item.action_type)}
                      onChange={() => togglePendingAction(item.action_type)}
                    />
                    <strong>{item.label}</strong>
                  </label>
                  {Object.entries(editedActionDrafts[item.action_type] ?? item.draft).map(([field, value]) => (
                    <label key={`${item.action_type}-${field}`}>
                      <span>{draftFieldLabel(field)}</span>
                      <textarea
                        value={String(value ?? "")}
                        onChange={(event) => updatePendingActionDraft(item.action_type, field, event.target.value)}
                        disabled={!selectedActionTypes.includes(item.action_type) || confirming}
                      />
                    </label>
                  ))}
                </div>
              ))}
              <button type="button" onClick={confirmAgentActions} disabled={confirming} aria-label="确认选中动作">
                确认写入CRM
              </button>
            </div>
          ) : null}
          {confirmResult ? (
            <div className="role-agent-confirm-box">
              <strong>写入结果</strong>
              <span>已同步 {confirmResult.results.length} 条CRM记录，可在客户360时间线追踪。</span>
              <button type="button" onClick={() => onNavigate("consultantCustomer360", selectedLead.id)}>
                查看客户360
              </button>
            </div>
          ) : null}
        </div>
      </RoleAgentShell>
    </div>
  );
}
