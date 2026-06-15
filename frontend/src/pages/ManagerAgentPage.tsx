import { useState, type KeyboardEvent } from "react";
import { apiRequest } from "../api/client";
import { reportTypes } from "../data/prototype";
import { RoleAgentShell } from "./roleAgentShell";

type AgentResult = {
  answer: string;
  status: string;
};

const scenes = [
  { key: "growth", label: "增长总览" },
  { key: "customer", label: "客户经营报告" },
  { key: "daily", label: "员工日报汇总" },
  { key: "psych", label: "学生心理健康周报" },
  { key: "feedback", label: "投诉处理周报" },
  { key: "risk", label: "风险队列" },
];

const promptByScene: Record<string, string> = {
  growth: "请解释本期增长总览变化，并定位需要管理者关注的指标。",
  customer: "请解释客户经营报告中的变化，并定位待跟进对象。",
  daily: "请汇总今天团队日报中的重点和风险。",
  psych: "请解释学生心理健康周报，并列出需要持续观察的对象。",
  feedback: "请解释投诉处理周报，并定位未决工单和处理风险。",
  risk: "请梳理风险队列中的经营和服务风险，并给出处理建议。",
};

const capabilities = [
  { title: "增长总览", detail: "解释线索和转化" },
  { title: "客户经营", detail: "定位高潜和缺口" },
  { title: "日报汇总", detail: "提炼进展和风险" },
  { title: "心理周报", detail: "汇总风险和要求" },
  { title: "投诉周报", detail: "解释分类和时效" },
  { title: "风险队列", detail: "聚合高优先级风险" },
];

function formatTime() {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date());
}

export default function ManagerAgentPage() {
  const [activeScene, setActiveScene] = useState(scenes[0].key);
  const [question, setQuestion] = useState(promptByScene.growth);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("等待管理者输入");
  const reportType = reportTypes[0];

  function changeScene(nextScene: string) {
    setActiveScene(nextScene);
    setQuestion(promptByScene[nextScene]);
  }

  async function sendAgentQuestion() {
    const content = question.trim();
    if (!content) {
      setMessage("请先输入报告解释问题");
      return;
    }
    setSending(true);
    setMessage("正在解释报告变化");
    try {
      const data = await apiRequest<AgentResult>("/api/knowledge/chat", {
        method: "POST",
        body: JSON.stringify({
          scene: "report_assistant",
          question: `${content} 当前报告类型：${reportType.title}`,
          actor_username: "manager",
          business_context: { report_type: reportType.key, title: reportType.title },
        }),
      });
      setResult(data);
      setMessage(data.status === "success" ? "报告解释已返回" : "已返回可用报告解释");
    } catch (error) {
      setMessage(error instanceof Error ? `报告助手暂不可用：${error.message}` : "报告助手暂不可用");
    } finally {
      setSending(false);
    }
  }

  function handleAgentKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendAgentQuestion();
    }
  }

  return (
    <div className="manager-agent-page">
      <RoleAgentShell
        title="报告解释助手"
        subtitle="围绕增长总览、客户经营报告、日报汇总、心理周报、投诉周报和风险队列解释变化"
        sceneLabel={scenes.find((item) => item.key === activeScene)?.label ?? "增长总览"}
        sceneHint="管理者专属"
        sceneTags={scenes}
        activeTag={activeScene}
        onTagChange={changeScene}
        question={question}
        onQuestionChange={setQuestion}
        onSend={sendAgentQuestion}
        sending={sending}
        statusLabel={message}
        statusDetail={`最近更新：${formatTime()}`}
        taskTitle="当前报告"
        taskItems={[
          { label: "报告", value: reportType.title },
          { label: "场景", value: scenes.find((item) => item.key === activeScene)?.label ?? "增长总览" },
          { label: "状态", value: "待解释" },
        ]}
        capabilities={capabilities}
        resultTitle={result ? "解释结果" : "等待解释"}
        resultBody={result?.answer ?? "输入报告解释问题后，助手会给出增长总览、客户经营报告、员工日报汇总、学生心理健康周报、投诉处理周报和风险队列的变化说明。"}
        onQuestionKeyDown={handleAgentKeyDown}
      >
        <div className="role-agent-message user">{question}</div>
        <div className="role-agent-message assistant">
          {result?.answer ?? "我会围绕增长总览、客户经营报告、员工日报汇总、学生心理健康周报、投诉处理周报和风险队列给出可执行的解释建议。"}
        </div>
      </RoleAgentShell>
    </div>
  );
}
