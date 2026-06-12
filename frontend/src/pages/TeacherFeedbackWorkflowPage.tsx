import { useEffect, useState } from "react";
import { Archive, CheckCircle2, MessageSquare, RefreshCw } from "lucide-react";
import { apiRequest } from "../api/client";
import { OperationFeedback, type OperationFeedbackState } from "../components/OperationFeedback";
import {
  formatOperationTime,
  formatWorkflowDate,
  readPositiveQuery,
  timelineText,
  writeWorkflowQuery,
  type FeedbackDetail,
  type FeedbackTicket,
  type TimelineItem,
} from "./studentWorkflowShared";

type TeacherTasks = {
  leaves: unknown[];
  feedback_tickets: FeedbackTicket[];
  psych_alerts: unknown[];
  grades: unknown[];
};

export default function TeacherFeedbackWorkflowPage() {
  const [tickets, setTickets] = useState<FeedbackTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(readPositiveQuery("ticketId"));
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [statusFilter, setStatusFilter] = useState(new URLSearchParams(window.location.search).get("status") ?? "待处理");
  const [resolution, setResolution] = useState("已分配老师跟进，并同步处理结果。");
  const [pendingAction, setPendingAction] = useState<"load" | "handle" | "close" | "archive" | null>(null);
  const [feedback, setFeedback] = useState<OperationFeedbackState>({
    phase: "idle",
    title: "反馈工单待处理",
    detail: "选择工单后，可回复处理结果、关闭或归档，并保留处理记录。",
  });

  const visibleTickets = statusFilter === "全部" ? tickets : tickets.filter((item) => item.status === statusFilter);
  const selectedTicket = visibleTickets.find((item) => item.id === selectedTicketId) ?? visibleTickets[0] ?? null;
  const isBusy = pendingAction !== null;

  useEffect(() => {
    void loadTickets();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("status", statusFilter);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [statusFilter]);

  useEffect(() => {
    if (selectedTicket?.id) {
      setSelectedTicketId(selectedTicket.id);
      writeWorkflowQuery({ ticketId: selectedTicket.id });
      void loadTicketDetail(selectedTicket.id);
    } else {
      setTimeline([]);
      writeWorkflowQuery({ ticketId: null });
    }
  }, [selectedTicket?.id]);

  async function loadTickets() {
    setPendingAction("load");
    try {
      const data = await apiRequest<TeacherTasks>("/api/student-assistant/teacher-tasks");
      setTickets(data.feedback_tickets);
      const restoredTicketId = readPositiveQuery("ticketId");
      const nextTicket = data.feedback_tickets.find((item) => item.id === restoredTicketId) ?? data.feedback_tickets[0] ?? null;
      setSelectedTicketId(nextTicket?.id ?? null);
      setFeedback({
        phase: "success",
        title: "反馈处理队列已同步",
        detail: `当前共有 ${data.feedback_tickets.length} 条反馈工单，可按状态筛选处理。`,
        target: "老师反馈处理",
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setFeedback({
        phase: "error",
        title: "反馈处理队列加载失败",
        detail: error instanceof Error ? `${error.message}。可稍后重试。` : "服务暂不可用，可稍后重试。",
        target: "老师反馈处理",
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

  async function handleTicket() {
    if (!selectedTicket) return;
    setPendingAction("handle");
    try {
      const ticket = await apiRequest<FeedbackTicket>(`/api/student-assistant/feedback-tickets/${selectedTicket.id}/handle`, {
        method: "POST",
        body: JSON.stringify({ resolution, actor_username: "admin" }),
      });
      await loadTickets();
      await loadTicketDetail(ticket.id);
      setSelectedTicketId(ticket.id);
      setFeedback({
        phase: "success",
        title: "反馈处理已更新",
        detail: `工单 #${ticket.id} 已处理，学生端刷新可见处理结果。`,
        target: `工单 #${ticket.id}`,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setFeedback({
        phase: "error",
        title: "反馈处理失败",
        detail: error instanceof Error ? `${error.message}。` : "服务暂不可用，可重试。",
        target: `工单 #${selectedTicket.id}`,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function changeTicketStatus(action: "close" | "archive") {
    if (!selectedTicket) return;
    setPendingAction(action);
    const endpoint = action === "close" ? "close" : "archive";
    const reason = action === "close" ? "学生确认处理结果，关闭工单。" : "服务记录归档。";
    try {
      const ticket = await apiRequest<FeedbackTicket>(`/api/student-assistant/feedback-tickets/${selectedTicket.id}/${endpoint}`, {
        method: "POST",
        body: JSON.stringify({ reason, actor_username: "admin" }),
      });
      await loadTickets();
      await loadTicketDetail(ticket.id);
      setSelectedTicketId(ticket.id);
      setFeedback({
        phase: "success",
        title: action === "close" ? "反馈工单已关闭" : "反馈工单已归档",
        detail: `工单 #${ticket.id} 当前状态：${ticket.status}。`,
        target: `工单 #${ticket.id}`,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setFeedback({
        phase: "error",
        title: action === "close" ? "反馈关闭失败" : "反馈归档失败",
        detail: error instanceof Error ? `${error.message}。` : "服务暂不可用，可重试。",
        target: `工单 #${selectedTicket.id}`,
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
          <p className="eyebrow">老师工作台 / 反馈处理</p>
          <h2>处理反馈工单、关闭归档和查看历史</h2>
          <p>本页只处理反馈，不混入请假审批和成绩录入。</p>
        </div>
        <button className="icon-button secondary" onClick={() => void loadTickets()} disabled={isBusy}>
          <RefreshCw className={pendingAction === "load" ? "spin-icon" : ""} size={16} aria-hidden="true" />
          刷新工单
        </button>
      </section>

      <section className="toolbar workflow-toolbar">
        <OperationFeedback feedback={feedback} />
      </section>

      <section className="workflow-metric-grid">
        <article><span>全部工单</span><strong>{tickets.length}</strong><em>老师可处理</em></article>
        <article><span>处理中</span><strong>{tickets.filter((item) => ["待处理", "处理中"].includes(item.status)).length}</strong><em>优先跟进</em></article>
        <article><span>当前工单</span><strong>{selectedTicket ? `#${selectedTicket.id}` : "无"}</strong><em>{selectedTicket?.status ?? "未选择"}</em></article>
      </section>

      <section className="workflow-two-column">
        <section className="panel-block">
          <div className="section-title">
            <h3>反馈队列</h3>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="待处理">待处理</option>
              <option value="处理中">处理中</option>
              <option value="已处理">已处理</option>
              <option value="已关闭">已关闭</option>
              <option value="已归档">已归档</option>
              <option value="全部">全部</option>
            </select>
          </div>
          <div className="select-list workflow-list">
            {visibleTickets.map((item) => (
              <button className={item.id === selectedTicket?.id ? "active" : ""} key={item.id} onClick={() => setSelectedTicketId(item.id)}>
                <strong>#{item.id} 学生 #{item.student_id} / {item.status}</strong>
                <span>{item.summary || item.content}</span>
                <em>{item.resolution || "等待处理"}</em>
              </button>
            ))}
            {!visibleTickets.length ? <div className="empty-state">当前筛选下暂无反馈工单。</div> : null}
          </div>
        </section>

        <section className="panel-block">
          <div className="section-title">
            <h3>处理面板</h3>
            <MessageSquare size={18} aria-hidden="true" />
          </div>
          {selectedTicket ? (
            <div className="workflow-detail-card">
              <strong>工单 #{selectedTicket.id}</strong>
              <span>{selectedTicket.content}</span>
              <p>摘要：{selectedTicket.summary || "暂无摘要"}</p>
              <p>当前处理：{selectedTicket.resolution || "等待老师处理"}</p>
            </div>
          ) : (
            <div className="empty-state">请选择反馈工单。</div>
          )}
          <div className="compact-form-grid">
            <label>
              <span>处理结果</span>
              <textarea value={resolution} onChange={(event) => setResolution(event.target.value)} rows={4} />
            </label>
          </div>
          <div className="inline-actions">
            <button onClick={() => void handleTicket()} disabled={isBusy || !selectedTicket}>
              <CheckCircle2 size={15} aria-hidden="true" />
              {pendingAction === "handle" ? "正在处理" : "记录处理"}
            </button>
            <button className="ghost-button" onClick={() => void changeTicketStatus("close")} disabled={isBusy || !selectedTicket}>
              关闭工单
            </button>
            <button className="ghost-button" onClick={() => void changeTicketStatus("archive")} disabled={isBusy || !selectedTicket}>
              <Archive size={15} aria-hidden="true" />
              归档
            </button>
          </div>
        </section>
      </section>

      <section className="panel-block">
        <div className="section-title">
          <h3>处理历史</h3>
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
          {!timeline.length ? <div className="empty-state">选择反馈工单后查看处理历史。</div> : null}
        </div>
      </section>
    </div>
  );
}
