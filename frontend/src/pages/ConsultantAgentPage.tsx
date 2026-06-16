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

type AgentOrchestration = {
  mode: string;
  role: string;
  intent: string;
  target: { type: string; id: number | null };
  context_sources: string[];
  requires_confirmation: boolean;
  business_tools: Array<{ tool: PendingActionType | string; execution: string }>;
  next_step: string;
};

type CandidateLead = {
  id: number;
  customer_name: string;
  contact_info?: string;
  status: string;
  source_channel?: string;
  recent_timeline?: string[];
  open_task_count?: number;
};

type AgentDraft = {
  answer: string;
  intent: string;
  idempotency_key: string;
  requires_confirmation: boolean;
  requires_more_info: boolean;
  confirmation_endpoint: string;
  follow_up_questions: string[];
  lead_context: {
    id: number;
    customer_name: string;
    status: string;
    source_channel?: string;
    conversation_context?: string[];
  } | null;
  candidate_leads?: CandidateLead[];
  orchestration: AgentOrchestration;
  pending_actions: PendingAction[];
};

type ConfirmResult = {
  lead_id: number;
  results: Array<{ action_type: string; target_type: string; target_id: number }>;
  idempotent: boolean;
};

type AgentMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  draft?: AgentDraft;
  confirmResult?: ConfirmResult;
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
  { key: "queue", label: "官网今天来的线索有哪些？我应该先处理谁？" },
  { key: "todo", label: "我今天有哪些客户待办需要优先处理？" },
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

function contextSourceLabel(source: string) {
  const labels: Record<string, string> = {
    crm_lead: "客户资料",
    crm_timeline: "客户时间线",
    conversation_context: "连续对话",
  };
  return labels[source] ?? source;
}

function businessToolLabel(tool: string) {
  const labels: Record<string, string> = {
    create_follow_up: "新增跟进",
    create_task: "创建任务",
    update_lead_status: "更新阶段",
  };
  return labels[tool] ?? tool;
}

