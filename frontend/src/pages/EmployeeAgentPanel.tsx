import {
  Bot,
  Building2,
  ClipboardCheck,
  FileText,
  Search,
  SendHorizonal,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../api/client";
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
  status: string;
};

type DailyReportVoiceDraft = {
  content: string;
  structured_summary: {
    progress?: string;
    next_action?: string;
  };
  risks: string[];
};

type VoiceDraftResponse<TDraft> = {
  draft: TDraft;
  requires_confirmation: boolean;
  confirmation_endpoint: string;
};

type DailyReport = {
  id: number;
  status: string;
};

type AgentArtifact = {
  title: string;
  state: string;
  tone: "ready" | "working" | "success";
  items: { label: string; value: string }[];
  note: string;
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

const defaultArtifact: AgentArtifact = {
  title: "业务结果待生成",
  state: "等待指令",
  tone: "ready",
  items: [
    { label: "今日完成", value: "说出目标后自动整理" },
    { label: "风险事项", value: "识别材料、投诉、跟进阻塞" },
    { label: "下一步", value: "生成可确认的业务动作" },
  ],
  note: "你可以直接说业务目标，助手会把问题转成可确认、可跳转、可追踪的动作。",
};

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

export default function EmployeeAgentPanel({ onNavigate }: PageProps) {
  const [activeScene, setActiveScene] = useState<AgentScene>("daily");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "你可以直接说业务目标，例如“帮我整理今天日报”“查询学生服务投诉负责人”“客户阶段更新前需要确认什么”。",
    },
  ]);
  const [artifact, setArtifact] = useState<AgentArtifact>(defaultArtifact);
  const [dailyContent, setDailyContent] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, artifact]);

  function applyAssistantAnswer(question: string, answer: string, scene: AgentScene) {
    const sceneCopy = scenes.find((item) => item.key === scene) ?? scenes[0];
    setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
    setArtifact({
      title: `${sceneCopy.label}查询结果`,
      state: "可继续追问",
      tone: "success",
      items: [
        { label: "用户目标", value: question },
        { label: "场景", value: `${sceneCopy.label} · ${sceneCopy.hint}` },
        { label: "处理状态", value: "已返回建议" },
      ],
      note: answer,
    });
  }

  async function sendPrompt(text: string, scene: AgentScene = activeScene) {
    const question = text.trim();
    if (!question || sending) return;

    setActiveScene(scene);
    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setArtifact((current) => ({
      ...current,
      state: "处理中",
      tone: "working",
      note: "正在整理业务结果。",
    }));

    try {
      const data = await apiRequest<KnowledgeChatResult>("/api/knowledge/chat", {
        method: "POST",
        body: JSON.stringify({
          scene: "enterprise_guide",
          question,
        }),
      });
      applyAssistantAnswer(question, data.answer, scene);
    } catch (error) {
      const message = error instanceof Error ? error.message : "请求失败";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `暂时无法完成，请稍后再试。${message}` },
      ]);
      setArtifact((current) => ({
        ...current,
        state: "需要重试",
        tone: "ready",
        note: "当前指令没有完成，可以调整问题后重新发送。",
      }));
    } finally {
      setSending(false);
    }
  }

  async function generateDailyDraft() {
    if (sending) return;

    const transcript = scenes[0].prompt;
    setActiveScene("daily");
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", text: "帮我生成今天的日报草稿。" }]);

    try {
      const data = await apiRequest<VoiceDraftResponse<DailyReportVoiceDraft>>(
        "/api/enterprise-assistant/voice-drafts",
        {
          method: "POST",
          body: JSON.stringify({
            target_type: "daily_report",
            transcript,
            actor_username: "admin",
          }),
        },
      );
      const draft = data.draft;
      const content = draft.content || transcript;
      setDailyContent(content);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "日报草稿已生成，请确认重点、风险和下一步后提交。" },
      ]);
      setArtifact({
        title: "日报草稿已生成",
        state: data.requires_confirmation ? "需要本人确认后提交" : "可继续编辑",
        tone: "success",
        items: [
          { label: "今日完成", value: draft.structured_summary.progress || "申请材料跟进；家长预算确认" },
          { label: "风险事项", value: draft.risks.join("；") || "签证材料缺少资产证明" },
          { label: "明日计划", value: draft.structured_summary.next_action || "补齐证明并同步顾问" },
        ],
        note: content,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "请求失败";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `日报草稿生成失败：${message}` },
      ]);
      setArtifact((current) => ({
        ...current,
        state: "需要重试",
        tone: "ready",
        note: "日报草稿没有生成，可以稍后重试。",
      }));
    } finally {
      setSending(false);
    }
  }

  async function submitDailyReport() {
    if (!dailyContent.trim() || sending) return;

    setSending(true);
    try {
      const data = await apiRequest<DailyReport>("/api/enterprise-assistant/daily-reports", {
        method: "POST",
        body: JSON.stringify({ content: dailyContent, actor_username: "admin" }),
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `日报已提交，记录编号 #${data.id}。` },
      ]);
      setArtifact((current) => ({
        ...current,
        state: "已提交",
        tone: "success",
        note: "日报已经保存，可在员工工作台查看。",
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "请求失败";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `提交日报失败：${message}` },
      ]);
    } finally {
      setSending(false);
    }
  }

  const activeSceneCopy = scenes.find((item) => item.key === activeScene) ?? scenes[0];
  const canSubmitDaily = Boolean(dailyContent.trim()) && !sending;
  const hasArtifact = artifact.title !== defaultArtifact.title;
  const taskSummary = taskSummaries[activeScene];
  const taskStatus = sending ? "处理中" : hasArtifact ? artifact.state : "等待输入";
  const nextAction = sending
    ? "等待结果返回"
    : hasArtifact
      ? activeScene === "daily"
        ? "编辑草稿 / 提交日报 / 进入日报页"
        : "继续追问 / 进入工作台"
      : "选择场景或直接输入问题";
  const resultStatus = hasArtifact ? taskSummary.resultLabel : taskSummary.waitingFor;

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

          <div className="enterprise-agent-quickbar" aria-label="快捷启动">
            <button type="button" className="enterprise-agent-tool-chip primary" onClick={generateDailyDraft}>
              <FileText size={16} aria-hidden="true" />
              生成日报
            </button>
            <button type="button" className="enterprise-agent-tool-chip" onClick={() => void sendPrompt(scenes[1].prompt, "org")}>
              <Building2 size={16} aria-hidden="true" />
              查负责人
            </button>
            <button type="button" className="enterprise-agent-tool-chip" onClick={() => void sendPrompt(scenes[2].prompt, "customer")}>
              <Search size={16} aria-hidden="true" />
              查客户
            </button>
            <button type="button" className="enterprise-agent-tool-chip" onClick={() => void sendPrompt(scenes[3].prompt, "guide")}>
              <UserRound size={16} aria-hidden="true" />
              新人指南
            </button>
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

          {hasArtifact && (
            <article className={`enterprise-agent-artifact ${artifact.tone}`}>
              <div className="enterprise-agent-artifact-head">
                <div>
                  <span>当前结果</span>
                  <h2>{artifact.title}</h2>
                </div>
                <strong>{artifact.state}</strong>
              </div>
              <div className="enterprise-agent-artifact-grid">
                {artifact.items.map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
              <p>{artifact.note}</p>
              <div className="enterprise-agent-artifact-actions">
                <button type="button" onClick={submitDailyReport} disabled={!canSubmitDaily}>
                  <ClipboardCheck size={16} aria-hidden="true" />
                  提交日报
                </button>
                <button type="button" onClick={() => onNavigate("employeeWorkspace")}>
                  <Building2 size={16} aria-hidden="true" />
                  进入工作台
                </button>
              </div>
            </article>
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
              <span>{hasArtifact ? "处理结果" : "需要确认"}</span>
              <strong>{resultStatus}</strong>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
