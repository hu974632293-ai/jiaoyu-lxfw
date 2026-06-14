import {
  Bot,
  ClipboardCheck,
  SendHorizonal,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../api/client";
import { isLoginAccountKey, loginAccounts } from "../authRules";
import type { PageProps } from "../App";

type AgentScene = "daily" | "org" | "customer" | "guide";

type Message = {
  role: "user" | "assistant";
  text: string;
};

type KnowledgeChatResult = {
  id: number;
  scene: string;
  answer: string;
  session_id: number | null;
  messages: SessionMessage[];
  status: string;
  action_type: PendingAction["action_type"] | "answer" | "query_customer_summary" | "query_org_contact" | "query_employee_guide";
  action_status: "suggested" | "waiting_confirmation" | "confirmed" | "synced" | "failed" | "expired";
  requires_confirmation: boolean;
  draft: Record<string, unknown> | null;
  target_type: string;
  target_id: number | null;
  next_step: string;
  business_result: Record<string, unknown>;
  idempotency_key: string;
};

type SessionMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  status: string;
};

type ChatSessionResult = {
  session_id: number | null;
  scene: string;
  channel: string;
  messages: SessionMessage[];
  latest_action?: AgentActionPayload | null;
};

type PendingAction = {
  action_type: "submit_daily_report" | "create_lead" | "update_lead_status";
  label: string;
  description: string;
  idempotency_key: string;
  draft: Record<string, unknown>;
  status: "pending" | "confirmed";
};

type AgentActionResult = {
  action_type: string;
  target_type: string;
  target_id: number;
  idempotent: boolean;
};

type AgentActionPayload = {
  action_type: PendingAction["action_type"] | string;
  action_status: string;
  requires_confirmation: boolean;
  draft: Record<string, unknown> | null;
  target_type: string;
  next_step: string;
  idempotency_key: string;
};

type TaskSummary = {
  taskType: string;
  subject: string;
  related: string;
  waitingFor: string;
  resultLabel: string;
};

const scenes: Array<{
  key: AgentScene;
  label: string;
  shortLabel: string;
  hint: string;
  prompt: string;
}> = [
  {
    key: "daily",
    label: "日报",
    shortLabel: "日",
    hint: "口述转草稿",
    prompt: "今天跟进了王同学申请材料，联系家长确认预算，发现签证材料还缺资产证明。帮我生成日报草稿。",
  },
  {
    key: "org",
    label: "组织",
    shortLabel: "组",
    hint: "按事项找负责人",
    prompt: "学生服务投诉现在谁负责？请给出处理入口和下一步。",
  },
  {
    key: "customer",
    label: "客户",
    shortLabel: "客",
    hint: "查询受控客户信息",
    prompt: "查询本周高潜客户数量，并告诉我需要跟进的重点。",
  },
  {
    key: "guide",
    label: "指南",
    shortLabel: "新",
    hint: "新人制度流程",
    prompt: "新人入职第一周需要完成哪些事项？",
  },
];

