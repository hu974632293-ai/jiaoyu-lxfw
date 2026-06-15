import { useState, type KeyboardEvent } from "react";
import { apiRequest } from "../api/client";
import { crmPrototypeRows } from "../data/prototype";
import { RoleAgentShell } from "./roleAgentShell";

type AgentResult = {
  answer: string;
  status: string;
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
  { title: "资料补齐", detail: "识别背景、预算、目标国家和联系方式缺口" },
  { title: "画像研判", detail: "生成客户意向、风险和高潜依据" },
  { title: "项目推荐", detail: "解释项目匹配理由和优先方案" },
  { title: "跟进建议", detail: "给出下一次沟通话术和触达时机" },
  { title: "任务创建", detail: "整理可确认的跟进任务草稿" },
  { title: "阶段更新", detail: "提示线索阶段变化和更新原因" },
  { title: "客户360", detail: "汇总画像、跟进、活动和推荐记录入口" },
];

function formatTime() {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date());
}

export default function ConsultantAgentPage() {
  const [activeScene, setActiveScene] = useState(scenes[0].key);
  const [question, setQuestion] = useState(promptByScene.profile);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("等待顾问输入");
  const lead = crmPrototypeRows[0];

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
    setSending(true);
    setMessage("正在生成客户研判建议");
    try {
      const data = await apiRequest<AgentResult>("/api/knowledge/chat", {
        method: "POST",
        body: JSON.stringify({
          scene: "customer_assessment",
          question: `${content} 当前客户：${lead.customer_name}，${lead.project}，${lead.recent}`,
          lead_id: lead.id,
          actor_username: "advisor",
          business_context: { customer_name: lead.customer_name, status: lead.statusLabel, project: lead.project },
        }),
      });
      setResult(data);
      setMessage(data.status === "success" ? "研判建议已返回" : "已提供可用研判参考");
    } catch (error) {
      setMessage(error instanceof Error ? `研判助手暂不可用：${error.message}` : "研判助手暂不可用");
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
        sending={sending}
        statusLabel={message}
        statusDetail={`最近更新：${formatTime()}`}
        taskTitle="当前客户"
        taskItems={[
          { label: "客户", value: lead.customer_name },
          { label: "项目", value: lead.project },
          { label: "状态", value: lead.statusLabel },
          { label: "跟进", value: lead.nextTask },
        ]}
        capabilities={capabilities}
        resultTitle={result ? "研判结果" : "等待研判"}
        resultBody={result?.answer ?? "输入客户目标后，助手会返回资料缺口、画像研判、项目推荐、跟进建议、任务创建、阶段更新和客户360查看要点。"}
        onQuestionKeyDown={handleAgentKeyDown}
      >
        <div className="role-agent-message user">{question}</div>
        <div className="role-agent-message assistant">
          {result?.answer ?? "我会基于当前客户资料生成资料补齐、画像研判、项目推荐、跟进建议、任务创建、阶段更新和客户360查看要点。"}
        </div>
      </RoleAgentShell>
    </div>
  );
}
