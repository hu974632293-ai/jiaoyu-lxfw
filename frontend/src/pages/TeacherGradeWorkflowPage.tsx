import { useEffect, useState } from "react";
import { ClipboardCheck, FilePlus2, RefreshCw } from "lucide-react";
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

const defaultGradeForm = {
  course_name: "德语 A2 阶段测评",
  score: "86",
  teacher_feedback: "词汇掌握稳定，口语表达需要继续练习。",
};

export default function TeacherGradeWorkflowPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(readPositiveQuery("studentId") ?? studentRows[0].id);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(readPositiveQuery("gradeId"));
  const [gradeForm, setGradeForm] = useState(defaultGradeForm);
  const [pendingAction, setPendingAction] = useState<"load" | "save" | null>(null);
  const [feedback, setFeedback] = useState<OperationFeedbackState>({
    phase: "idle",
    title: "成绩录入待处理",
    detail: "选择学生后可录入或修改课程成绩，学生端会同步只读查看成绩和老师反馈。",
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
  const selectedGrade = selectedGradeId ? grades.find((item) => item.id === selectedGradeId) : null;
  const isBusy = pendingAction !== null;

  useEffect(() => {
    void loadStudents();
  }, []);

  useEffect(() => {
    writeWorkflowQuery({ studentId: selectedStudent.id, gradeId: selectedGradeId });
    void loadGrades(selectedStudent.id);
  }, [selectedStudent.id]);

  useEffect(() => {
    if (selectedGrade) {
      setGradeForm({
        course_name: selectedGrade.course_name,
        score: selectedGrade.score == null ? "" : String(selectedGrade.score),
        teacher_feedback: selectedGrade.teacher_feedback,
      });
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
        title: "成绩记录已同步",
        detail: `当前学生共有 ${data.length} 条成绩记录，可继续录入新成绩或修改已有反馈。`,
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setFeedback({
        phase: "error",
        title: "成绩记录加载失败",
        detail: error instanceof Error ? `${error.message}。可稍后重试。` : "服务暂不可用，可稍后重试。",
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function saveGrade() {
    const courseName = gradeForm.course_name.trim();
    const score = Number(gradeForm.score);
    if (!courseName || Number.isNaN(score)) {
      setFeedback({
        phase: "error",
        title: "成绩未保存",
        detail: "请填写课程名称和有效分数。",
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
      return;
    }
    setPendingAction("save");
    setFeedback({
      phase: "pending",
      title: selectedGrade ? "正在修改成绩" : "正在录入成绩",
      detail: "保存后学生成绩查询页会同步显示课程、分数和老师反馈。",
      target: selectedStudent.name,
    });
    try {
      const result = await apiRequest<StudentGrade>(selectedGrade ? `/api/student-assistant/grades/${selectedGrade.id}` : "/api/student-assistant/grades", {
        method: selectedGrade ? "PATCH" : "POST",
        body: JSON.stringify({
          student_id: selectedStudent.id,
          course_name: courseName,
          score,
          exam_time: selectedGrade?.exam_time ?? "2026-06-18T10:00:00",
          teacher_feedback: gradeForm.teacher_feedback,
          actor_username: "admin",
        }),
      });
      await loadGrades(selectedStudent.id);
      setSelectedGradeId(result.id);
      setFeedback({
        phase: "success",
        title: selectedGrade ? "成绩已修改" : "成绩已录入",
        detail: `${result.course_name}：${result.score ?? "待登记"} 分，学生端可查看老师反馈。`,
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setFeedback({
        phase: "error",
        title: "成绩保存失败",
        detail: error instanceof Error ? `${error.message}。成绩未改动，可重试。` : "服务暂不可用，成绩未改动，可重试。",
        target: selectedStudent.name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingAction(null);
    }
  }

  function startNewGrade() {
    setSelectedGradeId(null);
    setGradeForm(defaultGradeForm);
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

  return (
    <div className="page-stack workflow-page">
      <section className="page-heading workflow-heading">
        <div>
          <p className="eyebrow">老师工作台 / 成绩录入</p>
          <h2>按学生录入成绩、修改反馈并同步给学生查看</h2>
          <p>本页只处理成绩记录，不混入请假审批、反馈工单或心理辅助预警。</p>
        </div>
        <button className="icon-button secondary" onClick={() => void loadGrades()} disabled={isBusy}>
          <RefreshCw className={pendingAction === "load" ? "spin-icon" : ""} size={16} aria-hidden="true" />
          刷新成绩
        </button>
      </section>

      <section className="toolbar workflow-toolbar">
        <OperationFeedback feedback={feedback} />
      </section>

      <section className="workflow-metric-grid" aria-label="成绩录入摘要">
        <article><span>当前学生</span><strong>{selectedStudent.name}</strong><em>{selectedStudent.project}</em></article>
        <article><span>成绩记录</span><strong>{grades.length}</strong><em>课程与测评</em></article>
        <article><span>当前记录</span><strong>{selectedGrade ? `#${selectedGrade.id}` : "新增"}</strong><em>{selectedGrade?.course_name ?? "待录入"}</em></article>
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

        <section className="panel-block">
          <div className="section-title">
            <h3>{selectedGrade ? "修改成绩" : "录入成绩"}</h3>
            <ClipboardCheck size={18} aria-hidden="true" />
          </div>
          <div className="compact-form-grid">
            <label>
              <span>课程</span>
              <input value={gradeForm.course_name} onChange={(event) => setGradeForm((current) => ({ ...current, course_name: event.target.value }))} />
            </label>
            <label>
              <span>分数</span>
              <input value={gradeForm.score} onChange={(event) => setGradeForm((current) => ({ ...current, score: event.target.value }))} />
            </label>
            <label>
              <span>老师反馈</span>
              <textarea value={gradeForm.teacher_feedback} onChange={(event) => setGradeForm((current) => ({ ...current, teacher_feedback: event.target.value }))} rows={5} />
            </label>
          </div>
          <div className="inline-actions">
            <button onClick={() => void saveGrade()} disabled={isBusy}>
              {pendingAction === "save" ? "正在保存" : selectedGrade ? "保存修改" : "录入成绩"}
            </button>
            <button className="ghost-button" onClick={startNewGrade} disabled={isBusy}>
              <FilePlus2 size={15} aria-hidden="true" />
              新增一条
            </button>
          </div>
        </section>

        <div className="workflow-detail-column">
          <section className="panel-block">
            <div className="section-title">
              <h3>成绩详情</h3>
              <span className="status-pill">{selectedGrade ? `#${selectedGrade.id}` : "新增"}</span>
            </div>
            {selectedGrade ? (
              <div className="workflow-detail-card">
                <strong>{selectedGrade.course_name}</strong>
                <span>{selectedGrade.score ?? "待登记"} 分</span>
                <p>测评时间：{formatWorkflowDate(selectedGrade.exam_time)}</p>
                <p>老师反馈：{selectedGrade.teacher_feedback || "暂无老师反馈"}</p>
              </div>
            ) : (
              <div className="empty-state">正在新增成绩，保存后会出现在成绩记录中。</div>
            )}
          </section>

          <section className="panel-block workflow-history-panel">
            <div className="section-title">
              <h3>成绩记录</h3>
              <span>{grades.length} 条</span>
            </div>
            <div className="select-list workflow-list workflow-scroll-list">
              {grades.map((item) => (
                <button className={item.id === selectedGrade?.id ? "active" : ""} key={item.id} onClick={() => setSelectedGradeId(item.id)}>
                  <strong>{item.course_name}</strong>
                  <span>{item.score ?? "待登记"} 分</span>
                  <em>{item.teacher_feedback || "暂无老师反馈"}</em>
                </button>
              ))}
              {!grades.length ? <div className="empty-state">暂无成绩记录，可从中间表单录入。</div> : null}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
