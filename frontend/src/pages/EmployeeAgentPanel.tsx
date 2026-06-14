import {
  Bot,
  ClipboardCheck,
  SendHorizonal,
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

export default function EmployeeAgentPanel(_props: PageProps) {
  const [activeScene, setActiveScene] = useState<AgentScene>("daily");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "你可以直接说业务目标，例如“帮我整理今天日报”“查询学生服务投诉负责人”“客户阶段更新前需要确认什么”。",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [taskState, setTaskState] = useState<TaskState>("idle");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function applyAssistantAnswer(answer: string) {
    setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
    setTaskState("answered");
  }

  async function sendPrompt(text: string, scene: AgentScene = activeScene) {
    const question = text.trim();
    if (!question || sending) return;

    setActiveScene(scene);
    setInput("");
    setSending(true);
    setTaskState("idle");
    setMessages((prev) => [...prev, { role: "user", text: question }]);

    try {
      const data = await apiRequest<KnowledgeChatResult>("/api/knowledge/chat", {
        method: "POST",
        body: JSON.stringify({
          scene: "enterprise_guide",
          question,
        }),
      });
      applyAssistantAnswer(data.answer);
    } catch (error) {
      const message = error instanceof Error ? error.message : "请求失败";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `暂时无法完成，请稍后再试。${message}` },
      ]);
      setTaskState("error");
    } finally {
      setSending(false);
    }
  }

  const activeSceneCopy = scenes.find((item) => item.key === activeScene) ?? scenes[0];
  const taskSummary = taskSummaries[activeScene];
  const hasAnswer = taskState === "answered";
  const taskStatus = sending ? "处理中" : taskState === "error" ? "需要重试" : hasAnswer ? "已返回建议" : "等待输入";
  const nextAction = sending
    ? "等待结果返回"
    : hasAnswer
      ? "继续追问 / 按建议进入对应业务页"
      : "选择场景或直接输入问题";
  const resultStatus = hasAnswer ? taskSummary.resultLabel : taskSummary.waitingFor;

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
