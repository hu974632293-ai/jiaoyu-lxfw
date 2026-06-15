import { useState, type KeyboardEvent } from "react";
import { apiRequest } from "../api/client";
import { studentRows } from "../data/prototype";
import { RoleAgentShell } from "./roleAgentShell";

type AgentResult = {
  answer: string;
  status: string;
};

const scenes = [
  { key: "leave", label: "请假审批" },
  { key: "feedback", label: "反馈处理" },
  { key: "psych", label: "心理预警" },
  { key: "academic", label: "学业节点" },
  { key: "progress", label: "申请进度" },
  { key: "grades", label: "成绩查看" },
];

const promptByScene: Record<string, string> = {
  leave: "请帮我判断当前请假申请的处理优先级。",
  feedback: "请帮我整理当前反馈工单的处理建议。",
  psych: "请帮我梳理当前心理辅助预警的跟进建议。",
  academic: "请帮我检查当前学生本周学业节点和逾期风险。",
  progress: "请帮我解释当前申请进度，并列出老师需要跟进的材料。",
  grades: "请帮我查看成绩表现，并给出老师反馈建议。",
};

const capabilities = [
  { title: "请假审批", detail: "判断优先级和记录" },
  { title: "反馈处理", detail: "整理工单和回访" },
  { title: "心理预警", detail: "识别风险并跟进" },
  { title: "学业节点", detail: "查看考试和材料" },
  { title: "申请进度", detail: "解释阶段和缺口" },
  { title: "成绩查看", detail: "查看成绩和反馈" },
];

function formatTime() {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date());
}

export default function TeacherAgentPage() {
  const [activeScene, setActiveScene] = useState(scenes[0].key);
  const [question, setQuestion] = useState(promptByScene.leave);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("等待老师输入");
  const student = studentRows[0];

  function changeScene(nextScene: string) {
    setActiveScene(nextScene);
    setQuestion(promptByScene[nextScene]);
  }

  async function sendAgentQuestion() {
    const content = question.trim();
    if (!content) {
      setMessage("请先输入老师处理问题");
      return;
    }
    setSending(true);
    setMessage("正在整理老师处理建议");
    try {
      const data = await apiRequest<AgentResult>("/api/student-assistant/chat", {
        method: "POST",
        body: JSON.stringify({ student_id: student.id, message: content, actor_username: "teacher" }),
      });
      setResult(data);
      setMessage(data.status === "success" ? "处理建议已返回" : "已返回可用处理建议");
    } catch (error) {
      setMessage(error instanceof Error ? `老师助手暂不可用：${error.message}` : "老师助手暂不可用");
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
    <div className="teacher-agent-page">
      <RoleAgentShell
        title="老师处理助手"
        subtitle="围绕请假审批、反馈处理、心理预警、学业节点、申请进度和成绩查看生成处理建议"
        sceneLabel={scenes.find((item) => item.key === activeScene)?.label ?? "请假审批"}
        sceneHint="老师专属"
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
          { label: "风险", value: student.risk },
        ]}
        capabilities={capabilities}
        resultTitle={result ? "处理建议" : "等待处理建议"}
        resultBody={result?.answer ?? "输入老师处理问题后，助手会给出请假审批、反馈处理、心理预警、学业节点、申请进度和成绩查看建议。"}
        onQuestionKeyDown={handleAgentKeyDown}
      >
        <div className="role-agent-message user">{question}</div>
        <div className="role-agent-message assistant">
          {result?.answer ?? "我会围绕请假审批、反馈处理、心理预警、学业节点、申请进度和成绩查看给出可确认的处理建议。"}
        </div>
      </RoleAgentShell>
    </div>
  );
}
