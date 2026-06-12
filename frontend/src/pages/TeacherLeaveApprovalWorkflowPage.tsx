import { useEffect, useState } from "react";
import { CalendarCheck, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { apiRequest } from "../api/client";
import { OperationFeedback, type OperationFeedbackState } from "../components/OperationFeedback";
import {
  formatOperationTime,
  formatWorkflowDate,
  readPositiveQuery,
  timelineText,
  writeWorkflowQuery,
  type LeaveDetail,
  type LeaveRequest,
  type TimelineItem,
} from "./studentWorkflowShared";

type TeacherTasks = {
  leaves: LeaveRequest[];
  feedback_tickets: unknown[];
  psych_alerts: unknown[];
  grades: unknown[];
};

export default function TeacherLeaveApprovalWorkflowPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [selectedLeaveId, setSelectedLeaveId] = useState<number | null>(readPositiveQuery("leaveId"));
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [statusFilter, setStatusFilter] = useState(new URLSearchParams(window.location.search).get("status") ?? "待审批");
  const [resolution, setResolution] = useState("同意请假，返校后补交材料。");
  const [pendingAction, setPendingAction] = useState<"load" | "approve" | "reject" | null>(null);
  const [feedback, setFeedback] = useState<OperationFeedbackState>({
    phase: "idle",
    title: "请假审批待处理",
    detail: "选择请假申请后，可查看详情、同意或驳回，并保留审批记录。",
  });

  const visibleLeaves = statusFilter === "全部" ? leaves : leaves.filter((item) => item.status === statusFilter);
  const selectedLeave = visibleLeaves.find((item) => item.id === selectedLeaveId) ?? visibleLeaves[0] ?? null;
  const isBusy = pendingAction !== null;

  useEffect(() => {
    void loadLeaves();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("status", statusFilter);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [statusFilter]);

  useEffect(() => {
    if (selectedLeave?.id) {
      setSelectedLeaveId(selectedLeave.id);
      writeWorkflowQuery({ leaveId: selectedLeave.id });
      void loadLeaveDetail(selectedLeave.id);
    } else {
      setTimeline([]);
      writeWorkflowQuery({ leaveId: null });
    }
  }, [selectedLeave?.id]);

  async function loadLeaves() {
    setPendingAction("load");
    try {
      const data = await apiRequest<TeacherTasks>("/api/student-assistant/teacher-tasks");
      setLeaves(data.leaves);
      const restoredLeaveId = readPositiveQuery("leaveId");
      const nextLeave = data.leaves.find((item) => item.id === restoredLeaveId) ?? data.leaves[0] ?? null;
      setSelectedLeaveId(nextLeave?.id ?? null);
      setFeedback({
        phase: "success",
        title: "请假审批队列已同步",
        detail: `当前共有 ${data.leaves.length} 条请假申请，可按状态筛选处理。`,
        target: "老师请假审批",
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setFeedback({
        phase: "error",
        title: "请假审批队列加载失败",
        detail: error instanceof Error ? `${error.message}。可稍后重试。` : "服务暂不可用，可稍后重试。",
        target: "老师请假审批",
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function loadLeaveDetail(leaveId: number) {
    try {
      const data = await apiRequest<LeaveDetail>(`/api/student-assistant/leaves/${leaveId}`);
      setTimeline(data.timeline);
    } catch {
      setTimeline([]);
    }
  }

  async function approveLeave(nextStatus: "已同意" | "已驳回") {
    if (!selectedLeave) return;
    setPendingAction(nextStatus === "已同意" ? "approve" : "reject");
    setFeedback({
      phase: "pending",
      title: nextStatus === "已同意" ? "正在同意请假" : "正在驳回请假",
      detail: `审批结果会同步到学生请假申请页和处理记录。`,
      target: `请假 #${selectedLeave.id}`,
    });
    try {
      const leave = await apiRequest<LeaveRequest>(`/api/student-assistant/leaves/${selectedLeave.id}/approve`, {
        method: "POST",
        body: JSON.stringify({ status: nextStatus, resolution, actor_username: "admin" }),
      });
      await loadLeaves();
      await loadLeaveDetail(leave.id);
      setSelectedLeaveId(leave.id);
      setFeedback({
        phase: "success",
        title: "请假审批已更新",
        detail: `请假 #${leave.id} 已处理为 ${leave.status}，学生端刷新可见。`,
        target: `请假 #${leave.id}`,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setFeedback({
        phase: "error",
        title: "请假审批失败",
        detail: error instanceof Error ? `${error.message}。审批状态未改动。` : "服务暂不可用，审批状态未改动。",
        target: `请假 #${selectedLeave.id}`,
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
          <p className="eyebrow">老师工作台 / 请假审批</p>
          <h2>查看请假队列、审批和处理历史</h2>
          <p>本页只处理请假，不混入反馈工单和心理预警。</p>
        </div>
        <button className="icon-button secondary" onClick={() => void loadLeaves()} disabled={isBusy}>
          <RefreshCw className={pendingAction === "load" ? "spin-icon" : ""} size={16} aria-hidden="true" />
          刷新队列
        </button>
      </section>

      <section className="toolbar workflow-toolbar">
        <OperationFeedback feedback={feedback} />
      </section>

      <section className="workflow-metric-grid">
        <article><span>全部申请</span><strong>{leaves.length}</strong><em>老师可处理</em></article>
        <article><span>待审批</span><strong>{leaves.filter((item) => item.status === "待审批").length}</strong><em>优先处理</em></article>
        <article><span>当前申请</span><strong>{selectedLeave ? `#${selectedLeave.id}` : "无"}</strong><em>{selectedLeave?.status ?? "未选择"}</em></article>
      </section>

      <section className="workflow-action-layout">
        <div className="workflow-teacher-layout">
          <section className="panel-block">
            <div className="section-title">
              <h3>请假队列</h3>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="待审批">待审批</option>
                <option value="已同意">已同意</option>
                <option value="已驳回">已驳回</option>
                <option value="已撤销">已撤销</option>
                <option value="全部">全部</option>
              </select>
            </div>
            <div className="select-list workflow-list">
              {visibleLeaves.map((item) => (
                <button className={item.id === selectedLeave?.id ? "active" : ""} key={item.id} onClick={() => setSelectedLeaveId(item.id)}>
                  <strong>#{item.id} 学生 #{item.student_id} / {item.status}</strong>
                  <span>{item.reason}</span>
                  <em>{formatWorkflowDate(item.start_time)} - {formatWorkflowDate(item.end_time)}</em>
                </button>
              ))}
              {!visibleLeaves.length ? <div className="empty-state">当前筛选下暂无请假申请。</div> : null}
            </div>
          </section>

          <div className="workflow-detail-column">
            <section className="panel-block">
              <div className="section-title">
                <h3>审批面板</h3>
                <CalendarCheck size={18} aria-hidden="true" />
              </div>
              {selectedLeave ? (
                <div className="workflow-detail-card">
                  <strong>请假 #{selectedLeave.id}</strong>
                  <span>{selectedLeave.reason}</span>
                  <p>时间：{formatWorkflowDate(selectedLeave.start_time)} - {formatWorkflowDate(selectedLeave.end_time)}</p>
                  <p>当前状态：{selectedLeave.status}</p>
                </div>
              ) : (
                <div className="empty-state">请选择请假申请。</div>
              )}
              <div className="compact-form-grid">
                <label>
                  <span>审批意见</span>
                  <textarea value={resolution} onChange={(event) => setResolution(event.target.value)} rows={4} />
                </label>
              </div>
              <div className="inline-actions">
                <button onClick={() => void approveLeave("已同意")} disabled={isBusy || !selectedLeave}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  {pendingAction === "approve" ? "正在同意" : "同意请假"}
                </button>
                <button className="ghost-button" onClick={() => void approveLeave("已驳回")} disabled={isBusy || !selectedLeave}>
                  <XCircle size={15} aria-hidden="true" />
                  {pendingAction === "reject" ? "正在驳回" : "驳回请假"}
                </button>
              </div>
            </section>

            <section className="panel-block">
              <div className="section-title">
                <h3>审批历史</h3>
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
                {!timeline.length ? <div className="empty-state">选择请假申请后查看审批历史。</div> : null}
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
