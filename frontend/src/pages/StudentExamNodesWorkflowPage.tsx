import { useEffect, useState } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import { apiRequest } from "../api/client";
import { OperationFeedback, type OperationFeedbackState } from "../components/OperationFeedback";
import { studentRows } from "../data/prototype";
import {
  formatOperationTime,
  formatWorkflowDate,
  readPositiveQuery,
  writeWorkflowQuery,
  type AcademicEvent,
  type StudentItem,
} from "./studentWorkflowShared";

export default function StudentExamNodesWorkflowPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(readPositiveQuery("studentId") ?? studentRows[0].id);
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(readPositiveQuery("eventId"));
  const [pendingAction, setPendingAction] = useState<"load" | null>(null);
  const [feedback, setFeedback] = useState<OperationFeedbackState>({
    phase: "idle",
    title: "考务节点待刷新",
    detail: "查看考试、DDL、材料提醒和节点状态。",
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
  const selectedEvent = selectedEventId ? events.find((item) => item.id === selectedEventId) : events[0] ?? null;
  const isBusy = pendingAction !== null;

  useEffect(() => {
    void loadStudents();
  }, []);

  useEffect(() => {
    writeWorkflowQuery({ studentId: selectedStudent.id, eventId: selectedEventId });
    void loadEvents(selectedStudent.id);
  }, [selectedStudent.id]);

  useEffect(() => {
    if (selectedEvent?.id) {
      setSelectedEventId(selectedEvent.id);
      writeWorkflowQuery({ studentId: selectedStudent.id, eventId: selectedEvent.id });
    }
  }, [selectedEvent?.id]);

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

  async function loadEvents(studentId = selectedStudent.id) {
    setPendingAction("load");
    try {
      const data = await apiRequest<AcademicEvent[]>(`/api/student-assistant/students/${studentId}/academic-events`);
      setEvents(data);
      const restoredEventId = readPositiveQuery("eventId");
      setSelectedEventId((data.find((item) => item.id === restoredEventId) ?? data[0] ?? null)?.id ?? null);
      setFeedback({
        phase: "success",
        title: "考务节点已刷新",
        detail: `已读取 ${data.length} 个考试或材料节点。`,
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setFeedback({
        phase: "error",
        title: "考务节点加载失败",
        detail: error instanceof Error ? `${error.message}。可稍后重试。` : "服务暂不可用，可稍后重试。",
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingAction(null);
    }
  }

  const pendingEvents = events.filter((item) => item.status !== "已完成").length;

  return (
    <div className="page-stack workflow-page">
      <section className="page-heading workflow-heading">
        <div>
          <p className="eyebrow">学生服务台 / 考务节点</p>
          <h2>查看考试、材料 DDL 和提醒节点</h2>
          <p>本页只展示本人考务和材料提醒，不承载管理报表。</p>
        </div>
        <button className="icon-button secondary" onClick={() => void loadEvents()} disabled={isBusy}>
          <RefreshCw className={pendingAction === "load" ? "spin-icon" : ""} size={16} aria-hidden="true" />
          刷新节点
        </button>
      </section>

      <section className="toolbar workflow-toolbar">
        <OperationFeedback feedback={feedback} />
      </section>

      <section className="workflow-metric-grid" aria-label="考务节点摘要">
        <article><span>当前学生</span><strong>{selectedStudent.name}</strong><em>{selectedStudent.project}</em></article>
        <article><span>节点总数</span><strong>{events.length}</strong><em>{pendingEvents} 个待跟进</em></article>
        <article><span>当前节点</span><strong>{selectedEvent?.event_name ?? "暂无"}</strong><em>{selectedEvent?.status ?? "待刷新"}</em></article>
      </section>

      <section className="workflow-student-layout">
        <div className="workflow-main-column">
          <section className="panel-block workflow-list-panel">
            <div className="section-title">
              <h3>考务节点</h3>
              <span>{events.length} 项</span>
            </div>
            <div className="select-list workflow-list workflow-scroll-list">
              {events.map((item) => (
                <button className={item.id === selectedEvent?.id ? "active" : ""} key={item.id} onClick={() => setSelectedEventId(item.id)}>
                  <strong>{item.event_name}</strong>
                  <span>{item.event_type} / {item.status}</span>
                  <em>{formatWorkflowDate(item.due_time)}</em>
                </button>
              ))}
              {!events.length ? <div className="empty-state">暂无考务节点，可刷新后再查看。</div> : null}
            </div>
          </section>

          <section className="panel-block">
            <div className="section-title">
              <h3>本人信息</h3>
              <CalendarDays size={18} aria-hidden="true" />
            </div>
            <div className="workflow-detail-card">
              <strong>{selectedStudent.name}</strong>
              <span>{selectedStudent.project}</span>
              <p>当前服务状态：{selectedStudent.status}</p>
              <p>风险提示：{selectedStudent.risk}</p>
            </div>
          </section>
        </div>

        <div className="workflow-detail-column">
          <section className="panel-block">
            <div className="section-title">
              <h3>节点详情</h3>
              <span className="status-pill">{selectedEvent?.status ?? "未选择"}</span>
            </div>
            {selectedEvent ? (
              <div className="workflow-detail-card">
                <strong>{selectedEvent.event_name}</strong>
                <span>{selectedEvent.event_type}</span>
                <p>截止时间：{formatWorkflowDate(selectedEvent.due_time)}</p>
                <p>当前状态：{selectedEvent.status}</p>
              </div>
            ) : (
              <div className="empty-state">请选择一个考务节点查看详情。</div>
            )}
          </section>

          <section className="panel-block workflow-history-panel">
            <div className="section-title">
              <h3>提醒记录</h3>
              <span>{selectedEvent ? "1 条" : "0 条"}</span>
            </div>
            <div className="timeline workflow-history-list">
              {selectedEvent ? (
                <article>
                  <span>{formatWorkflowDate(selectedEvent.due_time)}</span>
                  <div>
                    <strong>{selectedEvent.event_name}</strong>
                    <p>{selectedEvent.event_type} 节点处于 {selectedEvent.status}，请按时间准备材料或考试。</p>
                  </div>
                </article>
              ) : (
                <div className="empty-state">选择节点后查看提醒。</div>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
