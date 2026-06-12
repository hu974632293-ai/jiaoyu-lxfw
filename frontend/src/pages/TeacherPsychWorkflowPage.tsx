import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { apiRequest } from "../api/client";
import { OperationFeedback, type OperationFeedbackState } from "../components/OperationFeedback";
import { psychAlerts, studentRows } from "../data/prototype";
import {
  formatOperationTime,
  formatWorkflowDate,
  readPositiveQuery,
  writeWorkflowQuery,
  type AcademicEvent,
  type ApplicationProgress,
  type StudentItem,
} from "./studentWorkflowShared";

type PsychAlert = {
  id: number;
  student_id: number;
  risk_level: string;
  trigger_reason: string;
  status: string;
};

type TeacherTasks = {
  leaves: unknown[];
  feedback_tickets: unknown[];
  psych_alerts: PsychAlert[];
  grades: unknown[];
};

const emptyTasks: TeacherTasks = { leaves: [], feedback_tickets: [], psych_alerts: [], grades: [] };

export default function TeacherPsychWorkflowPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [tasks, setTasks] = useState<TeacherTasks>(emptyTasks);
  const [selectedStudentId, setSelectedStudentId] = useState(readPositiveQuery("studentId") ?? studentRows[0].id);
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(readPositiveQuery("alertId"));
  const [academicEvents, setAcademicEvents] = useState<AcademicEvent[]>([]);
  const [progressItems, setProgressItems] = useState<ApplicationProgress[]>([]);
  const [pendingAction, setPendingAction] = useState<"load" | "follow" | null>(null);
  const [feedback, setFeedback] = useState<OperationFeedbackState>({
    phase: "idle",
    title: "心理预警待跟进",
    detail: "选择风险学生后查看触发原因、申请进度和跟进建议。",
  });

  const displayStudents = students.length
    ? students.map((item) => ({
        id: item.id,
        name: item.student_name,
        project: item.enrollment_project,
        status: item.status,
        risk: item.risk_level,
      }))
    : studentRows;
  const selectedStudent = displayStudents.find((item) => item.id === selectedStudentId) ?? displayStudents[0];
  const taskAlerts = tasks.psych_alerts;
  const fallbackAlerts: PsychAlert[] = psychAlerts.map((item, index) => ({
    id: index + 1,
    student_id: displayStudents.find((student) => student.name === item.student)?.id ?? displayStudents[index]?.id ?? selectedStudent.id,
    risk_level: item.level,
    trigger_reason: item.reason,
    status: item.status,
  }));
  const alerts = taskAlerts.length ? taskAlerts : fallbackAlerts;
  const selectedAlert =
    alerts.find((item) => item.id === selectedAlertId) ??
    alerts.find((item) => item.student_id === selectedStudent.id) ??
    alerts[0] ??
    null;
  const selectedAlertStudent = selectedAlert
    ? displayStudents.find((item) => item.id === selectedAlert.student_id) ?? selectedStudent
    : selectedStudent;
  const highRiskCount = alerts.filter((item) => item.risk_level.includes("高")).length;
  const isBusy = pendingAction !== null;

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (selectedAlert?.id) {
      setSelectedStudentId(selectedAlert.student_id);
      writeWorkflowQuery({ studentId: selectedAlert.student_id, alertId: selectedAlert.id });
      void loadStudentDetails(selectedAlert.student_id);
    } else {
      writeWorkflowQuery({ studentId: selectedStudent.id, alertId: null });
      void loadStudentDetails(selectedStudent.id);
    }
  }, [selectedAlert?.id, selectedStudent.id]);

  async function loadAll() {
    setPendingAction("load");
    setFeedback({
      phase: "pending",
      title: "正在加载心理预警",
      detail: "读取学生列表和老师待跟进风险队列。",
      target: "老师心理预警",
    });
    try {
      const [studentData, taskData] = await Promise.all([
        apiRequest<StudentItem[]>("/api/student-assistant/students"),
        apiRequest<TeacherTasks>("/api/student-assistant/teacher-tasks"),
      ]);
      setStudents(studentData);
      setTasks(taskData);
      const restoredStudentId = readPositiveQuery("studentId");
      const restoredAlertId = readPositiveQuery("alertId");
      const nextAlert = taskData.psych_alerts.find((item) => item.id === restoredAlertId) ?? taskData.psych_alerts[0] ?? null;
      const nextStudentId = nextAlert?.student_id ?? (studentData.some((item) => item.id === restoredStudentId) ? restoredStudentId : studentData[0]?.id);
      setSelectedAlertId(nextAlert?.id ?? null);
      if (nextStudentId) {
        setSelectedStudentId(nextStudentId);
      }
      setFeedback({
        phase: "success",
        title: "心理预警已同步",
        detail: `当前共有 ${taskData.psych_alerts.length || fallbackAlerts.length} 条辅助预警，按学生进入跟进。`,
        target: "老师心理预警",
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setFeedback({
        phase: "error",
        title: "心理预警加载失败",
        detail: error instanceof Error ? `${error.message}。可稍后重试。` : "服务暂不可用，可稍后重试。",
        target: "老师心理预警",
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingAction(null);
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

  function recordFollowUp() {
    setPendingAction("follow");
    window.setTimeout(() => {
      setFeedback({
        phase: "success",
        title: "跟进记录已更新",
        detail: selectedAlert
          ? `已记录 ${selectedAlertStudent.name} 的心理辅助跟进，建议持续观察并保留专业求助路径。`
          : "已记录当前学生的心理辅助跟进。",
        target: selectedAlertStudent.name,
        timestamp: formatOperationTime(),
      });
      setPendingAction(null);
    }, 150);
  }

  return (
    <div className="page-stack workflow-page teacher-psych-page">
      <section className="page-heading workflow-heading">
        <div>
          <p className="eyebrow">老师工作台 / 心理预警</p>
          <h2>查看心理辅助预警、跟进记录和学生进度</h2>
          <p>本页只做辅助识别和跟进提醒，不替代专业心理诊断。</p>
        </div>
        <button className="icon-button secondary" onClick={() => void loadAll()} disabled={isBusy}>
          <RefreshCw className={pendingAction === "load" ? "spin-icon" : ""} size={16} aria-hidden="true" />
          {pendingAction === "load" ? "正在刷新" : "刷新预警"}
        </button>
      </section>

      <section className="toolbar workflow-toolbar">
        <OperationFeedback feedback={feedback} />
      </section>

      <section className="workflow-metric-grid" aria-label="心理预警摘要">
        <article><span>辅助预警</span><strong>{alerts.length}</strong><em>{highRiskCount} 条高风险</em></article>
        <article><span>当前学生</span><strong>{selectedAlertStudent.name}</strong><em>{selectedAlertStudent.project}</em></article>
        <article><span>当前状态</span><strong>{selectedAlert?.status ?? selectedAlertStudent.status}</strong><em>需持续跟进</em></article>
      </section>

      <section className="workflow-action-layout teacher-psych-layout">
        <section className="panel-block workflow-list-panel">
          <div className="section-title">
            <h3>风险队列</h3>
            <span>{alerts.length} 条</span>
          </div>
          <div className="select-list workflow-list workflow-scroll-list">
            {alerts.map((item) => {
              const student = displayStudents.find((entry) => entry.id === item.student_id);
              return (
                <button className={item.id === selectedAlert?.id ? "active" : ""} key={item.id} onClick={() => setSelectedAlertId(item.id)}>
                  <strong>{student?.name ?? `学生 #${item.student_id}`} / {item.risk_level}</strong>
                  <span>{item.trigger_reason}</span>
                  <em>{item.status}</em>
                </button>
              );
            })}
            {!alerts.length ? <div className="empty-state">暂无心理辅助预警。</div> : null}
          </div>
        </section>

        <div className="workflow-detail-column">
          <section className="panel-block teacher-psych-focus-panel">
            <div className="section-title">
              <h3>跟进详情</h3>
              <AlertTriangle size={18} aria-hidden="true" />
            </div>
            {selectedAlert ? (
              <div className="workflow-detail-card">
                <strong>{selectedAlertStudent.name} / {selectedAlert.risk_level}</strong>
                <span>{selectedAlert.trigger_reason}</span>
                <p>当前状态：{selectedAlert.status}</p>
                <p>服务边界：仅用于辅助识别和跟进记录，需要时引导专业支持。</p>
              </div>
            ) : (
              <div className="empty-state">选择风险记录后查看详情。</div>
            )}
            <div className="inline-actions">
              <button onClick={recordFollowUp} disabled={isBusy || !selectedAlert}>
                <CheckCircle2 size={15} aria-hidden="true" />
                {pendingAction === "follow" ? "正在记录" : "记录跟进"}
              </button>
            </div>
          </section>

          <section className="panel-block workflow-history-panel">
            <div className="section-title">
              <h3>跟进建议</h3>
              <span>辅助提醒</span>
            </div>
            <div className="guide-list workflow-history-list">
              <article><strong>先确认安全状态</strong><span>优先确认学生是否需要立即联系家长、顾问或专业机构。</span></article>
              <article><strong>记录服务动作</strong><span>记录沟通时间、学生反馈、下一次回访节点和转介建议。</span></article>
              <article><strong>同步业务上下文</strong><span>结合申请进度、考务压力和生活反馈判断后续服务安排。</span></article>
            </div>
          </section>
        </div>

        <aside className="side-stack teacher-psych-side-panel">
          <section className="panel-block">
            <div className="section-title">
              <h3>申请进度</h3>
              <span>{progressItems.length} 项</span>
            </div>
            <div className="guide-list compact-scroll-list">
              {progressItems.map((item) => (
                <article key={item.id}>
                  <strong>{item.stage}</strong>
                  <span>{item.status} / {item.description}</span>
                </article>
              ))}
              {!progressItems.length ? <div className="empty-state">暂无申请进度记录。</div> : null}
            </div>
          </section>

          <section className="panel-block">
            <div className="section-title">
              <h3>考务节点</h3>
              <span>{academicEvents.length} 个</span>
            </div>
            <div className="guide-list compact-scroll-list">
              {academicEvents.map((item) => (
                <article key={item.id}>
                  <strong>{item.event_name}</strong>
                  <span>{item.event_type} / {item.status} / {formatWorkflowDate(item.due_time)}</span>
                </article>
              ))}
              {!academicEvents.length ? <div className="empty-state">暂无考务节点。</div> : null}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