export default function ConsultantAgentPage({ selectedLeadId, onNavigate }: ConsultantAgentPageProps) {
  const [activeScene, setActiveScene] = useState(scenes[0].key);
  const [question, setQuestion] = useState(promptByScene.consultant);
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: "consultant-agent-welcome",
      role: "assistant",
      content: "未选客户也可以直接询问官网新线索、今日待办或客户姓名；我会先帮你找到对象，再继续推进CRM动作。",
    },
  ]);
  const [result, setResult] = useState<AgentDraft | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null);
  const [selectedActionTypes, setSelectedActionTypes] = useState<PendingActionType[]>([]);
  const [editedActionDrafts, setEditedActionDrafts] = useState<Record<string, PendingAction["draft"]>>({});
  const [conversationContext, setConversationContext] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [message, setMessage] = useState("正在加载客户队列");
  const selectedLead = selectedLeadId ? leads.find((item) => item.id === selectedLeadId) ?? null : null;
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
    if (loadingLeads) {
      setMessage("正在加载客户队列，请稍后再发送");
      return;
    }
    setSending(true);
    setConfirmResult(null);
    setMessage("正在生成客户研判建议");
    setMessages((current) => [...current, appendUserMessage(content)]);
    try {
      const data = await apiRequest<AgentDraft>("/api/consultant-agent/chat", {
        method: "POST",
        body: JSON.stringify({
          ...(selectedLead ? { lead_id: selectedLead.id } : {}),
          message: content,
          conversation_context: conversationContext,
        }),
      });
      setResult(data);
      setSelectedActionTypes(data.pending_actions.map((item) => item.action_type));
      setEditedActionDrafts(Object.fromEntries(data.pending_actions.map((item) => [item.action_type, { ...item.draft }])));
      setMessages((current) => [...current, appendAssistantMessage(data)]);
      setConversationContext((current) =>
        [
          ...current,
          `顾问输入：${content}`,
          ...(data.follow_up_questions?.length ? [`助手追问：${data.follow_up_questions.join("；")}`] : []),
        ].slice(-6),
      );
      setQuestion("");
      setMessage(
        data.candidate_leads?.length
          ? "已找到候选客户"
          : data.requires_more_info
            ? "需要补充客户信息"
            : data.requires_confirmation
              ? "已生成待确认CRM动作"
              : "已提供可用研判参考",
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? `研判助手暂不可用：${error.message}` : "研判助手暂不可用";
      setMessages((current) => [...current, appendErrorMessage(errorMessage)]);
      setMessage(errorMessage);
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
      setMessages((current) => [...current, appendConfirmResultMessage(data)]);
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

  function appendUserMessage(content: string): AgentMessage {
    return { id: `user-${Date.now()}`, role: "user", content };
  }

  function appendAssistantMessage(draft: AgentDraft): AgentMessage {
    return {
      id: `assistant-${draft.idempotency_key}`,
      role: "assistant",
      content: draft.answer,
      draft,
    };
  }

  function appendErrorMessage(content: string): AgentMessage {
    return { id: `assistant-error-${Date.now()}`, role: "assistant", content };
  }

  function appendConfirmResultMessage(data: ConfirmResult): AgentMessage {
    return {
      id: `assistant-confirm-${data.lead_id}-${Date.now()}`,
      role: "assistant",
      content: data.idempotent ? "这组CRM动作此前已经确认过。" : "已写入CRM，可在客户360时间线追踪。",
      confirmResult: data,
    };
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

  function selectCandidateLead(leadId: number) {
    onNavigate("consultantCustomer360", leadId);
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
        sending={sending || confirming || loadingLeads}
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
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`enterprise-agent-message role-agent-message ${msg.role}`}
          >
            {msg.content}
            {msg.draft?.candidate_leads?.length ? (
              <div className="role-agent-confirm-box role-agent-candidate-list" aria-label="顾问助手候选客户">
                <strong>候选客户</strong>
                {msg.draft.candidate_leads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    className="role-agent-candidate-card"
                    onClick={() => selectCandidateLead(lead.id)}
                  >
                    <span>{lead.customer_name}</span>
                    <small>
                      {lead.source_channel || "客户增长"} · {lead.status} · 待办{lead.open_task_count ?? 0}项
                    </small>
                    {lead.recent_timeline?.length ? <em>{lead.recent_timeline.join("、")}</em> : null}
                  </button>
                ))}
              </div>
            ) : null}
            {msg.draft?.orchestration && !msg.draft.pending_actions.length ? (
            <div className="role-agent-confirm-box" aria-label="顾问助手编排状态">
              <strong>{msg.draft.orchestration.mode === "ask_more_info" ? "需要补充信息" : "等待确认写入"}</strong>
              <span>
                已读取上下文：
                {msg.draft.orchestration.context_sources.map(contextSourceLabel).join("、") || "当前客户"}
              </span>
              <span>
                识别动作：
                {msg.draft.orchestration.business_tools.map((item) => businessToolLabel(item.tool)).join("、") ||
                  "暂不生成写库动作"}
              </span>
              <span>
                确认后写入：
                {msg.draft.orchestration.business_tools.length ? "选中的CRM动作" : "不会写入CRM，仅补充信息"}
              </span>
            </div>
          ) : null}
            {msg.draft?.pending_actions.length && msg.draft.idempotency_key === result?.idempotency_key ? (
            <div className="role-agent-confirm-box role-agent-action-card">
              <strong>待确认动作</strong>
              <span>
                已读取：{msg.draft.orchestration.context_sources.map(contextSourceLabel).join("、")}；识别：
                {msg.draft.orchestration.business_tools.map((item) => businessToolLabel(item.tool)).join("、")}
              </span>
              {msg.draft.pending_actions.map((item) => (
                <div key={item.action_type}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedActionTypes.includes(item.action_type)}
                      onChange={() => togglePendingAction(item.action_type)}
                    />
                    <strong>{item.label}</strong>
                  </label>
                  <details>
                    <summary>查看并修改草稿</summary>
                    <div className="role-agent-draft-grid">
                      {Object.entries(editedActionDrafts[item.action_type] ?? item.draft).map(([field, value]) => (
                        <label key={`${item.action_type}-${field}`}>
                          <span>{draftFieldLabel(field)}</span>
                          {field === "content" || field === "next_action" || field === "reason" ? (
                            <textarea
                              value={String(value ?? "")}
                              onChange={(event) => updatePendingActionDraft(item.action_type, field, event.target.value)}
                              disabled={!selectedActionTypes.includes(item.action_type) || confirming}
                            />
                          ) : (
                            <input
                              value={String(value ?? "")}
                              onChange={(event) => updatePendingActionDraft(item.action_type, field, event.target.value)}
                              disabled={!selectedActionTypes.includes(item.action_type) || confirming}
                            />
                          )}
                        </label>
                      ))}
                    </div>
                  </details>
                </div>
              ))}
              <button type="button" onClick={confirmAgentActions} disabled={confirming} aria-label="确认选中动作">
                确认写入CRM
              </button>
            </div>
          ) : null}
            {msg.draft?.requires_more_info && msg.draft.follow_up_questions.length ? (
            <div className="role-agent-confirm-box">
              <strong>需要补充信息</strong>
              {msg.draft.follow_up_questions.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          ) : null}
            {msg.confirmResult ? (
            <div className="role-agent-confirm-box">
              <strong>写入结果</strong>
              <span>已同步 {msg.confirmResult.results.length} 条CRM记录，可在客户360时间线追踪。</span>
              <button type="button" onClick={() => onNavigate("consultantCustomer360", msg.confirmResult?.lead_id)}>
                查看客户360
              </button>
            </div>
          ) : null}
          </div>
        ))}
        {sending ? <div className="enterprise-agent-message role-agent-message assistant">正在处理...</div> : null}
      </RoleAgentShell>
    </div>
  );
}
