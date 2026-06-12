import { useEffect, useState } from "react";
import { MessageSquareWarning, RefreshCw, Send } from "lucide-react";
import { apiRequest } from "../api/client";
import { OperationFeedback, type OperationFeedbackState } from "../components/OperationFeedback";
import { studentRows } from "../data/prototype";
import {
  formatOperationTime,
  formatWorkflowDate,
  readPositiveQuery,
  timelineText,
  writeWorkflowQuery,
  type FeedbackDetail,
  type FeedbackTicket,
  type StudentItem,
  type TimelineItem,
} from "./studentWorkflowShared";

export default function StudentFeedbackWorkflowPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(readPositiveQuery("studentId") ?? studentRows[0].id);
  const [tickets, setTickets] = useState<FeedbackTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(readPositiveQuery("ticketId"));
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [category, setCategory] = useState("投诉建议");
  const [content, setContent] = useState("住宿安排沟通不及时，希望老师今天给一个明确处理结果。");
  const [pendingAction, setPendingAction] = useState<"load" | "create" | "reply" | null>(null);
  const [feedback, setFeedback] = useState<OperationFeedbackState>({
    phase: "idle",
    title: "反馈工单待提交",
    detail: "提交投诉建议后，老师处理状态和回复会在本页回显。",
  });

  const studentOptions = students.length
    ? students.map((item) => ({
        id: item.id,
        name: item.student_name,
        project: item.enrollment_project,
        status: item.status,
        risk: item.risk_level,
      }))
    : studentRows;
  const selectedStudent = studentOptions.find((item) => item.id === selectedStudentId) ?? studentOptions[0];
  const selectedTicket = tickets.find((item) => item.id === selectedTicketId) ?? tickets[0] ?? null;
  const isBusy = pendingAction !== null;

  useEffect(() => {
    void loadStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      writeWorkflowQuery({ studentId: selectedStudent.id, ticketId: selectedTicketId });
      void loadTickets(selectedStudent.id);
    }
  }, [selectedStudent?.id]);

  useEffect(() => {
    if (selectedTicket?.id) {
      setSelectedTicketId(selectedTicket.id);
      writeWorkflowQuery({ studentId: selectedStudent.id, ticketId: selectedTicket.id });
      void loadTicketDetail(selectedTicket.id);
    } else {
      setTimeline([]);
      writeWorkflowQuery({ studentId: selectedStudent.id, ticketId: null });
    }
  }, [selectedTicket?.id]);

  async function loadStudents() {
    try {
      const data = await apiRequest<StudentItem[]>("/api/student-assistant/students");
      setStudents(data);
      const restoredStudentId = readPositiveQuery("studentId");
      if (restoredStudentId && data.some((item) => item.id === restoredStudentId)) {
        setSelectedStudentId(restoredStudentId);
      } else if (data[0]) {
        setSelectedStudentId(data[0].id);
      }
    } catch {
      setStudents([]);
    }
  }

  async function loadTickets(studentId = selectedStudent.id) {
    setPendingAction("load");
    try {
      const data = await apiRequest<FeedbackTicket[]>(`/api/student-assistant/feedback-tickets?student_id=${studentId}`);
      setTickets(data);
      const restoredTicketId = readPositiveQuery("ticketId");
      const nextTicket = data.find((item) => item.id === restoredTicketId) ?? data[0] ?? null;
      setSelectedTicketId(nextTicket?.id ?? null);
      setFeedback({
        phase: "success",
        title: "反馈记录已同步",
        detail: `当前学生共有 ${data.length} 条反馈工单，可查看状态和处理记录。`,
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setFeedback({
        phase: "error",
        title: "反馈记录加载失败",
        detail: error instanceof Error ? `${error.message}。可稍后重试。` : "服务暂不可用，可稍后重试。",
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function loadTicketDetail(ticketId: number) {
    try {
      const data = await apiRequest<FeedbackDetail>(`/api/student-assistant/feedback-tickets/${ticketId}`);
      setTimeline(data.timeline);
    } catch {
      setTimeline([]);
    }
  }

  async function submitFeedback() {
    const nextContent = content.trim();
    if (!nextContent) {
      setFeedback({
        phase: "error",
        title: "反馈未提交",
        detail: "请先填写反馈内容。",
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
      return;
    }
    setPendingAction("create");
    setFeedback({
      phase: "pending",
      title: "正在提交反馈",
      detail: "提交后老师端反馈处理队列会同步出现该工单。",
      target: selectedStudent.name,
    });
    try {
      const ticket = await apiRequest<FeedbackTicket>("/api/student-assistant/feedback-tickets", {
        method: "POST",
        body: JSON.stringify({ student_id: selectedStudent.id, category, content: nextContent, actor_username: "admin" }),
      });
      setSelectedTicketId(ticket.id);
      await loadTickets(selectedStudent.id);
      await loadTicketDetail(ticket.id);
      setFeedback({
        phase: "success",
        title: "反馈已提交",
        detail: `工单 #${ticket.id} 已进入处理队列，刷新后仍会停留在当前工单。`,
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setFeedback({
        phase: "error",
        title: "反馈提交失败",
        detail: error instanceof Error ? `${error.message}。内容已保留，可重试。` : "服务暂不可用。内容已保留，可重试。",
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function replyFeedback() {
    if (!selectedTicket) return;
    const nextContent = content.trim() || "学生补充：希望老师继续跟进并同步处理结果。";
    setPendingAction("reply");
    try {
      const ticket = await apiRequest<FeedbackTicket>(`/api/student-assistant/feedback-tickets/${selectedTicket.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ content: nextContent, actor_username: "admin" }),
      });
      await loadTickets(selectedStudent.id);
      await loadTicketDetail(ticket.id);
      setFeedback({
        phase: "success",
        title: "反馈补充已提交",
        detail: `工单 #${ticket.id} 当前状态：${ticket.status}。`,
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setFeedback({
        phase: "error",
        title: "反馈补充失败",
        detail: error instanceof Error ? `${error.message}。` : "服务暂不可用，可重试。",
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="page-stack workflow-page">
      <section className="page-heading workflow-heading">
        <div>
          <p className="eyebrow">学生服务台 / 反馈提交</p>
          <h2>提交投诉建议、补充说明和查看处理状态</h2>
          <p>学生提交后，老师处理结果会回到本页。</p>
        </div>
        <button className="icon-button secondary" onClick={() => void loadTickets()} disabled={isBusy}>
          <RefreshCw className={pendingAction === "load" ? "spin-icon" : ""} size={16} aria-hidden="true" />
          刷新反馈
        </button>
      </section>

      <section className="toolbar workflow-toolbar">
        <OperationFeedback feedback={feedback} />
      </section>

      <section className="workflow-metric-grid" aria-label="反馈提交摘要">
        <article><span>我的反馈</span><strong>{tickets.length}</strong><em>全部工单</em></article>
        <article><span>待处理</span><strong>{tickets.filter((item) => ["待处理", "处理中"].includes(item.status)).length}</strong><em>等待老师处理</em></article>
        <article><span>当前状态</span><strong>{selectedTicket?.status ?? "未选择"}</strong><em>刷新后保留</em></article>
      </section>

      <section className="workflow-three-column">
        <aside className="panel-block">
          <div className="section-title">
            <h3>学生</h3>
            <span>{studentOptions.length} 人</span>
          </div>
          <div className="select-list">
            {studentOptions.map((item) => (
              <button className={item.id === selectedStudent.id ? "active" : ""} key={item.id} onClick={() => setSelectedStudentId(item.id)}>
                <strong>{item.name}</strong>
                <span>{item.project}</span>
                <em>{item.status}</em>
              </button>
            ))}
          </div>
        </aside>

        <section className="panel-block">
          <div className="section-title">
            <h3>反馈表单</h3>
            <MessageSquareWarning size={18} aria-hidden="true" />
          </div>
          <div className="compact-form-grid">
            <label>
              <span>类型</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="投诉建议">投诉建议</option>
                <option value="住宿">住宿</option>
                <option value="课程">课程</option>
                <option value="申请服务">申请服务</option>
              </select>
            </label>
            <label>
              <span>内容</span>
              <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={6} />
            </label>
          </div>
          <div className="inline-actions">
            <button onClick={() => void submitFeedback()} disabled={isBusy}>
              <Send size={15} aria-hidden="true" />
              {pendingAction === "create" ? "正在提交" : "提交新反馈"}
            </button>
            <button className="ghost-button" onClick={() => void replyFeedback()} disabled={isBusy || !selectedTicket || selectedTicket.status === "已归档"}>
              补充当前工单
            </button>
          </div>
        </section>

        <section className="panel-block">
          <div className="section-title">
            <h3>我的反馈</h3>
            <span>{tickets.length} 条</span>
          </div>
          <div className="select-list workflow-list">
            {tickets.map((item) => (
              <button className={item.id === selectedTicket?.id ? "active" : ""} key={item.id} onClick={() => setSelectedTicketId(item.id)}>
                <strong>#{item.id} {item.category} / {item.status}</strong>
                <span>{item.summary || item.content}</span>
                <em>{item.resolution || "等待处理"}</em>
              </button>
            ))}
            {!tickets.length ? <div className="empty-state">暂无反馈记录，可从中间表单提交。</div> : null}
          </div>
        </section>
      </section>

      <section className="workflow-detail-grid">
        <section className="panel-block">
          <div className="section-title">
            <h3>工单详情</h3>
            <span className="status-pill">{selectedTicket?.status ?? "未选择"}</span>
          </div>
          {selectedTicket ? (
            <div className="workflow-detail-card">
              <strong>工单 #{selectedTicket.id}</strong>
              <span>{selectedTicket.content}</span>
              <p>摘要：{selectedTicket.summary || "暂无摘要"}</p>
              <p>处理结果：{selectedTicket.resolution || "等待老师处理"}</p>
            </div>
          ) : (
            <div className="empty-state">请选择一条反馈工单。</div>
          )}
        </section>

        <section className="panel-block">
          <div className="section-title">
            <h3>处理记录</h3>
            <span>{timeline.length} 条</span>
          </div>
          <div className="timeline">
            {timeline.map((item) => (
              <article key={item.id}>
                <span>{formatWorkflowDate(item.created_at)}</span>
                <div>
                  <strong>{item.action}</strong>
                  <p>{timelineText(item)}</p>
                </div>
              </article>
            ))}
            {!timeline.length ? <div className="empty-state">提交或选择工单后查看时间线。</div> : null}
          </div>
        </section>
      </section>
    </div>
  );
}
