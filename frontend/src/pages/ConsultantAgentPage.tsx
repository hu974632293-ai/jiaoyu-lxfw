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
  { key: "profile", label: "资料补齐" },
  { key: "assessment", label: "画像研判" },
  { key: "recommendation", label: "项目推荐" },
  { key: "followup", label: "跟进建议" },
  { key: "task", label: "任务创建" },
  { key: "stage", label: "阶段更新" },
  { key: "customer360", label: "客户360" },
];

const promptByScene: Record<string, string> = {
  profile: "请检查当前客户资料缺口，并列出需要补齐的问题。",
  assessment: "请基于当前客户资料补齐画像研判依据。",
  recommendation: "请给出项目匹配理由和优先推荐方案。",
  followup: "请生成下一步跟进建议和任务提醒。",
  task: "请把下一步跟进建议整理成顾问待办任务草稿。",
  stage: "请判断当前客户阶段是否需要更新，并说明依据。",
  customer360: "请汇总客户360中需要顾问优先查看的信息。",
};

const capabilities = [
  { title: "资料补齐", detail: "补背景、预算和目标" },
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

export default function ConsultantAgentPage({ selectedLeadId, onNavigate }: ConsultantAgentPageProps) {
  const [activeScene, setActiveScene] = useState(scenes[0].key);
  const [question, setQuestion] = useState(promptByScene.profile);
  const [result, setResult] = useState<AgentDraft | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null);
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
    setActiveScene(nextScene);
    setQuestion(promptByScene[nextScene]);
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
      setMessage(data.requires_confirmation ? "已生成待确认CRM动作" : "已提供可用研判参考");
    } catch (error) {
      setMessage(error instanceof Error ? `研判助手暂不可用：${error.message}` : "研判助手暂不可用");
    } finally {
      setSending(false);
    }
  }

  async function confirmAgentActions() {
    if (!selectedLead || !result?.pending_actions.length) {
      setMessage("暂无可确认的CRM动作");
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
          pending_actions: result.pending_actions,
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
        subtitle="围绕资料补齐、画像研判、项目推荐、跟进任务和客户360生成可确认建议"
        sceneLabel={scenes.find((item) => item.key === activeScene)?.label ?? "资料补齐"}
        sceneHint="顾问专属"
        sceneTags={scenes}
        activeTag={activeScene}
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
        resultBody={result?.answer ?? "输入客户目标后，助手会返回资料缺口、画像研判、项目推荐、跟进建议、任务创建、阶段更新和客户360查看要点。"}
        onQuestionKeyDown={handleAgentKeyDown}
      >
        <div className="role-agent-message user">{question}</div>
        <div className="role-agent-message assistant">
          {result?.answer ?? "我会基于当前客户资料生成资料补齐、画像研判、项目推荐、跟进建议、任务创建、阶段更新和客户360查看要点。"}
          {result?.pending_actions.length ? (
            <div className="role-agent-confirm-box">
              {result.pending_actions.map((item) => (
                <div key={item.action_type}>
                  <strong>{item.label}</strong>
                  <span>{String(item.draft.content || item.draft.title || item.draft.status || "")}</span>
                </div>
              ))}
              <button type="button" onClick={confirmAgentActions} disabled={confirming}>
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
