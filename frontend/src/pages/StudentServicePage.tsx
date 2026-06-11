import { useEffect, useState } from "react";
import { CalendarDays, HeartHandshake, MessageSquareWarning, Send, ShieldAlert } from "lucide-react";
import { apiRequest } from "../api/client";
import { OperationFeedback, type OperationFeedbackState } from "../components/OperationFeedback";
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
type StudentOperation = "load" | "chat" | "feedback" | "progress" | null;

function formatOperationTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

export default function StudentServicePage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedId, setSelectedId] = useState(studentRows[0].id);
  const [input, setInput] = useState("我想请假两天，并查询申请进度。");
  const [messages, setMessages] = useState<Message[]>([{ from: "服务台", text: "请选择事项并提交。", status: "success" }]);
  const [academicEvents, setAcademicEvents] = useState<AcademicEvent[]>([]);
  const [progressItems, setProgressItems] = useState<ApplicationProgress[]>([]);
  const [operationFeedback, setOperationFeedback] = useState<OperationFeedbackState>({
    phase: "idle",
    title: "学生服务台待提交",
    detail: "可提交请假、投诉建议、查询进度或咨询生活支持。",
  });
  const [pendingOperation, setPendingOperation] = useState<StudentOperation>(null);
  const [highlightLatestMessage, setHighlightLatestMessage] = useState(false);

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
    setPendingOperation("load");
    setOperationFeedback({
      phase: "pending",
      title: "正在加载学生信息",
      detail: "读取学生身份、申请进度和考务节点。",
      target: "学生服务台",
    });
    try {
      const data = await apiRequest<StudentItem[]>("/api/student-assistant/students");
      setStudents(data);
      if (data[0]) {
        setSelectedId(data[0].id);
      }
      setOperationFeedback({
        phase: "success",
        title: "学生信息已加载",
        detail: `已同步 ${data.length || studentRows.length} 名学生，可继续提交事项或查询进度。`,
        target: "学生服务台",
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "学生信息加载失败",
        detail: error instanceof Error ? `${error.message}。已保留页面兜底数据，可稍后重试。` : "接口不可用。已保留页面兜底数据，可稍后重试。",
        target: "学生服务台",
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
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
      setOperationFeedback({
        phase: "error",
        title: "服务事项未提交",
        detail: "请先填写内容。当前输入框已保留，可补充后重试。",
        target: selected.name,
        timestamp: formatOperationTime(),
      });
      return;
    }
    setPendingOperation("chat");
    setHighlightLatestMessage(false);
    setMessages((items) => [...items, { from: "学生", text: content }]);
    setOperationFeedback({
      phase: "pending",
      title: "正在提交服务事项",
      detail: "服务台会返回处理建议，并同步刷新进度与考务节点。",
      target: selected.name,
    });
    try {
      const reply = await apiRequest<ChatResponse>("/api/student-assistant/chat", {
        method: "POST",
        body: JSON.stringify({ student_id: selected.id, message: content, actor_username: "admin" }),
      });
      setMessages((items) => [...items, { from: "服务台", text: reply.answer, status: reply.status }]);
      await loadStudentDetails(selected.id);
      setHighlightLatestMessage(true);
      setOperationFeedback({
        phase: reply.status === "fallback" ? "fallback" : "success",
        title: reply.status === "fallback" ? "服务事项已提交，当前使用兜底回复" : "服务事项已提交",
        detail: "最新服务台回复已高亮显示，可继续补充说明或查看右侧进度。",
        target: selected.name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "服务事项提交失败",
        detail: error instanceof Error ? `${error.message}。输入内容已保留，可重试。` : "接口不可用。输入内容已保留，可重试。",
        target: selected.name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function submitFeedback() {
    const content = input.trim();
    if (!content) {
      setOperationFeedback({
        phase: "error",
        title: "投诉建议未提交",
        detail: "请先填写投诉建议内容。当前输入框已保留。",
        target: selected.name,
        timestamp: formatOperationTime(),
      });
      return;
    }
    setPendingOperation("feedback");
    setHighlightLatestMessage(false);
    setOperationFeedback({
      phase: "pending",
      title: "正在提交投诉建议",
      detail: "提交成功后会生成服务工单，并在对话中显示工单状态。",
      target: selected.name,
    });
    try {
      const ticket = await apiRequest<FeedbackTicket>("/api/student-assistant/feedback-tickets", {
        method: "POST",
        body: JSON.stringify({ student_id: selected.id, category: "投诉建议", content, actor_username: "admin" }),
      });
      setMessages((items) => [...items, { from: "学生", text: content }, { from: "服务台", text: `投诉建议已提交，状态：${ticket.status}`, status: "success" }]);
      setHighlightLatestMessage(true);
      setOperationFeedback({
        phase: "success",
        title: "投诉建议已提交",
        detail: `服务工单状态：${ticket.status}。最新处理结果已高亮显示。`,
        target: selected.name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "投诉建议提交失败",
        detail: error instanceof Error ? `${error.message}。输入内容已保留，可重试。` : "接口不可用。输入内容已保留，可重试。",
        target: selected.name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function refreshProgress() {
    setPendingOperation("progress");
    setOperationFeedback({
      phase: "pending",
      title: "正在查询申请进度",
      detail: "读取当前学生的申请阶段和考务节点。",
      target: selected.name,
    });
    await loadStudentDetails(selected.id);
    setOperationFeedback({
      phase: "success",
      title: "申请进度已刷新",
      detail: "右侧申请进度和考务节点已更新，可继续咨询服务台。",
      target: selected.name,
      timestamp: formatOperationTime(),
    });
    setPendingOperation(null);
  }

  const hasPendingOperation = pendingOperation !== null;
  const isSending = pendingOperation === "chat";
  const isSubmittingFeedback = pendingOperation === "feedback";
  const isRefreshingProgress = pendingOperation === "progress";

  return (
    <div className="page-stack student-service-page">
      <section className="student-hero">
        <div>
          <p className="eyebrow">学生服务台</p>
          <h2>请假、反馈、进度和生活支持，一页完成</h2>
        </div>
        <div className="student-hero-card">
          <strong>{selected.name}</strong>
          <span>{selected.project}</span>
          <em>{selected.status}</em>
        </div>
      </section>

      <section className="student-status-strip">
        <OperationFeedback feedback={operationFeedback} />
        <span className="status-pill danger">心理支持仅作辅助识别，不替代专业诊断</span>
      </section>

      <section className="student-action-grid" aria-label="学生服务入口">
        <button className="student-action-card leave" onClick={() => sendChat("请假申请：我需要请假两天，原因是家庭事务。")} disabled={hasPendingOperation}>
          <CalendarDays size={22} aria-hidden="true" />
          <strong>请假申请</strong>
          <span>{isSending ? "正在提交" : "提交给老师审批"}</span>
        </button>
        <button className="student-action-card feedback" onClick={submitFeedback} disabled={hasPendingOperation}>
          <MessageSquareWarning size={22} aria-hidden="true" />
          <strong>投诉建议</strong>
          <span>{isSubmittingFeedback ? "正在生成工单" : "生成服务工单"}</span>
        </button>
        <button className="student-action-card progress" onClick={() => void refreshProgress()} disabled={hasPendingOperation}>
          <ShieldAlert size={22} aria-hidden="true" />
          <strong>申请进度</strong>
          <span>{isRefreshingProgress ? "正在查询" : "查看阶段和材料"}</span>
        </button>
        <button className="student-action-card support" onClick={() => sendChat("我需要生活支持，想咨询住宿和行前准备。")} disabled={hasPendingOperation}>
          <HeartHandshake size={22} aria-hidden="true" />
          <strong>生活支持</strong>
          <span>{isSending ? "正在咨询" : "咨询服务台"}</span>
        </button>
      </section>

      <section className="student-identity-strip" aria-label="学生身份选择">
        <div className="section-title">
          <h3>我的身份</h3>
          <span>{displayStudents.length} 人</span>
        </div>
        <div className="select-list compact-select-list">
          {displayStudents.map((item) => (
            <button className={item.id === selected.id ? "active" : ""} key={item.id} onClick={() => setSelectedId(item.id)}>
              <strong>{item.name}</strong>
              <span>{item.project}</span>
              <em>{item.status}</em>
            </button>
          ))}
        </div>
      </section>

      <section className="student-layout student-soft-layout">
        <div className="panel-block chat-panel student-chat-panel">
          <div className="section-title">
            <h3>{selected.name} 的服务对话</h3>
            <span className="status-pill">{selected.risk}</span>
          </div>
          <div className="message-list">
            {messages.map((item, index) => (
              <article
                className={`${item.from === "学生" ? "message user" : `message ${item.status ?? ""}`} ${
                  highlightLatestMessage && index === messages.length - 1 ? "is-highlighted" : ""
                }`}
                key={`${item.from}-${index}`}
              >
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
            <button className="icon-button" onClick={() => sendChat()} disabled={hasPendingOperation}>
              <Send size={16} aria-hidden="true" />
              {isSending ? "正在发送" : "发送给服务台"}
            </button>
          </div>
        </div>

        <aside className="side-stack">
          <section className="panel-block student-progress-panel">
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

          <section className="panel-block student-progress-panel">
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
