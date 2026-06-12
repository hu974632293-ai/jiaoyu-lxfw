import { useEffect, useState } from "react";
import { CalendarDays, GraduationCap, RefreshCw } from "lucide-react";
import { apiRequest } from "../api/client";
import { OperationFeedback, type OperationFeedbackState } from "../components/OperationFeedback";
import { studentRows } from "../data/prototype";
import {
  formatOperationTime,
  formatWorkflowDate,
  readPositiveQuery,
  writeWorkflowQuery,
  type AcademicEvent,
  type ApplicationProgress,
  type StudentItem,
} from "./studentWorkflowShared";

export default function TeacherAcademicWorkflowPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(readPositiveQuery("studentId") ?? studentRows[0].id);
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [progressItems, setProgressItems] = useState<ApplicationProgress[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(readPositiveQuery("eventId"));
  const [selectedProgressId, setSelectedProgressId] = useState<number | null>(readPositiveQuery("progressId"));
  const [pendingAction, setPendingAction] = useState<"load" | null>(null);
  const [feedback, setFeedback] = useState<OperationFeedbackState>({
    phase: "idle",
    title: "学业进度待刷新",
    detail: "选择学生后可查看考务节点、申请进度和下一步提醒。",
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
  const selectedProgress = selectedProgressId ? progressItems.find((item) => item.id === selectedProgressId) : progressItems[0] ?? null;
  const isBusy = pendingAction !== null;

  useEffect(() => {
    void loadStudents();
  }, []);

  useEffect(() => {
    writeWorkflowQuery({ studentId: selectedStudent.id, eventId: selectedEventId, progressId: selectedProgressId });
    void loadAcademicData(selectedStudent.id);
  }, [selectedStudent.id]);

  useEffect(() => {
    if (selectedEvent?.id || selectedProgress?.id) {
      writeWorkflowQuery({ studentId: selectedStudent.id, eventId: selectedEvent?.id ?? null, progressId: selectedProgress?.id ?? null });
    }
  }, [selectedEvent?.id, selectedProgress?.id]);

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

  async function loadAcademicData(studentId = selectedStudent.id) {
    setPendingAction("load");
    try {
      const [eventData, progressData] = await Promise.all([
        apiRequest<AcademicEvent[]>(`/api/student-assistant/students/${studentId}/academic-events`),
        apiRequest<ApplicationProgress[]>(`/api/student-assistant/students/${studentId}/application-progress`),
      ]);
      setEvents(eventData);
      setProgressItems(progressData);
      const restoredEventId = readPositiveQuery("eventId");
      const restoredProgressId = readPositiveQuery("progressId");
      setSelectedEventId((eventData.find((item) => item.id === restoredEventId) ?? eventData[0] ?? null)?.id ?? null);
      setSelectedProgressId((progressData.find((item) => item.id === restoredProgressId) ?? progressData[0] ?? null)?.id ?? null);
      setFeedback({
        phase: "success",
        title: "学业进度已同步",
        detail: `已读取 ${eventData.length} 个考务节点和 ${progressData.length} 个申请阶段。`,
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setFeedback({
        phase: "error",
        title: "学业进度加载失败",
        detail: error instanceof Error ? `${error.message}。可稍后重试。` : "服务暂不可用，可稍后重试。",
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingAction(null);
    }
  }

  const displayStudents = students.length
    ? students.map((item) => ({
        id: item.id,
        name: item.student_name,
        project: item.enrollment_project,
        status: item.status,
        risk: item.risk_level,
      }))
    : studentRows;
  const pendingEvents = events.filter((item) => item.status !== "已完成").length;

  return (
    <div className="page-stack workflow-page">
      <section className="page-heading workflow-heading">
        <div>
          <p className="eyebrow">老师工作台 / 学业与进度</p>
          <h2>按学生查看考务节点、申请阶段和下一步提醒</h2>
          <p>本页只查看学业与申请进度，不混入成绩录入、请假审批或反馈处理。</p>
        </div>
        <button className="icon-button secondary" onClick={() => void loadAcademicData()} disabled={isBusy}>
          <RefreshCw className={pendingAction === "load" ? "spin-icon" : ""} size={16} aria-hidden="true" />
          刷新进度
        </button>
      </section>

      <section className="toolbar workflow-toolbar">
        <OperationFeedback feedback={feedback} />
      </section>

      <section className="workflow-metric-grid" aria-label="老师学业进度摘要">
        <article><span>当前学生</span><strong>{selectedStudent.name}</strong><em>{selectedStudent.project}</em></article>
        <article><span>考务节点</span><strong>{events.length}</strong><em>{pendingEvents} 个待跟进</em></article>
        <article><span>申请阶段</span><strong>{progressItems.length}</strong><em>{selectedProgress?.status ?? "暂无阶段"}</em></article>
      </section>

      <section className="workflow-action-layout">
        <section className="panel-block workflow-list-panel">
          <div className="section-title">
            <h3>学生列表</h3>
            <span>{displayStudents.length} 人</span>
          </div>
          <div className="select-list workflow-list workflow-scroll-list">
            {displayStudents.map((item) => (
              <button className={item.id === selectedStudent.id ? "active" : ""} key={item.id} onClick={() => setSelectedStudentId(item.id)}>
                <strong>{item.name}</strong>
                <span>{item.project}</span>
                <em>{item.status} / 风险 {item.risk}</em>
              </button>
            ))}
          </div>
        </section>

        <section className="panel-block workflow-list-panel">
          <div className="section-title">
            <h3>考务节点</h3>
            <CalendarDays size={18} aria-hidden="true" />
          </div>
          <div className="select-list workflow-list workflow-scroll-list">
            {events.map((item) => (
              <button className={item.id === selectedEvent?.id ? "active" : ""} key={item.id} onClick={() => setSelectedEventId(item.id)}>
                <strong>{item.event_name}</strong>
                <span>{item.event_type} / {item.status}</span>
                <em>{formatWorkflowDate(item.due_time)}</em>
              </button>
            ))}
            {!events.length ? <div className="empty-state">暂无考务节点，可刷新学生学业数据。</div> : null}
          </div>
        </section>

        <div className="workflow-detail-column">
          <section className="panel-block">
            <div className="section-title">
              <h3>申请阶段</h3>
              <GraduationCap size={18} aria-hidden="true" />
            </div>
            <div className="select-list workflow-list workflow-scroll-list">
              {progressItems.map((item) => (
                <button className={item.id === selectedProgress?.id ? "active" : ""} key={item.id} onClick={() => setSelectedProgressId(item.id)}>
                  <strong>{item.stage}</strong>
                  <span>{item.status}</span>
                  <em>{item.description}</em>
                </button>
              ))}
              {!progressItems.length ? <div className="empty-state">暂无申请阶段记录。</div> : null}
            </div>
          </section>

          <section className="panel-block workflow-history-panel">
            <div className="section-title">
              <h3>进度详情</h3>
              <span>{selectedProgress?.stage ?? selectedEvent?.event_name ?? "未选择"}</span>
            </div>
            <div className="timeline workflow-history-list">
              {selectedProgress ? (
                <article>
                  <span>{formatWorkflowDate(selectedProgress.updated_at ?? selectedProgress.created_at)}</span>
                  <div>
                    <strong>{selectedProgress.stage} / {selectedProgress.status}</strong>
                    <p>{selectedProgress.description}</p>
                  </div>
                </article>
              ) : null}
              {selectedEvent ? (
                <article>
                  <span>{formatWorkflowDate(selectedEvent.due_time)}</span>
                  <div>
                    <strong>{selectedEvent.event_name} / {selectedEvent.status}</strong>
                    <p>{selectedEvent.event_type} 节点，需按时间提醒学生准备。</p>
                  </div>
                </article>
              ) : null}
              {!selectedProgress && !selectedEvent ? <div className="empty-state">选择阶段或节点后查看详情。</div> : null}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
