import { useEffect, useState } from "react";
import { FileText, RefreshCw } from "lucide-react";
import { apiRequest } from "../api/client";
import { OperationFeedback, type OperationFeedbackState } from "../components/OperationFeedback";
import { studentRows } from "../data/prototype";
import {
  formatOperationTime,
  formatWorkflowDate,
  readPositiveQuery,
  writeWorkflowQuery,
  type ApplicationProgress,
  type StudentItem,
} from "./studentWorkflowShared";

export default function StudentApplicationProgressWorkflowPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(readPositiveQuery("studentId") ?? studentRows[0].id);
  const [progressItems, setProgressItems] = useState<ApplicationProgress[]>([]);
  const [selectedProgressId, setSelectedProgressId] = useState<number | null>(readPositiveQuery("progressId"));
  const [pendingAction, setPendingAction] = useState<"load" | null>(null);
  const [feedback, setFeedback] = useState<OperationFeedbackState>({
    phase: "idle",
    title: "申请进度待刷新",
    detail: "查看文书、院校、签证等阶段状态和下一步动作。",
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
  const selectedProgress = selectedProgressId ? progressItems.find((item) => item.id === selectedProgressId) : progressItems[0] ?? null;
  const isBusy = pendingAction !== null;

  useEffect(() => {
    void loadStudents();
  }, []);

  useEffect(() => {
    writeWorkflowQuery({ studentId: selectedStudent.id, progressId: selectedProgressId });
    void loadProgress(selectedStudent.id);
  }, [selectedStudent.id]);

  useEffect(() => {
    if (selectedProgress?.id) {
      setSelectedProgressId(selectedProgress.id);
      writeWorkflowQuery({ studentId: selectedStudent.id, progressId: selectedProgress.id });
    }
  }, [selectedProgress?.id]);

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

  async function loadProgress(studentId = selectedStudent.id) {
    setPendingAction("load");
    try {
      const data = await apiRequest<ApplicationProgress[]>(`/api/student-assistant/students/${studentId}/application-progress`);
      setProgressItems(data);
      const restoredProgressId = readPositiveQuery("progressId");
      setSelectedProgressId((data.find((item) => item.id === restoredProgressId) ?? data[0] ?? null)?.id ?? null);
      setFeedback({
        phase: "success",
        title: "申请进度已刷新",
        detail: `已读取 ${data.length} 个申请阶段，可查看材料状态和下一步动作。`,
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setFeedback({
        phase: "error",
        title: "申请进度加载失败",
        detail: error instanceof Error ? `${error.message}。可稍后重试。` : "服务暂不可用，可稍后重试。",
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
          <p className="eyebrow">学生服务台 / 申请进度</p>
          <h2>查看申请阶段、材料状态和下一步动作</h2>
          <p>本页只展示本人申请进度，不暴露顾问内部 CRM 明细。</p>
        </div>
        <button className="icon-button secondary" onClick={() => void loadProgress()} disabled={isBusy}>
          <RefreshCw className={pendingAction === "load" ? "spin-icon" : ""} size={16} aria-hidden="true" />
          刷新进度
        </button>
      </section>

      <section className="toolbar workflow-toolbar">
        <OperationFeedback feedback={feedback} />
      </section>

      <section className="workflow-metric-grid" aria-label="申请进度摘要">
        <article><span>当前学生</span><strong>{selectedStudent.name}</strong><em>{selectedStudent.project}</em></article>
        <article><span>申请阶段</span><strong>{progressItems.length}</strong><em>文书、院校、签证</em></article>
        <article><span>当前阶段</span><strong>{selectedProgress?.stage ?? "暂无"}</strong><em>{selectedProgress?.status ?? "待刷新"}</em></article>
      </section>

      <section className="workflow-student-layout">
        <div className="workflow-main-column">
          <section className="panel-block workflow-list-panel">
            <div className="section-title">
              <h3>申请阶段</h3>
              <span>{progressItems.length} 项</span>
            </div>
            <div className="select-list workflow-list workflow-scroll-list">
              {progressItems.map((item) => (
                <button className={item.id === selectedProgress?.id ? "active" : ""} key={item.id} onClick={() => setSelectedProgressId(item.id)}>
                  <strong>{item.stage}</strong>
                  <span>{item.status}</span>
                  <em>{item.description}</em>
                </button>
              ))}
              {!progressItems.length ? <div className="empty-state">暂无申请进度，可刷新后再查看。</div> : null}
            </div>
          </section>

          <section className="panel-block">
            <div className="section-title">
              <h3>本人信息</h3>
              <FileText size={18} aria-hidden="true" />
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
              <h3>阶段详情</h3>
              <span className="status-pill">{selectedProgress?.status ?? "未选择"}</span>
            </div>
            {selectedProgress ? (
              <div className="workflow-detail-card">
                <strong>{selectedProgress.stage}</strong>
                <span>{selectedProgress.status}</span>
                <p>{selectedProgress.description}</p>
                <p>更新时间：{formatWorkflowDate(selectedProgress.updated_at ?? selectedProgress.created_at)}</p>
              </div>
            ) : (
              <div className="empty-state">请选择一个申请阶段查看详情。</div>
            )}
          </section>

          <section className="panel-block workflow-history-panel">
            <div className="section-title">
              <h3>下一步动作</h3>
              <span>{selectedProgress ? "已定位" : "待选择"}</span>
            </div>
            <div className="timeline workflow-history-list">
              {selectedProgress ? (
                <article>
                  <span>{formatWorkflowDate(selectedProgress.updated_at ?? selectedProgress.created_at)}</span>
                  <div>
                    <strong>{selectedProgress.stage}</strong>
                    <p>{selectedProgress.description}</p>
                  </div>
                </article>
              ) : (
                <div className="empty-state">选择阶段后查看下一步。</div>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