const taskSummaries: Record<AgentScene, TaskSummary> = {
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

type TaskState = "idle" | "answered" | "error";

const sceneKeys: AgentScene[] = ["daily", "org", "customer", "guide"];
const sceneToKnowledgeScene: Record<AgentScene, string> = {
  daily: "enterprise_daily",
  org: "enterprise_org",
  customer: "enterprise_customer",
  guide: "enterprise_guide",
};

function sceneIntro(scene: AgentScene): Message[] {
  const copy = scenes.find((item) => item.key === scene) ?? scenes[0];
  return [
    {
      role: "assistant",
      text: `这里是${copy.label}场景。你可以直接说业务目标，助手会先给出建议；涉及写入时会等你确认后再同步。`,
    },
  ];
}

function initialMessagesByScene(): Record<AgentScene, Message[]> {
  return sceneKeys.reduce(
    (result, scene) => ({ ...result, [scene]: sceneIntro(scene) }),
    {} as Record<AgentScene, Message[]>,
  );
}

function mapSessionMessages(items: SessionMessage[]): Message[] {
  return items.map((item) => ({
    role: item.role,
    text: item.content,
  }));
}

function currentActorUsername() {
  if (typeof window === "undefined") return "employee";
  const account = new URLSearchParams(window.location.search).get("account");
  return isLoginAccountKey(account) ? loginAccounts[account].username : "employee";
}

function buildPendingAction(data: AgentActionPayload): PendingAction | null {
  if (!data.requires_confirmation || !data.draft || !data.idempotency_key) return null;
  if (!["submit_daily_report", "create_lead", "update_lead_status"].includes(data.action_type)) return null;
  const copy: Record<PendingAction["action_type"], { label: string; description: string }> = {
    submit_daily_report: {
      label: "确认提交日报",
      description: data.next_step || "确认后同步到员工日报和管理者日报汇总。",
    },
    create_lead: {
      label: "确认保存客户",
      description: data.next_step || "确认后同步到客户增长和客户 360。",
    },
    update_lead_status: {
      label: "确认更新状态",
      description: data.next_step || "确认后同步到客户列表、客户 360 和阶段记录。",
    },
  };
  const actionType = data.action_type as PendingAction["action_type"];
  return {
    action_type: actionType,
    label: copy[actionType].label,
    description: copy[actionType].description,
    idempotency_key: data.idempotency_key,
    draft: data.draft,
    status: data.action_status === "confirmed" || data.action_status === "synced" ? "confirmed" : "pending",
  };
}

export default function EmployeeAgentPanel(_props: PageProps) {
  const [activeScene, setActiveScene] = useState<AgentScene>("daily");
  const [messagesByScene, setMessagesByScene] = useState<Record<AgentScene, Message[]>>(initialMessagesByScene);
  const [sessionIds, setSessionIds] = useState<Partial<Record<AgentScene, number>>>({});
  const [pendingActions, setPendingActions] = useState<Partial<Record<AgentScene, PendingAction>>>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [taskState, setTaskState] = useState<TaskState>("idle");
  const [lastResults, setLastResults] = useState<Partial<Record<AgentScene, KnowledgeChatResult>>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const messages = messagesByScene[activeScene] ?? sceneIntro(activeScene);
  const pendingAction = pendingActions[activeScene];
  const actorUsername = currentActorUsername();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    void loadSceneSession(activeScene);
  }, [activeScene]);

  function setSceneMessages(scene: AgentScene, updater: (current: Message[]) => Message[]) {
    setMessagesByScene((current) => ({
      ...current,
      [scene]: updater(current[scene] ?? sceneIntro(scene)),
    }));
  }

  async function loadSceneSession(scene: AgentScene) {
    setLoadingSession(true);
    const params = new URLSearchParams({
      scene: sceneToKnowledgeScene[scene],
      channel: "employee_agent",
      actor_username: actorUsername,
    });
    try {
      const data = await apiRequest<ChatSessionResult>(`/api/knowledge/sessions/latest?${params.toString()}`);
      setSessionIds((current) => ({ ...current, [scene]: data.session_id ?? undefined }));
      setSceneMessages(scene, () => (data.messages.length ? mapSessionMessages(data.messages) : sceneIntro(scene)));
      setPendingActions((current) => ({ ...current, [scene]: data.latest_action ? buildPendingAction(data.latest_action) ?? undefined : undefined }));
      setTaskState(data.messages.length ? "answered" : "idle");
    } catch {
      setSceneMessages(scene, () => sceneIntro(scene));
    } finally {
      setLoadingSession(false);
    }
  }

  function applyAssistantAnswer(scene: AgentScene, answer: string, nextAction: PendingAction | null) {
    setSceneMessages(scene, (prev) => [...prev, { role: "assistant", text: answer }]);
    setPendingActions((current) => ({ ...current, [scene]: nextAction ?? undefined }));
    setTaskState("answered");
  }

  async function sendPrompt(text: string, scene: AgentScene = activeScene) {
    const question = text.trim();
    if (!question || sending) return;

    setActiveScene(scene);
    setInput("");
    setSending(true);
    setTaskState("idle");
    setPendingActions((current) => ({ ...current, [scene]: undefined }));
    setSceneMessages(scene, (prev) => [...prev, { role: "user", text: question }]);

    try {
      const data = await apiRequest<KnowledgeChatResult>("/api/knowledge/chat", {
        method: "POST",
        body: JSON.stringify({
          scene: sceneToKnowledgeScene[scene],
          role: "employee",
          actor_username: actorUsername,
          channel: "employee_agent",
          session_id: sessionIds[scene],
          question,
          business_context: { agent_scene: scene },
          action_mode: "draft",
        }),
      });
      if (data.session_id) {
        setSessionIds((current) => ({ ...current, [scene]: data.session_id ?? undefined }));
      }
      setLastResults((current) => ({ ...current, [scene]: data }));
      const nextPendingAction = buildPendingAction(data);
      if (data.messages?.length) {
        setSceneMessages(scene, () => mapSessionMessages(data.messages));
        setPendingActions((current) => ({ ...current, [scene]: nextPendingAction ?? undefined }));
        setTaskState(data.action_status === "failed" ? "error" : "answered");
      } else {
        applyAssistantAnswer(scene, data.answer, nextPendingAction);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "请求失败";
      setSceneMessages(scene, (prev) => [
        ...prev,
        { role: "assistant", text: `暂时无法完成，请稍后再试。${message}` },
      ]);
      setTaskState("error");
    } finally {
      setSending(false);
    }
  }

  async function confirmAgentAction() {
    if (!pendingAction || pendingAction.status === "confirmed" || sending) return;
    setSending(true);
    try {
      const data = await apiRequest<AgentActionResult>("/api/enterprise-assistant/actions/confirm", {
        method: "POST",
        body: JSON.stringify({
          action_type: pendingAction.action_type,
          actor_username: actorUsername,
          idempotency_key: pendingAction.idempotency_key,
          draft: pendingAction.draft,
          session_id: sessionIds[activeScene],
        }),
      });
      setPendingActions((current) => ({
        ...current,
        [activeScene]: { ...pendingAction, status: "confirmed" },
      }));
      setSceneMessages(activeScene, (prev) => [
        ...prev,
        { role: "assistant", text: `已同步到业务记录，编号 #${data.target_id}。` },
      ]);
      setTaskState("answered");
    } catch (error) {
      const message = error instanceof Error ? error.message : "请求失败";
      setSceneMessages(activeScene, (prev) => [...prev, { role: "assistant", text: `确认失败：${message}` }]);
      setTaskState("error");
    } finally {
      setSending(false);
    }
  }

  const activeSceneCopy = scenes.find((item) => item.key === activeScene) ?? scenes[0];
  const taskSummary = taskSummaries[activeScene];
  const activeResult = lastResults[activeScene];
  const hasAnswer = taskState === "answered";
  const resultActionStatus = activeResult?.action_status;
  const taskStatus = sending
    ? "处理中"
    : loadingSession
      ? "恢复会话中"
      : taskState === "error" || resultActionStatus === "failed"
        ? "需要重试"
        : pendingAction?.status === "pending"
          ? "等待确认"
          : pendingAction?.status === "confirmed" || resultActionStatus === "synced"
            ? "已同步"
            : hasAnswer
              ? "已返回建议"
              : "等待输入";
  const nextAction = sending
    ? "等待结果返回"
    : pendingAction?.status === "pending"
      ? "确认后同步业务记录"
      : pendingAction?.status === "confirmed"
        ? "已同步，可继续追问"
      : activeResult?.next_step
        ? activeResult.next_step
    : hasAnswer
      ? "继续追问 / 按建议进入对应业务页"
      : "选择场景或直接输入问题";
  const hasBusinessResult = Boolean(activeResult?.business_result && Object.keys(activeResult.business_result).length);
  const resultStatus = pendingAction?.status === "pending"
    ? "待你确认"
    : hasBusinessResult
      ? taskSummary.resultLabel
      : hasAnswer
        ? "已回复"
        : taskSummary.waitingFor;

  return (
    <div className="enterprise-agent-shell">
      <header className="enterprise-agent-header">
        <div className="enterprise-agent-title">
          <span className="enterprise-agent-mark">
            <Bot size={22} aria-hidden="true" />
          </span>
          <div>
            <h1>企业助手</h1>
            <p>把员工问题转成可确认、可跳转、可追踪的业务动作</p>
          </div>
        </div>
        <div className="enterprise-agent-tabs" aria-label="企业助手场景">
          {scenes.map((scene) => (
            <button
              key={scene.key}
              className={scene.key === activeScene ? "active" : ""}
              type="button"
              onClick={() => {
                setActiveScene(scene.key);
                setInput(scene.prompt);
                setTaskState("idle");
              }}
            >
              {scene.label}
            </button>
          ))}
        </div>
      </header>

      <div className="enterprise-agent-main">
        <section className="enterprise-agent-conversation" aria-label="企业助手对话">
          <div className="enterprise-agent-scene-line">
            <span>{activeSceneCopy.shortLabel}</span>
            <strong>{activeSceneCopy.label}</strong>
            <em>{activeSceneCopy.hint}</em>
          </div>

          <div className="enterprise-agent-dialog">
            {messages.map((msg, index) => (
              <div key={`${msg.role}-${index}`} className={`enterprise-agent-message ${msg.role}`}>
                {msg.text}
              </div>
            ))}
            {sending && <div className="enterprise-agent-message assistant">正在处理...</div>}
            <div ref={bottomRef} />
          </div>

          {pendingAction && (
            <div className={`enterprise-agent-action-strip ${pendingAction.status}`}>
              <div>
                <strong>{pendingAction.label}</strong>
                <span>{pendingAction.description}</span>
              </div>
              <button type="button" onClick={confirmAgentAction} disabled={sending || pendingAction.status === "confirmed"}>
                {pendingAction.status === "confirmed" ? "已同步" : "确认同步"}
              </button>
            </div>
          )}

          <form
            className="enterprise-agent-input"
            onSubmit={(event) => {
              event.preventDefault();
              void sendPrompt(input);
            }}
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="直接输入业务目标，例如：帮我整理今天日报，或查询投诉负责人。"
              disabled={sending}
            />
            <button type="submit" disabled={sending || !input.trim()} aria-label="发送企业助手指令">
              <SendHorizonal size={18} aria-hidden="true" />
            </button>
          </form>
        </section>

        <aside className="enterprise-agent-execution" aria-label="当前任务">
          <div className="enterprise-panel-heading">
            <div>
              <h2>当前任务</h2>
              <span>处理状态</span>
            </div>
            <ClipboardCheck size={18} aria-hidden="true" />
          </div>
          <div className="enterprise-agent-task-card">
            <div>
              <span>任务类型</span>
              <strong>{taskSummary.taskType}</strong>
            </div>
            <div>
              <span>处理状态</span>
              <strong>{taskStatus}</strong>
            </div>
            <div>
              <span>下一步</span>
              <strong>{nextAction}</strong>
            </div>
          </div>
          <div className="enterprise-agent-context">
            <h3>本次事项</h3>
            <div>
              <span>正在处理</span>
              <strong>{taskSummary.subject}</strong>
            </div>
            <div>
              <span>关联内容</span>
              <strong>{taskSummary.related}</strong>
            </div>
            <div>
              <span>{hasAnswer ? "处理结果" : "需要确认"}</span>
              <strong>{resultStatus}</strong>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
