import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, MessageSquare, Send } from "lucide-react";
import type { PageProps } from "../App";
import { apiRequest } from "../api/client";
import { psychAlerts, studentRows, studentServiceItems } from "../data/prototype";

type ChatMessage = {
  from: "学生" | "学生助手";
  text: string;
  status?: "success" | "fallback" | "danger";
};

type StudentItem = {
  id: number;
  student_name: string;
  enrollment_project: string;
  status: string;
  risk_level: string;
};

type LeaveTask = {
  id: number;
  student_id: number;
  reason: string;
  status: string;
  start_time: string;
  end_time: string;
};

type FeedbackTicket = {
  id: number;
  student_id: number;
  category: string;
  content: string;
  summary: string;
  status: string;
  resolution: string;
};

type PsychAlert = {
  id: number;
  student_id: number;
  risk_level: string;
  trigger_reason: string;
  status: string;
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

type TeacherTasks = {
  leaves: LeaveTask[];
  feedback_tickets: FeedbackTicket[];
  psych_alerts: PsychAlert[];
};

type ChatResponse = {
  intent: string;
  status: "success" | "fallback";
  answer: string;
};

const emptyTasks: TeacherTasks = { leaves: [], feedback_tickets: [], psych_alerts: [] };

export default function StudentAssistantPage({ role, onNavigate }: PageProps) {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedId, setSelectedId] = useState(studentRows[0].id);
  const [input, setInput] = useState("我想请假两天，并想知道签证材料进度。");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: "学生助手", text: "学生助手已接入真实 API；接口不可用时保留原型 fallback 展示。心理提示只做辅助识别，不替代专业心理诊断。", status: "fallback" },
  ]);
  const [tasks, setTasks] = useState<TeacherTasks>(emptyTasks);
  const [academicEvents, setAcademicEvents] = useState<AcademicEvent[]>([]);
  const [progressItems, setProgressItems] = useState<ApplicationProgress[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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

  const serviceItems = useMemo(() => {
    if (!tasks.leaves.length && !tasks.feedback_tickets.length && !academicEvents.length && !progressItems.length) {
      return studentServiceItems;
    }
    const leave = tasks.leaves.find((item) => item.student_id === selected.id) ?? tasks.leaves[0];
    const ticket = tasks.feedback_tickets.find((item) => item.student_id === selected.id) ?? tasks.feedback_tickets[0];
    const progress = progressItems[0];
    const academic = academicEvents[0];
    return [
      {
        title: "请假申请",
        status: leave?.status ?? "暂无",
        detail: leave ? `${formatDate(leave.start_time)} 至 ${formatDate(leave.end_time)}：${leave.reason}` : "当前学生暂无请假申请",
      },
      {
        title: "反馈工单",
        status: ticket?.status ?? "暂无",
        detail: ticket ? `${ticket.category}：${ticket.summary || ticket.content}` : "当前学生暂无反馈工单",
      },
      {
        title: "申请进度",
        status: progress?.status ?? "暂无",
        detail: progress ? `${progress.stage}：${progress.description}` : "暂无申请进度数据",
      },
      {
        title: "学业节点",
        status: academic?.status ?? "暂无",
        detail: academic ? `${academic.event_name} / ${academic.event_type} / ${formatDate(academic.due_time)}` : "暂无学业节点数据",
      },
    ];
  }, [academicEvents, progressItems, selected.id, tasks]);

  useEffect(() => {
    void loadInitial();
  }, []);

  useEffect(() => {
    if (students.length && !students.some((item) => item.id === selectedId)) {
      setSelectedId(students[0].id);
    }
  }, [selectedId, students]);

  useEffect(() => {
    if (selectedId) {
      void loadStudentDetails(selectedId);
    }
  }, [selectedId]);

  async function loadInitial() {
    setLoading(true);
    try {
      const [studentData, taskData] = await Promise.all([
        apiRequest<StudentItem[]>("/api/student-assistant/students"),
        apiRequest<TeacherTasks>("/api/student-assistant/teacher-tasks"),
      ]);
      setStudents(studentData);
      setTasks(taskData);
      setError("");
    } catch (err) {
      setError(`学生助手 API 暂不可用，已使用原型 fallback：${errorMessage(err)}`);
    } finally {
      setLoading(false);
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
    } catch (err) {
      setError(`学生详情 API 暂不可用，已保留页面 fallback：${errorMessage(err)}`);
    }
  }

  async function reloadTasks() {
    const taskData = await apiRequest<TeacherTasks>("/api/student-assistant/teacher-tasks");
    setTasks(taskData);
  }

  async function send() {
    const text = input.trim();
    if (!text) return;
    setMessages((items) => [...items, { from: "学生", text }]);
    try {
      const reply = await apiRequest<ChatResponse>("/api/student-assistant/chat", {
        method: "POST",
        body: JSON.stringify({ student_id: selected.id, message: text, actor_username: "admin" }),
      });
      setMessages((items) => [...items, { from: "学生助手", text: reply.answer, status: reply.status }]);
      if (["leave_request", "psych_support"].includes(reply.intent)) {
        await reloadTasks();
      }
      if (["application_progress", "academic_event"].includes(reply.intent)) {
        await loadStudentDetails(selected.id);
      }
      setError("");
    } catch (err) {
      setMessages((items) => [
        ...items,
        { from: "学生助手", text: `学生助手 API 调用失败，当前使用 fallback：${errorMessage(err)}`, status: "fallback" },
      ]);
    }
  }

  async function submitFeedback() {
    const content = input.trim();
    if (!content) return;
    try {
      const ticket = await apiRequest<FeedbackTicket>("/api/student-assistant/feedback-tickets", {
        method: "POST",
        body: JSON.stringify({ student_id: selected.id, category: "建议", content, actor_username: "admin" }),
      });
      await reloadTasks();
      setMessages((items) => [
        ...items,
        { from: "学生", text: content },
        { from: "学生助手", text: `反馈工单已提交，当前状态：${ticket.status}。`, status: "success" },
      ]);
      setError("");
    } catch (err) {
      setError(`反馈提交失败：${errorMessage(err)}`);
    }
  }

  async function approveLeave() {
    const leave = tasks.leaves.find((item) => item.status === "待审批") ?? tasks.leaves[0];
    if (!leave) {
      setError("暂无可审批请假申请。");
      return;
    }
    try {
      const result = await apiRequest<LeaveTask>(`/api/student-assistant/leaves/${leave.id}/approve`, {
        method: "POST",
        body: JSON.stringify({ status: "已同意", resolution: "同意请假，返校后补交材料。", actor_username: "admin" }),
      });
      await reloadTasks();
      setMessages((items) => [...items, { from: "学生助手", text: `老师已审批请假：${result.status}。`, status: "success" }]);
      setError("");
    } catch (err) {
      setError(`请假审批失败：${errorMessage(err)}`);
    }
  }

  async function closeFeedback() {
    const ticket = tasks.feedback_tickets.find((item) => item.status !== "已处理") ?? tasks.feedback_tickets[0];
    if (!ticket) {
      setError("暂无可处理反馈工单。");
      return;
    }
    try {
      const result = await apiRequest<FeedbackTicket>(`/api/student-assistant/feedback-tickets/${ticket.id}/handle`, {
        method: "POST",
        body: JSON.stringify({ resolution: "已分配老师跟进，并同步学生处理结果。", actor_username: "admin" }),
      });
      await reloadTasks();
      setMessages((items) => [...items, { from: "学生助手", text: `反馈工单已更新：${result.status}。`, status: "success" }]);
      setError("");
    } catch (err) {
      setError(`反馈处理失败：${errorMessage(err)}`);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">学生助手</p>
          <h2>学生服务自助与老师跟进闭环</h2>
          <p>学生可提交请假和反馈，老师处理审批与预警；心理预警只做辅助识别，不替代专业心理诊断。</p>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={() => onNavigate("knowledge")}>进入运营资源问答</button>
          <button className="icon-button" onClick={() => onNavigate("reports")}>生成学生周报</button>
        </div>
      </section>

      <section className="toolbar">
        <span className="status-pill">当前角色：{role}</span>
        <span className="status-pill danger">心理提示不替代专业诊断</span>
        <span className={`status-pill ${error ? "fallback" : "success"}`}>{error || (loading ? "正在加载学生助手 API" : "真实 API 已连接")}</span>
      </section>

      <section className="student-layout">
        <aside className="panel-block">
          <div className="section-title">
            <h3>学生选择</h3>
            <span>{displayStudents.length} 人</span>
          </div>
          <div className="select-list">
            {displayStudents.map((item) => (
              <button className={item.id === selected.id ? "active" : ""} key={item.id} onClick={() => setSelectedId(item.id)}>
                <strong>{item.name}</strong>
                <span>{item.project}</span>
                <em>风险：{item.risk}</em>
              </button>
            ))}
          </div>
        </aside>

        <div className="panel-block chat-panel">
          <div className="section-title">
            <h3>{selected.name} 的服务对话</h3>
            <span className="status-pill success">{selected.status}</span>
          </div>
          <div className="message-list">
            {messages.map((item, index) => (
              <article className={item.from === "学生" ? "message user" : `message ${item.status ?? ""}`} key={`${item.from}-${index}`}>
                <div>
                  <strong>{item.from}</strong>
                  {item.status && <span className={`status-pill ${item.status}`}>{item.status}</span>}
                </div>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
          <div className="composer">
            <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={3} />
            <button className="icon-button" onClick={send}>
              <Send size={16} aria-hidden="true" />
              发送
            </button>
            <button className="icon-button secondary" onClick={submitFeedback}>提交反馈</button>
          </div>
        </div>

        <aside className="side-stack">
          <section className="panel-block">
            <div className="section-title">
              <h3>服务事项</h3>
              <MessageSquare size={18} aria-hidden="true" />
            </div>
            <div className="service-grid">
              {serviceItems.map((item) => (
                <article key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.status}</span>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel-block">
            <div className="section-title">
              <h3>老师处理区</h3>
              <CheckCircle2 size={18} aria-hidden="true" />
            </div>
            <div className="action-list">
              <article>
                <strong>请假审批</strong>
                <span>{tasks.leaves[0]?.status ?? "暂无待办"}</span>
                <button className="tiny-button" onClick={approveLeave}>同意请假</button>
              </article>
              <article>
                <strong>反馈工单</strong>
                <span>{tasks.feedback_tickets[0]?.status ?? "暂无待办"}</span>
                <button className="tiny-button" onClick={closeFeedback}>更新处理</button>
              </article>
            </div>
          </section>

          <section className="panel-block">
            <div className="section-title">
              <h3>心理辅助预警</h3>
              <AlertTriangle size={18} aria-hidden="true" />
            </div>
            {(tasks.psych_alerts.length ? tasks.psych_alerts : psychAlerts).map((item) => (
              <div className="risk-box" key={"id" in item ? item.id : item.student}>
                <strong>{"risk_level" in item ? `学生 #${item.student_id} / ${item.risk_level}` : `${item.student} / ${item.level}`}</strong>
                <span>{"trigger_reason" in item ? `${item.trigger_reason}；${item.status}` : `${item.reason}；${item.status}`}</span>
              </div>
            ))}
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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "未知错误";
}
