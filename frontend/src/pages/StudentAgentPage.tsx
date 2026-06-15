import { useState, type KeyboardEvent } from "react";
import { apiRequest } from "../api/client";
import { studentRows } from "../data/prototype";
import { RoleAgentShell } from "./roleAgentShell";

type AgentResult = {
  answer: string;
  status: string;
};

const scenes = [
  { key: "leave", label: "提交请假" },
  { key: "feedback", label: "提交反馈" },
  { key: "progress", label: "申请进度" },
  { key: "exam", label: "学业考务" },
  { key: "support", label: "生活支持" },
  { key: "care", label: "心理倾诉" },
];

const promptByScene: Record<string, string> = {
  leave: "我想请假两天，请帮我整理给老师的说明。",
  feedback: "我想提交一条反馈建议，请帮我整理内容。",
  progress: "请帮我查询申请进度，并解释下一步需要准备什么。",
  exam: "请帮我查看学业考务节点和本周提醒。",
  support: "我想咨询住宿和行前准备，请给我建议。",
  care: "我最近压力比较大，请帮我整理可以向老师表达的内容。",
};

const capabilities = [
  { title: "提交请假", detail: "整理原因和时间" },
  { title: "提交反馈", detail: "整理建议和说明" },
  { title: "申请进度", detail: "解释阶段和准备项" },
  { title: "学业考务", detail: "查看考试和截止点" },
  { title: "生活支持", detail: "回答住宿和行前问题" },
  { title: "心理倾诉", detail: "整理求助表达" },
];

function formatTime() {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date());
}

export default function StudentAgentPage() {
  const [activeScene, setActiveScene] = useState(scenes[0].key);
  const [question, setQuestion] = useState(promptByScene.leave);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("等待学生输入");
  const student = studentRows[0];

  function changeScene(nextScene: string) {
    setActiveScene(nextScene);
    setQuestion(promptByScene[nextScene]);
  }

  async function sendAgentQuestion() {
    const content = question.trim();
    if (!content) {
      setMessage("请先输入学生问题");
      return;
    }
    setSending(true);
    setMessage("正在整理学生服务建议");
    try {
      const data = await apiRequest<AgentResult>("/api/student-assistant/chat", {
        method: "POST",
        body: JSON.stringify({ student_id: student.id, message: content, actor_username: "student" }),
      });
      setResult(data);
      setMessage(data.status === "success" ? "服务建议已返回" : "已返回可用服务建议");
    } catch (error) {
      setMessage(error instanceof Error ? `学生助手暂不可用：${error.message}` : "学生助手暂不可用");
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
    <div className="student-agent-page">
      <RoleAgentShell
        title="学生服务助手"
        subtitle="围绕提交请假、提交反馈、申请进度、学业考务、生活支持和心理倾诉生成可提交建议"
        sceneLabel={scenes.find((item) => item.key === activeScene)?.label ?? "提交请假"}
        sceneHint="学生专属"
        sceneTags={scenes}
        activeTag={activeScene}
        onTagChange={changeScene}
        question={question}
        onQuestionChange={setQuestion}
        onSend={sendAgentQuestion}
        sending={sending}
        statusLabel={message}
        statusDetail={`最近更新：${formatTime()}`}
        taskTitle="当前学生"
        taskItems={[
          { label: "学生", value: student.name },
          { label: "项目", value: student.project },
          { label: "状态", value: student.status },
        ]}
        capabilities={capabilities}
        resultTitle={result ? "服务建议" : "等待服务建议"}
        resultBody={result?.answer ?? "输入学生问题后，助手会给出提交请假、提交反馈、申请进度、学业考务、生活支持和心理倾诉建议。"}
        onQuestionKeyDown={handleAgentKeyDown}
      >
        <div className="role-agent-message user">{question}</div>
        <div className="role-agent-message assistant">
          {result?.answer ?? "我会围绕提交请假、提交反馈、申请进度、学业考务、生活支持和心理倾诉给出可提交建议。"}
        </div>
      </RoleAgentShell>
    </div>
  );
}
