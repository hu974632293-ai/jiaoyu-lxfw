import { useEffect, useState } from "react";
import { CalendarDays, HeartHandshake, MessageSquareWarning, Send, ShieldAlert } from "lucide-react";
import { apiRequest } from "../api/client";
import { studentRows } from "../data/prototype";

type StudentItem = {
  id: number;
  student_name: string;
  enrollment_project: string;
  status: string;
  risk_level: string;
};

type FeedbackTicket = {
  status: string;
};

type ChatResponse = {
  status: "success" | "fallback";
  answer: string;
};

type AcademicEvent = {
  id: number;
  event_name: string;
  event_type: string;
  due_time: string | null;
  status: string;
};

type ApplicationProgress = {
  id: number;
  stage: string;
  status: string;
  description: string;
};

type Message = {
  from: "学生" | "服务台";
  text: string;
  status?: "success" | "fallback";
};

export default function StudentServicePage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedId, setSelectedId] = useState(studentRows[0].id);
  const [input, setInput] = useState("我想请假两天，并查询申请进度。");
  const [messages, setMessages] = useState<Message[]>([{ from: "服务台", text: "请选择事项并提交。", status: "success" }]);
  const [academicEvents, setAcademicEvents] = useState<AcademicEvent[]>([]);
  const [progressItems, setProgressItems] = useState<ApplicationProgress[]>([]);
  const [message, setMessage] = useState("学生服务台待提交");

  const displayStudents = students.length
    ? students.map((item) => ({
        id: item.id,
        name: item.student_name,
        project: item.enrollment_project,
        status: item.status,
        risk: item.risk_level,
      }))
    : studentRows;
  const selected = displayStudents.find((item) => item.id === selectedId) ?? displayStudents[0];

  useEffect(() => {
    void loadStudents();
  }, []);

  useEffect(() => {
    void loadStudentDetails(selectedId);
  }, [selectedId]);

  async function loadStudents() {
    try {
      const data = await apiRequest<StudentItem[]>("/api/student-assistant/students");
      setStudents(data);
      if (data[0]) {
        setSelectedId(data[0].id);
      }
      setMessage("学生信息已加载");
    } catch (error) {
      setMessage(error instanceof Error ? `学生信息加载失败：${error.message}` : "学生信息加载失败");
    }
  }

  async function loadStudentDetails(studentId: number) {
    try {
      const [academicData, progressData] = await Promise.all([
        apiRequest<AcademicEvent[]>(`/api/student-assistant/students/${studentId}/academic-events`),
        apiRequest<ApplicationProgress[]>(`/api/student-assistant/students/${studentId}/application-progress`),
      ]);
      setAcademicEvents(academicData);
      setProgressItems(progressData);
    } catch {
      setAcademicEvents([]);
      setProgressItems([]);
    }
  }

  async function sendChat(text = input) {
    const content = text.trim();
    if (!content) {
      setMessage("请先填写内容");
      return;
    }
    setMessages((items) => [...items, { from: "学生", text: content }]);
    setMessage("正在提交...");
    try {
      const reply = await apiRequest<ChatResponse>("/api/student-assistant/chat", {
        method: "POST",
        body: JSON.stringify({ student_id: selected.id, message: content, actor_username: "admin" }),
      });
      setMessages((items) => [...items, { from: "服务台", text: reply.answer, status: reply.status }]);
      await loadStudentDetails(selected.id);
      setMessage(reply.status === "fallback" ? "已使用服务台 fallback" : "提交成功");
    } catch (error) {
      setMessage(error instanceof Error ? `提交失败：${error.message}` : "提交失败");
    }
  }

  async function submitFeedback() {
    const content = input.trim();
    if (!content) {
      setMessage("请先填写投诉建议");
      return;
    }
    setMessage("正在提交投诉建议...");
    try {
      const ticket = await apiRequest<FeedbackTicket>("/api/student-assistant/feedback-tickets", {
        method: "POST",
        body: JSON.stringify({ student_id: selected.id, category: "投诉建议", content, actor_username: "admin" }),
      });
      setMessages((items) => [...items, { from: "学生", text: content }, { from: "服务台", text: `投诉建议已提交，状态：${ticket.status}`, status: "success" }]);
      setMessage("投诉建议已提交");
    } catch (error) {
      setMessage(error instanceof Error ? `投诉建议提交失败：${error.message}` : "投诉建议提交失败");
    }
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">学生服务台</p>
          <h2>请假申请、投诉建议、进度和生活支持</h2>
        </div>
      </section>

      <section className="toolbar">
        <span className={message.includes("失败") ? "status-pill warning" : "status-pill success"}>{message}</span>
        <span className="status-pill danger">心理支持不替代专业诊断</span>
      </section>

      <section className="role-action-grid" aria-label="学生服务入口">
        <button className="role-action-card" onClick={() => sendChat("请假申请：我需要请假两天，原因是家庭事务。")}>
          <CalendarDays size={20} aria-hidden="true" />
          <strong>请假申请</strong>
          <span>提交给老师</span>
        </button>
        <button className="role-action-card" onClick={submitFeedback}>
          <MessageSquareWarning size={20} aria-hidden="true" />
          <strong>投诉建议</strong>
          <span>生成工单</span>
        </button>
        <button className="role-action-card" onClick={() => void loadStudentDetails(selected.id)}>
          <ShieldAlert size={20} aria-hidden="true" />
          <strong>申请进度</strong>
          <span>查看阶段</span>
        </button>
        <button className="role-action-card" onClick={() => sendChat("我需要生活支持，想咨询住宿和行前准备。")}>
          <HeartHandshake size={20} aria-hidden="true" />
          <strong>生活支持</strong>
          <span>咨询服务台</span>
        </button>
      </section>

      <section className="student-layout">
        <aside className="panel-block">
          <div className="section-title">
            <h3>学生</h3>
            <span>{displayStudents.length} 人</span>
          </div>
          <div className="select-list">
            {displayStudents.map((item) => (
              <button className={item.id === selected.id ? "active" : ""} key={item.id} onClick={() => setSelectedId(item.id)}>
                <strong>{item.name}</strong>
                <span>{item.project}</span>
                <em>{item.status}</em>
              </button>
            ))}
          </div>
        </aside>

        <div className="panel-block chat-panel">
          <div className="section-title">
            <h3>{selected.name} 服务对话</h3>
            <span className="status-pill">{selected.risk}</span>
          </div>
          <div className="message-list">
            {messages.map((item, index) => (
              <article className={item.from === "学生" ? "message user" : `message ${item.status ?? ""}`} key={`${item.from}-${index}`}>
                <div>
                  <strong>{item.from}</strong>
                  {item.status ? <span className={`status-pill ${item.status}`}>{item.status}</span> : null}
                </div>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
          <div className="composer">
            <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={3} />
            <button className="icon-button" onClick={() => sendChat()}>
              <Send size={16} aria-hidden="true" />
              发送
            </button>
          </div>
        </div>

        <aside className="side-stack">
          <section className="panel-block">
            <div className="section-title">
              <h3>申请进度</h3>
              <span>{progressItems.length} 项</span>
            </div>
            <div className="guide-list">
              {(progressItems.length ? progressItems : [{ id: 0, stage: "材料补充", status: "进行中", description: "推荐信待上传" }]).map((item) => (
                <article key={item.id}>
                  <strong>{item.stage}</strong>
                  <span>{item.status} / {item.description}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="panel-block">
            <div className="section-title">
              <h3>考务节点</h3>
              <span>{academicEvents.length} 项</span>
            </div>
            <div className="service-grid">
              {(academicEvents.length ? academicEvents : [{ id: 0, event_name: "语言测试模拟考", event_type: "考务", due_time: "2026-06-16T09:00:00", status: "待提醒" }]).map((item) => (
                <article key={item.id}>
                  <strong>{item.event_name}</strong>
                  <span>{item.status}</span>
                  <p>{item.event_type} / {formatDate(item.due_time)}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "未设置";
  return value.replace("T", " ").slice(0, 16);
}
