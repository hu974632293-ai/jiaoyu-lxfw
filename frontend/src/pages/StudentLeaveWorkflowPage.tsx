import { useEffect, useState } from "react";
import { CalendarDays, FileText, RefreshCw, Undo2 } from "lucide-react";
import { apiRequest } from "../api/client";
import { OperationFeedback, type OperationFeedbackState } from "../components/OperationFeedback";
import { studentRows } from "../data/prototype";
import {
  formatOperationTime,
  formatWorkflowDate,
  readPositiveQuery,
  timelineText,
  writeWorkflowQuery,
  type LeaveDetail,
  type LeaveRequest,
  type StudentItem,
  type TimelineItem,
} from "./studentWorkflowShared";

const defaultStartTime = "2026-06-20T09:00:00";
const defaultEndTime = "2026-06-20T18:00:00";

export default function StudentLeaveWorkflowPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(readPositiveQuery("studentId") ?? studentRows[0].id);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [selectedLeaveId, setSelectedLeaveId] = useState<number | null>(readPositiveQuery("leaveId"));
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [reason, setReason] = useState("6月20日需要办理签证材料，请假一天。");
  const [pendingAction, setPendingAction] = useState<"load" | "create" | "update" | "cancel" | null>(null);
  const [feedback, setFeedback] = useState<OperationFeedbackState>({
    phase: "idle",
    title: "请假申请待提交",
    detail: "填写请假原因后提交给老师审批，处理结果会在本页回显。",
  });

  const currentStudent = students.find((item) => item.id === selectedStudentId) ?? students[0];
  const selectedStudent = currentStudent
    ? {
        id: currentStudent.id,
        name: currentStudent.student_name,
        project: currentStudent.enrollment_project,
        status: currentStudent.status,
        risk: currentStudent.risk_level,
      }
    : (studentRows.find((item) => item.id === selectedStudentId) ?? studentRows[0]);
  const selectedLeave = leaves.find((item) => item.id === selectedLeaveId) ?? leaves[0] ?? null;

  useEffect(() => {
    void loadStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      writeWorkflowQuery({ studentId: selectedStudent.id, leaveId: selectedLeaveId });
      void loadLeaves(selectedStudent.id);
    }
  }, [selectedStudent?.id]);

  useEffect(() => {
    if (selectedLeave?.id) {
      setSelectedLeaveId(selectedLeave.id);
      setReason(selectedLeave.reason);
      writeWorkflowQuery({ studentId: selectedStudent.id, leaveId: selectedLeave.id });
      void loadLeaveDetail(selectedLeave.id);
    } else {
      setTimeline([]);
      writeWorkflowQuery({ studentId: selectedStudent.id, leaveId: null });
    }
  }, [selectedLeave?.id]);

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

  async function loadLeaves(studentId = selectedStudent.id) {
    setPendingAction("load");
    try {
      const data = await apiRequest<LeaveRequest[]>(`/api/student-assistant/leaves?student_id=${studentId}`);
      setLeaves(data);
      const restoredLeaveId = readPositiveQuery("leaveId");
      const nextLeave = data.find((item) => item.id === restoredLeaveId) ?? data[0] ?? null;
      setSelectedLeaveId(nextLeave?.id ?? null);
      setFeedback({
        phase: "success",
        title: "请假记录已同步",
        detail: `当前学生共有 ${data.length} 条请假记录，可查看详情、撤销或补充。`,
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setFeedback({
        phase: "error",
        title: "请假记录加载失败",
        detail: error instanceof Error ? `${error.message}。可稍后重试。` : "服务暂不可用，可稍后重试。",
        target: selectedStudent.name,
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

  async function submitLeave() {
    const content = reason.trim();
    if (!content) {
      setFeedback({
        phase: "error",
        title: "请假申请未提交",
        detail: "请先填写请假原因。",
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
      return;
    }
    setPendingAction("create");
    setFeedback({
      phase: "pending",
      title: "正在提交请假申请",
      detail: "提交后老师端请假审批队列会同步出现该申请。",
      target: selectedStudent.name,
    });
    try {
      const leave = await apiRequest<LeaveRequest>("/api/student-assistant/leaves", {
        method: "POST",
        body: JSON.stringify({
          student_id: selectedStudent.id,
          reason: content,
          start_time: defaultStartTime,
          end_time: defaultEndTime,
          actor_username: "admin",
        }),
      });
      setSelectedLeaveId(leave.id);
      await loadLeaves(selectedStudent.id);
      await loadLeaveDetail(leave.id);
      setFeedback({
        phase: "success",
        title: "请假申请已提交",
        detail: `请假 #${leave.id} 已进入审批队列，刷新后仍会停留在当前申请。`,
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setFeedback({
        phase: "error",
        title: "请假申请提交失败",
        detail: error instanceof Error ? `${error.message}。内容已保留，可重试。` : "服务暂不可用。内容已保留，可重试。",
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function updateLeave() {
    if (!selectedLeave) return;
    setPendingAction("update");
    try {
      const leave = await apiRequest<LeaveRequest>(`/api/student-assistant/leaves/${selectedLeave.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          reason,
          start_time: selectedLeave.start_time ?? defaultStartTime,
          end_time: selectedLeave.end_time ?? defaultEndTime,
          actor_username: "admin",
        }),
      });
      await loadLeaves(selectedStudent.id);
      await loadLeaveDetail(leave.id);
      setFeedback({
        phase: "success",
        title: "请假申请已补充",
        detail: `请假 #${leave.id} 已更新，老师端可看到最新原因。`,
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setFeedback({
        phase: "error",
        title: "请假补充失败",
        detail: error instanceof Error ? `${error.message}。` : "服务暂不可用，可重试。",
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function cancelLeave() {
    if (!selectedLeave) return;
    setPendingAction("cancel");
    try {
      const leave = await apiRequest<LeaveRequest>(`/api/student-assistant/leaves/${selectedLeave.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: "学生主动撤销。", actor_username: "admin" }),
      });
      await loadLeaves(selectedStudent.id);
      await loadLeaveDetail(leave.id);
      setFeedback({
        phase: "success",
        title: "请假申请已撤销",
        detail: `请假 #${leave.id} 当前状态：${leave.status}。`,
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setFeedback({
        phase: "error",
        title: "请假撤销失败",
        detail: error instanceof Error ? `${error.message}。` : "服务暂不可用，可重试。",
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingAction(null);
    }
  }

  const canEdit = selectedLeave ? ["待审批", "待补充"].includes(selectedLeave.status) : false;
  const canCancel = selectedLeave?.status === "待审批";
  const isBusy = pendingAction !== null;

  return (
    <div className="page-stack workflow-page">
      <section className="page-heading workflow-heading">
        <div>
          <p className="eyebrow">学生服务台 / 请假申请</p>
          <h2>提交请假、查看审批状态和处理记录</h2>
          <p>学生发起请假后，老师审批结果会回到本页。</p>
        </div>
        <button className="icon-button secondary" onClick={() => void loadLeaves()} disabled={isBusy}>
          <RefreshCw className={pendingAction === "load" ? "spin-icon" : ""} size={16} aria-hidden="true" />
          刷新请假
        </button>
      </section>

      <section className="toolbar workflow-toolbar">
        <OperationFeedback feedback={feedback} />
      </section>

      <section className="workflow-metric-grid" aria-label="请假申请摘要">
        <article><span>我的请假</span><strong>{leaves.length}</strong><em>全部记录</em></article>
        <article><span>待审批</span><strong>{leaves.filter((item) => item.status === "待审批").length}</strong><em>等待老师处理</em></article>
        <article><span>当前状态</span><strong>{selectedLeave?.status ?? "未选择"}</strong><em>刷新后保留</em></article>
      </section>

      <section className="workflow-student-layout">
        <div className="workflow-main-column">
          <section className="panel-block">
            <div className="section-title">
              <h3>请假表单</h3>
              <CalendarDays size={18} aria-hidden="true" />
            </div>
            <div className="compact-form-grid">
              <label>
                <span>请假原因</span>
                <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={5} />
              </label>
              <label>
                <span>请假时间</span>
                <input value="2026-06-20 09:00 - 18:00" readOnly />
              </label>
            </div>
            <div className="inline-actions">
              <button onClick={() => void submitLeave()} disabled={isBusy}>
                {pendingAction === "create" ? "正在提交" : "提交新请假"}
              </button>
              <button className="ghost-button" onClick={() => void updateLeave()} disabled={isBusy || !canEdit}>
                <FileText size={15} aria-hidden="true" />
                补充当前申请
              </button>
              <button className="ghost-button" onClick={() => void cancelLeave()} disabled={isBusy || !canCancel}>
                <Undo2 size={15} aria-hidden="true" />
                撤销当前申请
              </button>
            </div>
          </section>

          <section className="panel-block workflow-list-panel">
            <div className="section-title">
              <h3>我的请假</h3>
              <span>{leaves.length} 条</span>
            </div>
            <div className="select-list workflow-list workflow-scroll-list">
              {leaves.map((item) => (
                <button className={item.id === selectedLeave?.id ? "active" : ""} key={item.id} onClick={() => setSelectedLeaveId(item.id)}>
                  <strong>#{item.id} {item.status}</strong>
                  <span>{item.reason}</span>
                  <em>{formatWorkflowDate(item.start_time)} - {formatWorkflowDate(item.end_time)}</em>
                </button>
              ))}
              {!leaves.length ? <div className="empty-state">暂无请假记录，可从中间表单提交。</div> : null}
            </div>
          </section>
        </div>

        <div className="workflow-detail-column">
          <section className="panel-block">
            <div className="section-title">
              <h3>请假详情</h3>
              <span className="status-pill">{selectedLeave?.status ?? "未选择"}</span>
            </div>
            {selectedLeave ? (
              <div className="workflow-detail-card">
                <strong>请假 #{selectedLeave.id}</strong>
                <span>{selectedLeave.reason}</span>
                <p>时间：{formatWorkflowDate(selectedLeave.start_time)} - {formatWorkflowDate(selectedLeave.end_time)}</p>
                <p>审批时间：{formatWorkflowDate(selectedLeave.approved_at)}</p>
              </div>
            ) : (
              <div className="empty-state">请选择一条请假记录。</div>
            )}
          </section>

          <section className="panel-block workflow-history-panel">
            <div className="section-title">
              <h3>处理记录</h3>
              <span>{timeline.length} 条</span>
            </div>
            <div className="timeline workflow-history-list">
              {timeline.map((item) => (
                <article key={item.id}>
                  <span>{formatWorkflowDate(item.created_at)}</span>
                  <div>
                    <strong>{item.action}</strong>
                    <p>{timelineText(item)}</p>
                  </div>
                </article>
              ))}
              {!timeline.length ? <div className="empty-state">提交或选择记录后查看时间线。</div> : null}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
