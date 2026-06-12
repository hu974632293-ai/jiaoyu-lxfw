import { useEffect, useState } from "react";
import { ClipboardCheck, RefreshCw } from "lucide-react";
import { apiRequest } from "../api/client";
import { OperationFeedback, type OperationFeedbackState } from "../components/OperationFeedback";
import { studentRows } from "../data/prototype";
import {
  formatOperationTime,
  formatWorkflowDate,
  readPositiveQuery,
  writeWorkflowQuery,
  type StudentGrade,
  type StudentItem,
} from "./studentWorkflowShared";

export default function StudentGradeWorkflowPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(readPositiveQuery("studentId") ?? studentRows[0].id);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(readPositiveQuery("gradeId"));
  const [pendingAction, setPendingAction] = useState<"load" | null>(null);
  const [feedback, setFeedback] = useState<OperationFeedbackState>({
    phase: "idle",
    title: "成绩查询待刷新",
    detail: "学生只能查看自己的课程成绩和老师反馈，成绩录入由老师工作台完成。",
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
  const selectedGrade = selectedGradeId ? grades.find((item) => item.id === selectedGradeId) : grades[0] ?? null;
  const isBusy = pendingAction !== null;

  useEffect(() => {
    void loadStudents();
  }, []);

  useEffect(() => {
    writeWorkflowQuery({ studentId: selectedStudent.id, gradeId: selectedGradeId });
    void loadGrades(selectedStudent.id);
  }, [selectedStudent.id]);

  useEffect(() => {
    if (selectedGrade?.id) {
      setSelectedGradeId(selectedGrade.id);
      writeWorkflowQuery({ studentId: selectedStudent.id, gradeId: selectedGrade.id });
    } else {
      writeWorkflowQuery({ studentId: selectedStudent.id, gradeId: null });
    }
  }, [selectedGrade?.id]);

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

  async function loadGrades(studentId = selectedStudent.id) {
    setPendingAction("load");
    try {
      const data = await apiRequest<StudentGrade[]>(`/api/student-assistant/students/${studentId}/grades`);
      setGrades(data);
      const restoredGradeId = readPositiveQuery("gradeId");
      const nextGrade = data.find((item) => item.id === restoredGradeId) ?? data[0] ?? null;
      setSelectedGradeId(nextGrade?.id ?? null);
      setFeedback({
        phase: "success",
        title: "成绩已刷新",
        detail: `已查到 ${data.length} 条成绩记录，可查看课程、分数和老师反馈。`,
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setFeedback({
        phase: "error",
        title: "成绩查询失败",
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
  const averageScore = grades.length
    ? Math.round(grades.reduce((total, item) => total + (item.score ?? 0), 0) / grades.length)
    : null;

  return (
    <div className="page-stack workflow-page">
      <section className="page-heading workflow-heading">
        <div>
          <p className="eyebrow">学生服务台 / 成绩查询</p>
          <h2>查看课程成绩、测评时间和老师反馈</h2>
          <p>本页只读展示成绩，不提供老师录入或修改入口。</p>
        </div>
        <button className="icon-button secondary" onClick={() => void loadGrades()} disabled={isBusy}>
          <RefreshCw className={pendingAction === "load" ? "spin-icon" : ""} size={16} aria-hidden="true" />
          刷新成绩
        </button>
      </section>

      <section className="toolbar workflow-toolbar">
        <OperationFeedback feedback={feedback} />
      </section>

      <section className="workflow-metric-grid" aria-label="成绩查询摘要">
        <article><span>当前学生</span><strong>{selectedStudent.name}</strong><em>{selectedStudent.project}</em></article>
        <article><span>成绩记录</span><strong>{grades.length}</strong><em>老师已发布</em></article>
        <article><span>平均分</span><strong>{averageScore ?? "暂无"}</strong><em>按当前记录估算</em></article>
      </section>

      <section className="workflow-student-layout">
        <div className="workflow-main-column">
          <section className="panel-block workflow-list-panel">
            <div className="section-title">
              <h3>成绩列表</h3>
              <span>{grades.length} 条</span>
            </div>
            <div className="select-list workflow-list workflow-scroll-list">
              {grades.map((item) => (
                <button className={item.id === selectedGrade?.id ? "active" : ""} key={item.id} onClick={() => setSelectedGradeId(item.id)}>
                  <strong>{item.course_name}</strong>
                  <span>{item.score ?? "待登记"} 分</span>
                  <em>{formatWorkflowDate(item.exam_time)}</em>
                </button>
              ))}
              {!grades.length ? <div className="empty-state">暂无成绩记录，老师录入后会在这里显示。</div> : null}
            </div>
          </section>

          <section className="panel-block">
            <div className="section-title">
              <h3>我的身份</h3>
              <ClipboardCheck size={18} aria-hidden="true" />
            </div>
            <div className="select-list workflow-list workflow-scroll-list">
              {displayStudents.map((item) => (
                <button className={item.id === selectedStudent.id ? "active" : ""} key={item.id} onClick={() => setSelectedStudentId(item.id)}>
                  <strong>{item.name}</strong>
                  <span>{item.project}</span>
                  <em>{item.status}</em>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="workflow-detail-column">
          <section className="panel-block">
            <div className="section-title">
              <h3>成绩详情</h3>
              <span className="status-pill">{selectedGrade ? `#${selectedGrade.id}` : "未选择"}</span>
            </div>
            {selectedGrade ? (
              <div className="workflow-detail-card">
                <strong>{selectedGrade.course_name}</strong>
                <span>{selectedGrade.score ?? "待登记"} 分</span>
                <p>测评时间：{formatWorkflowDate(selectedGrade.exam_time)}</p>
                <p>更新时间：{formatWorkflowDate(selectedGrade.updated_at ?? selectedGrade.created_at)}</p>
              </div>
            ) : (
              <div className="empty-state">请选择一条成绩查看详情。</div>
            )}
          </section>

          <section className="panel-block workflow-history-panel">
            <div className="section-title">
              <h3>老师反馈</h3>
              <span>{selectedGrade ? "1 条" : "0 条"}</span>
            </div>
            <div className="timeline workflow-history-list">
              {selectedGrade ? (
                <article>
                  <span>{formatWorkflowDate(selectedGrade.updated_at ?? selectedGrade.created_at)}</span>
                  <div>
                    <strong>{selectedGrade.course_name}</strong>
                    <p>{selectedGrade.teacher_feedback || "暂无老师反馈"}</p>
                  </div>
                </article>
              ) : (
                <div className="empty-state">选择成绩后查看老师反馈。</div>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
