import { useEffect, useState, type KeyboardEvent } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, GraduationCap, MessageSquare, RefreshCw } from "lucide-react";
import { apiRequest } from "../api/client";
import { OperationFeedback, type OperationFeedbackState } from "../components/OperationFeedback";
import { psychAlerts, studentRows } from "../data/prototype";

type StudentItem = {
  id: number;
  student_name: string;
  enrollment_project: string;
  status: string;
  risk_level: string;
};

type LeaveTask = {
  id: number;
  student_id: number;
  reason: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
};

type FeedbackTicket = {
  id: number;
  student_id: number;
  category: string;
  content: string;
  summary: string;
  status: string;
  resolution: string;
};

type PsychAlert = {
  id: number;
  student_id: number;
  risk_level: string;
  trigger_reason: string;
  status: string;
};

type AcademicEvent = {
  id: number;
  event_name: string;
  event_type: string;
  due_time: string | null;
  status: string;
};

type ApplicationProgress = {
  id: number;
  stage: string;
  status: string;
  description: string;
};

type StudentGrade = {
  id: number;
  student_id: number;
  course_name: string;
  score: number | null;
  exam_time: string | null;
  teacher_feedback: string;
  updated_at: string | null;
};

type TeacherTasks = {
  leaves: LeaveTask[];
  feedback_tickets: FeedbackTicket[];
  psych_alerts: PsychAlert[];
  grades: StudentGrade[];
};
type TimelineItem = {
  id: number;
  action: string;
  created_at: string | null;
  detail: Record<string, unknown>;
};
type TeacherAgentResult = {
  answer: string;
  status: string;
};
type TeacherOperation = "refresh" | "approveLeave" | "handleFeedback" | "closeFeedback" | "archiveFeedback" | "psych" | "academic" | "grade" | "agent" | null;
type TeacherActionKey = "leave" | "feedback" | "psych" | "academic" | "grade" | null;

const emptyTasks: TeacherTasks = { leaves: [], feedback_tickets: [], psych_alerts: [], grades: [] };

function formatOperationTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

export default function TeacherStudentServicePage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedId, setSelectedId] = useState(studentRows[0].id);
  const [tasks, setTasks] = useState<TeacherTasks>(emptyTasks);
  const [academicEvents, setAcademicEvents] = useState<AcademicEvent[]>([]);
  const [progressItems, setProgressItems] = useState<ApplicationProgress[]>([]);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [gradeForm, setGradeForm] = useState({
    course_name: "德语 A2 阶段测评",
    score: "86",
    teacher_feedback: "词汇掌握稳定，口语表达需要继续练习。",
  });
  const [selectedLeaveId, setSelectedLeaveId] = useState<number | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineItem[]>([]);
  const [operationFeedback, setOperationFeedback] = useState<OperationFeedbackState>({
    phase: "idle",
    title: "学生服务工作台待处理",
    detail: "可处理请假审批、反馈工单、心理辅助预警和学业进度查询。",
  });
  const [pendingOperation, setPendingOperation] = useState<TeacherOperation>(null);
  const [highlightAction, setHighlightAction] = useState<TeacherActionKey>(null);
  const [teacherAgentInput, setTeacherAgentInput] = useState("请帮我判断当前学生待办的处理优先级，并给出下一步建议。");
  const [teacherAgentResult, setTeacherAgentResult] = useState<TeacherAgentResult | null>(null);

  const displayStudents = students.length
    ? students.map((item) => ({
        id: item.id,
        name: item.student_name,
        project: item.enrollment_project,
        status: item.status,
        risk: item.risk_level,
      }))
    : studentRows;
  const selected = displayStudents.find((item) => item.id === selectedId) ?? displayStudents[0];
  const selectedLeave = tasks.leaves.find((item) => item.id === selectedLeaveId) ?? tasks.leaves[0];
  const selectedTicket = tasks.feedback_tickets.find((item) => item.id === selectedTicketId) ?? tasks.feedback_tickets[0];
  const selectedGrade = selectedGradeId ? grades.find((item) => item.id === selectedGradeId) : undefined;

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    void loadStudentDetails(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (selectedLeaveId) {
      void loadTimeline("leave", selectedLeaveId);
    }
  }, [selectedLeaveId]);

  useEffect(() => {
    if (selectedTicketId) {
      void loadTimeline("feedback", selectedTicketId);
    }
  }, [selectedTicketId]);

  async function loadAll() {
    setPendingOperation("refresh");
    setOperationFeedback({
      phase: "pending",
      title: "正在加载学生服务待办",
      detail: "读取学生列表、请假审批、反馈工单和心理辅助预警。",
      target: "老师工作台",
    });
    try {
      const [studentData, taskData] = await Promise.all([
        apiRequest<StudentItem[]>("/api/student-assistant/students"),
        apiRequest<TeacherTasks>("/api/student-assistant/teacher-tasks"),
      ]);
      setStudents(studentData);
      setTasks(taskData);
      if (studentData[0]) {
        setSelectedId(studentData[0].id);
      }
      setSelectedLeaveId(taskData.leaves[0]?.id ?? null);
      setSelectedTicketId(taskData.feedback_tickets[0]?.id ?? null);
      setOperationFeedback({
        phase: "success",
        title: "学生服务待办已加载",
        detail: `已同步 ${studentData.length || studentRows.length} 名学生和 ${taskData.leaves.length + taskData.feedback_tickets.length} 条待处理事项。`,
        target: "老师工作台",
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "学生服务待办加载失败",
        detail: error instanceof Error ? `${error.message}。已保留当前页面数据，可重试。` : "服务暂不可用。已保留当前页面数据，可重试。",
        target: "老师工作台",
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function loadStudentDetails(studentId: number) {
    try {
      const [academicData, progressData, gradeData] = await Promise.all([
        apiRequest<AcademicEvent[]>(`/api/student-assistant/students/${studentId}/academic-events`),
        apiRequest<ApplicationProgress[]>(`/api/student-assistant/students/${studentId}/application-progress`),
        apiRequest<StudentGrade[]>(`/api/student-assistant/students/${studentId}/grades`),
      ]);
      setAcademicEvents(academicData);
      setProgressItems(progressData);
      setGrades(gradeData);
      setSelectedGradeId(gradeData[0]?.id ?? null);
      if (gradeData[0]) {
        setGradeForm({
          course_name: gradeData[0].course_name,
          score: gradeData[0].score == null ? "" : String(gradeData[0].score),
          teacher_feedback: gradeData[0].teacher_feedback,
        });
      }
    } catch {
      setAcademicEvents([]);
      setProgressItems([]);
      setGrades([]);
      setSelectedGradeId(null);
    }
  }

  async function reloadTasks() {
    const data = await apiRequest<TeacherTasks>("/api/student-assistant/teacher-tasks");
    setTasks(data);
    setSelectedLeaveId((current) => current ?? data.leaves[0]?.id ?? null);
    setSelectedTicketId((current) => current ?? data.feedback_tickets[0]?.id ?? null);
  }

  async function askTeacherAgent() {
    const content = teacherAgentInput.trim();
    if (!content) {
      setOperationFeedback({
        phase: "error",
        title: "老师处理助手未发送",
        detail: "请先输入要处理的问题。当前学生和待办队列已保留。",
        target: selected.name,
        timestamp: formatOperationTime(),
      });
      return;
    }
    setPendingOperation("agent");
    setOperationFeedback({
      phase: "pending",
      title: "正在整理老师处理建议",
      detail: "围绕当前学生、请假、反馈、心理预警和学业节点生成处理建议。",
      target: selected.name,
    });
    try {
      const result = await apiRequest<TeacherAgentResult>("/api/student-assistant/chat", {
        method: "POST",
        body: JSON.stringify({ student_id: selected.id, message: content, actor_username: "teacher" }),
      });
      setTeacherAgentResult(result);
      setOperationFeedback({
        phase: result.status === "success" ? "success" : "fallback",
        title: "老师处理建议已返回",
        detail: "建议已显示在老师处理助手面板，确认写入仍需使用对应处理按钮。",
        target: selected.name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "老师处理建议生成失败",
        detail: error instanceof Error ? `${error.message}。输入内容已保留，可重试。` : "服务暂不可用。输入内容已保留，可重试。",
        target: selected.name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  function handleTeacherAgentKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!hasPendingOperation) {
        void askTeacherAgent();
      }
    }
  }

  async function saveGrade() {
    const score = Number(gradeForm.score);
    if (!gradeForm.course_name.trim() || Number.isNaN(score)) {
      setOperationFeedback({
        phase: "error",
        title: "成绩未保存",
        detail: "请填写课程名称和有效分数。",
        target: selected.name,
        timestamp: formatOperationTime(),
      });
      return;
    }
    setPendingOperation("grade");
    setOperationFeedback({
      phase: "pending",
      title: selectedGrade ? "正在修改成绩" : "正在录入成绩",
      detail: "保存后学生服务台可同步查看成绩和老师反馈。",
      target: selected.name,
    });
    try {
      const body = JSON.stringify({
        student_id: selected.id,
        course_name: gradeForm.course_name,
        score,
        exam_time: "2026-06-18T10:00:00",
        teacher_feedback: gradeForm.teacher_feedback,
        actor_username: "admin",
      });
      const result = await apiRequest<StudentGrade>(selectedGrade ? `/api/student-assistant/grades/${selectedGrade.id}` : "/api/student-assistant/grades", {
        method: selectedGrade ? "PATCH" : "POST",
        body,
      });
      await loadStudentDetails(selected.id);
      await reloadTasks();
      setSelectedGradeId(result.id);
      setHighlightAction("grade");
      setOperationFeedback({
        phase: "success",
        title: selectedGrade ? "成绩已修改" : "成绩已录入",
        detail: `${result.course_name}：${result.score ?? "待登记"} 分，学生端可查看老师反馈。`,
        target: selected.name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "成绩保存失败",
        detail: error instanceof Error ? `${error.message}。成绩未改动，可重试。` : "服务暂不可用。成绩未改动，可重试。",
        target: selected.name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function approveLeave() {
    const leave = selectedLeave;
    if (!leave) {
      setOperationFeedback({
        phase: "idle",
        title: "暂无请假审批",
        detail: "当前没有待处理请假申请，可刷新待办或查看其他学生服务事项。",
        target: selected.name,
        timestamp: formatOperationTime(),
      });
      return;
    }
    setPendingOperation("approveLeave");
    setOperationFeedback({
      phase: "pending",
      title: "正在审批请假",
      detail: `正在处理请假申请 #${leave.id}，审批结果将写入学生服务记录。`,
      target: selected.name,
    });
    try {
      await apiRequest<LeaveTask>(`/api/student-assistant/leaves/${leave.id}/approve`, {
        method: "POST",
        body: JSON.stringify({ status: "已同意", resolution: "同意请假，返校后补交材料。", actor_username: "admin" }),
      });
      await reloadTasks();
      await loadTimeline("leave", leave.id);
      setHighlightAction("leave");
      setOperationFeedback({
        phase: "success",
        title: "请假审批已更新",
        detail: `请假申请 #${leave.id} 已审批为已同意，处理记录已同步到学生服务任务。`,
        target: selected.name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "请假审批失败",
        detail: error instanceof Error ? `${error.message}。该请假申请状态未改动，可重试。` : "服务暂不可用。该请假申请状态未改动，可重试。",
        target: selected.name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function handleFeedback() {
    const ticket = selectedTicket;
    if (!ticket) {
      setOperationFeedback({
        phase: "idle",
        title: "暂无反馈工单",
        detail: "当前没有待处理反馈，可刷新待办或查看心理辅助预警。",
        target: selected.name,
        timestamp: formatOperationTime(),
      });
      return;
    }
    setPendingOperation("handleFeedback");
    setOperationFeedback({
      phase: "pending",
      title: "正在处理反馈工单",
      detail: `正在更新反馈工单 #${ticket.id}，处理结果将同步给学生。`,
      target: selected.name,
    });
    try {
      await apiRequest<FeedbackTicket>(`/api/student-assistant/feedback-tickets/${ticket.id}/handle`, {
        method: "POST",
        body: JSON.stringify({ resolution: "已分配老师跟进，并同步处理结果。", actor_username: "admin" }),
      });
      await reloadTasks();
      await loadTimeline("feedback", ticket.id);
      setHighlightAction("feedback");
      setOperationFeedback({
        phase: "success",
        title: "反馈处理已更新",
        detail: `反馈工单 #${ticket.id} 已记录处理结果，后续可在学生服务台查看状态。`,
        target: selected.name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "反馈处理失败",
        detail: error instanceof Error ? `${error.message}。工单状态未改动，可重试。` : "服务暂不可用。工单状态未改动，可重试。",
        target: selected.name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function closeFeedback() {
    const ticket = selectedTicket;
    if (!ticket) {
      setOperationFeedback({
        phase: "idle",
        title: "暂无可关闭反馈",
        detail: "当前没有选中的反馈工单。",
        target: selected.name,
        timestamp: formatOperationTime(),
      });
      return;
    }
    setPendingOperation("closeFeedback");
    setOperationFeedback({
      phase: "pending",
      title: "正在关闭反馈工单",
      detail: `正在关闭反馈工单 #${ticket.id}。`,
      target: selected.name,
    });
    try {
      await apiRequest<FeedbackTicket>(`/api/student-assistant/feedback-tickets/${ticket.id}/close`, {
        method: "POST",
        body: JSON.stringify({ reason: "学生确认处理结果，关闭工单。", actor_username: "admin" }),
      });
      await reloadTasks();
      await loadTimeline("feedback", ticket.id);
      setHighlightAction("feedback");
      setOperationFeedback({
        phase: "success",
        title: "反馈工单已关闭",
        detail: `反馈工单 #${ticket.id} 已关闭，可继续归档。`,
        target: selected.name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "反馈关闭失败",
        detail: error instanceof Error ? `${error.message}。工单状态未改动，可重试。` : "服务暂不可用。工单状态未改动，可重试。",
        target: selected.name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function archiveFeedback() {
    const ticket = selectedTicket;
    if (!ticket) {
      setOperationFeedback({
        phase: "idle",
        title: "暂无可归档反馈",
        detail: "当前没有选中的反馈工单。",
        target: selected.name,
        timestamp: formatOperationTime(),
      });
      return;
    }
    setPendingOperation("archiveFeedback");
    setOperationFeedback({
      phase: "pending",
      title: "正在归档反馈工单",
      detail: `正在归档反馈工单 #${ticket.id}。`,
      target: selected.name,
    });
    try {
      await apiRequest<FeedbackTicket>(`/api/student-assistant/feedback-tickets/${ticket.id}/archive`, {
        method: "POST",
        body: JSON.stringify({ reason: "服务记录归档。", actor_username: "admin" }),
      });
      await reloadTasks();
      await loadTimeline("feedback", ticket.id);
      setHighlightAction("feedback");
      setOperationFeedback({
        phase: "success",
        title: "反馈工单已归档",
        detail: `反馈工单 #${ticket.id} 已归档，学生端可查看最终状态。`,
        target: selected.name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "反馈归档失败",
        detail: error instanceof Error ? `${error.message}。工单状态未改动，可重试。` : "服务暂不可用。工单状态未改动，可重试。",
        target: selected.name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function loadTimeline(type: "leave" | "feedback", id: number) {
    try {
      const data = await apiRequest<{ timeline: TimelineItem[] }>(
        type === "leave" ? `/api/student-assistant/leaves/${id}` : `/api/student-assistant/feedback-tickets/${id}`,
      );
      setSelectedTimeline(data.timeline);
    } catch {
      setSelectedTimeline([]);
    }
  }

  async function refreshAcademic() {
    setPendingOperation("academic");
    setOperationFeedback({
      phase: "pending",
      title: "正在查询学业与申请进度",
      detail: "读取当前学生的考务节点和申请进度。",
      target: selected.name,
    });
    await loadStudentDetails(selected.id);
    setHighlightAction("academic");
    setOperationFeedback({
      phase: "success",
      title: "学业与申请进度已刷新",
      detail: "当前学生的考务节点和申请阶段已显示在工作台中。",
      target: selected.name,
      timestamp: formatOperationTime(),
    });
    setPendingOperation(null);
  }

  function openPsychQueue() {
    setHighlightAction("psych");
    setOperationFeedback({
      phase: "success",
      title: "心理辅助预警已进入跟进视图",
      detail: "预警仅用于辅助识别和跟进记录，不替代专业心理诊断。",
      target: selected.name,
      timestamp: formatOperationTime(),
    });
  }

  const hasPendingOperation = pendingOperation !== null;
  const isRefreshing = pendingOperation === "refresh";
  const isApprovingLeave = pendingOperation === "approveLeave";
  const isHandlingFeedback = pendingOperation === "handleFeedback";
  const isClosingFeedback = pendingOperation === "closeFeedback";
  const isArchivingFeedback = pendingOperation === "archiveFeedback";
  const isRefreshingAcademic = pendingOperation === "academic";
  const isSavingGrade = pendingOperation === "grade";

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">学生服务工作台</p>
          <h2>请假审批、反馈处理和心理预警</h2>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={loadAll} disabled={hasPendingOperation}>
            <RefreshCw className={isRefreshing ? "spin-icon" : ""} size={16} aria-hidden="true" />
            {isRefreshing ? "正在刷新" : "刷新学生待办"}
          </button>
        </div>
      </section>

      <section className="toolbar">
        <OperationFeedback feedback={operationFeedback} />
        <span className="status-pill danger">心理预警仅辅助跟进</span>
      </section>

      <section className="role-snapshot-grid" aria-label="老师今日待办概览">
        <article>
          <span>请假审批</span>
          <strong>{tasks.leaves.length}</strong>
          <em>待老师处理</em>
        </article>
        <article>
          <span>反馈工单</span>
          <strong>{tasks.feedback_tickets.length}</strong>
          <em>投诉与服务反馈</em>
        </article>
        <article>
          <span>辅助预警</span>
          <strong>{tasks.psych_alerts.length || psychAlerts.length}</strong>
          <em>只做辅助识别</em>
        </article>
        <article>
          <span>成绩记录</span>
          <strong>{grades.length || tasks.grades.length}</strong>
          <em>录入与反馈</em>
        </article>
      </section>

      <section className="role-action-grid" aria-label="老师待办入口">
        <button className={`role-action-card ${highlightAction === "leave" ? "is-highlighted" : ""}`} onClick={approveLeave} disabled={hasPendingOperation}>
          <CheckCircle2 size={20} aria-hidden="true" />
          <strong>请假审批</strong>
          <span>{isApprovingLeave ? "正在审批" : selectedLeave ? `选中 #${selectedLeave.id}` : `${tasks.leaves.length} 条`}</span>
        </button>
        <button className={`role-action-card ${highlightAction === "feedback" ? "is-highlighted" : ""}`} onClick={handleFeedback} disabled={hasPendingOperation}>
          <MessageSquare size={20} aria-hidden="true" />
          <strong>反馈处理</strong>
          <span>{isHandlingFeedback ? "正在处理" : selectedTicket ? `选中 #${selectedTicket.id}` : `${tasks.feedback_tickets.length} 条`}</span>
        </button>
        <button className={`role-action-card ${highlightAction === "psych" ? "is-highlighted" : ""}`} onClick={openPsychQueue}>
          <AlertTriangle size={20} aria-hidden="true" />
          <strong>心理预警</strong>
          <span>{tasks.psych_alerts.length || psychAlerts.length} 条</span>
        </button>
        <button className={`role-action-card ${highlightAction === "academic" ? "is-highlighted" : ""}`} onClick={() => void refreshAcademic()} disabled={hasPendingOperation}>
          <GraduationCap size={20} aria-hidden="true" />
          <strong>学业/进度</strong>
          <span>{isRefreshingAcademic ? "正在查询" : "节点查询"}</span>
        </button>
        <button className={`role-action-card ${highlightAction === "grade" ? "is-highlighted" : ""}`} onClick={() => void saveGrade()} disabled={hasPendingOperation}>
          <ClipboardCheck size={20} aria-hidden="true" />
          <strong>成绩录入</strong>
          <span>{isSavingGrade ? "正在保存" : selectedGrade ? `修改 #${selectedGrade.id}` : "新成绩"}</span>
        </button>
      </section>

      <section className="teacher-agent-panel" aria-label="老师处理助手">
        <div>
          <p className="eyebrow">老师处理助手</p>
          <h3>先定位待办，再确认处理</h3>
          <span>面向请假审批、反馈工单、心理预警跟进和学业节点查询。</span>
        </div>
        <div className="teacher-agent-work-queue">
          <article>
            <strong>待审批请假</strong>
            <span>{selectedLeave ? `#${selectedLeave.id} ${selectedLeave.status}` : "暂无待审批"}</span>
          </article>
          <article>
            <strong>待处理反馈</strong>
            <span>{selectedTicket ? `#${selectedTicket.id} ${selectedTicket.status}` : "暂无待处理"}</span>
          </article>
          <article>
            <strong>心理预警跟进</strong>
            <span>{tasks.psych_alerts.length || psychAlerts.length} 条需关注</span>
          </article>
        </div>
        <div className="teacher-agent-confirmation">
          <button onClick={approveLeave} disabled={hasPendingOperation || !selectedLeave}>确认处理请假</button>
          <button className="ghost-button" onClick={handleFeedback} disabled={hasPendingOperation || !selectedTicket}>确认处理反馈</button>
        </div>
        <div className="teacher-agent-composer">
          <textarea value={teacherAgentInput} onChange={(event) => setTeacherAgentInput(event.target.value)} onKeyDown={handleTeacherAgentKeyDown} rows={3} />
          <button className="ghost-button" onClick={() => void askTeacherAgent()} disabled={hasPendingOperation}>
            发送给助手
          </button>
          <small>{teacherAgentResult?.answer ?? "Enter 发送，Shift+Enter 换行"}</small>
        </div>
      </section>

      <section className="role-workbench-grid teacher-workbench-grid">
        <aside className="panel-block teacher-roster-panel">
          <div className="section-title">
            <h3>学生</h3>
            <span>{displayStudents.length} 人</span>
          </div>
          <div className="select-list">
            {displayStudents.map((item) => (
              <button className={item.id === selected.id ? "active" : ""} key={item.id} onClick={() => setSelectedId(item.id)}>
                <strong>{item.name}</strong>
                <span>{item.project}</span>
                <em>风险：{item.risk}</em>
              </button>
            ))}
          </div>
        </aside>

        <div className="panel-block teacher-focus-panel">
          <div className="section-title">
            <h3>{selected.name} 待办队列</h3>
            <span className="status-pill">{selected.status}</span>
          </div>
          <div className="teacher-queue-grid">
            <section className="panel-block">
              <div className="section-title">
                <h3>请假队列</h3>
                <span>{tasks.leaves.length} 条</span>
              </div>
              <div className="select-list">
                {tasks.leaves.map((item) => (
                  <button className={item.id === selectedLeave?.id ? "active" : ""} key={item.id} onClick={() => setSelectedLeaveId(item.id)}>
                    <strong>#{item.id} {item.status}</strong>
                    <span>{item.reason}</span>
                    <em>{formatDate(item.start_time)} - {formatDate(item.end_time)}</em>
                  </button>
                ))}
                {!tasks.leaves.length ? <div className="empty-state">暂无请假申请。</div> : null}
              </div>
            </section>

            <section className="panel-block">
              <div className="section-title">
                <h3>反馈队列</h3>
                <span>{tasks.feedback_tickets.length} 条</span>
              </div>
              <div className="select-list">
                {tasks.feedback_tickets.map((item) => (
                  <button className={item.id === selectedTicket?.id ? "active" : ""} key={item.id} onClick={() => setSelectedTicketId(item.id)}>
                    <strong>#{item.id} {item.category} / {item.status}</strong>
                    <span>{item.summary || item.content}</span>
                    <em>{item.resolution || "待处理"}</em>
                  </button>
                ))}
                {!tasks.feedback_tickets.length ? <div className="empty-state">暂无反馈工单。</div> : null}
              </div>
            </section>
          </div>

          <div className="panel-block">
            <div className="section-title">
              <h3>处理面板</h3>
              <span>{selectedTimeline.length} 条记录</span>
            </div>
            <div className="inline-actions">
              <button onClick={approveLeave} disabled={hasPendingOperation || !selectedLeave}>
                {isApprovingLeave ? "正在审批" : "同意请假"}
              </button>
              <button onClick={handleFeedback} disabled={hasPendingOperation || !selectedTicket}>
                {isHandlingFeedback ? "正在处理" : "记录反馈处理"}
              </button>
              <button className="ghost-button" onClick={closeFeedback} disabled={hasPendingOperation || !selectedTicket}>
                {isClosingFeedback ? "正在关闭" : "关闭反馈"}
              </button>
              <button className="ghost-button" onClick={archiveFeedback} disabled={hasPendingOperation || !selectedTicket}>
                {isArchivingFeedback ? "正在归档" : "归档反馈"}
              </button>
            </div>
            <div className="timeline">
              {selectedTimeline.map((item) => (
                <article key={item.id}>
                  <span>{formatDate(item.created_at)}</span>
                  <div>
                    <strong>{item.action}</strong>
                    <p>{String(item.detail.reason ?? item.detail.resolution ?? item.detail.content ?? item.detail.status ?? "已记录")}</p>
                  </div>
                </article>
              ))}
              {!selectedTimeline.length ? <div className="empty-state">选择请假或反馈记录后查看处理时间线。</div> : null}
            </div>
          </div>
        </div>

        <div className="panel-block teacher-focus-panel">
          <div className="section-title">
            <h3>{selected.name} 学业</h3>
            <span className="status-pill">{selected.status}</span>
          </div>
          <div className="service-grid">
            {(academicEvents.length ? academicEvents : [{ id: 0, event_name: "语言测试模拟考", event_type: "考务", due_time: "2026-06-16T09:00:00", status: "待提醒" }]).map((item) => (
              <article key={item.id}>
                <strong>{item.event_name}</strong>
                <span>{item.event_type}</span>
                <p>{item.status} / {formatDate(item.due_time)}</p>
              </article>
            ))}
          </div>

          <div className="panel-block">
            <div className="section-title">
              <h3>成绩录入</h3>
              <span>{selectedGrade ? `正在修改 #${selectedGrade.id}` : "新增成绩"}</span>
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
                <textarea value={gradeForm.teacher_feedback} onChange={(event) => setGradeForm((current) => ({ ...current, teacher_feedback: event.target.value }))} rows={3} />
              </label>
            </div>
            <div className="inline-actions">
              <button onClick={() => void saveGrade()} disabled={hasPendingOperation}>
                {isSavingGrade ? "正在保存" : selectedGrade ? "保存修改" : "录入成绩"}
              </button>
              <button
                className="ghost-button"
                onClick={() => {
                  setSelectedGradeId(null);
                  setGradeForm({ course_name: "德语 A2 阶段测评", score: "86", teacher_feedback: "词汇掌握稳定，口语表达需要继续练习。" });
                }}
                disabled={hasPendingOperation}
              >
                新增一条
              </button>
            </div>
          </div>

          <div className="panel-block">
            <div className="section-title">
              <h3>成绩记录</h3>
              <span>{grades.length} 条</span>
            </div>
            <div className="select-list">
              {grades.map((item) => (
                <button
                  className={item.id === selectedGrade?.id ? "active" : ""}
                  key={item.id}
                  onClick={() => {
                    setSelectedGradeId(item.id);
                    setGradeForm({
                      course_name: item.course_name,
                      score: item.score == null ? "" : String(item.score),
                      teacher_feedback: item.teacher_feedback,
                    });
                  }}
                >
                  <strong>{item.course_name}</strong>
                  <span>{item.score ?? "待登记"} 分</span>
                  <em>{item.teacher_feedback || "暂无老师反馈"}</em>
                </button>
              ))}
              {!grades.length ? <div className="empty-state">暂无成绩记录，可从上方录入。</div> : null}
            </div>
          </div>
        </div>

        <aside className="side-stack teacher-side-panel">
          <section className="panel-block">
            <div className="section-title">
              <h3>进度</h3>
              <span>{progressItems.length} 项</span>
            </div>
            <div className="guide-list">
              {(progressItems.length ? progressItems : [{ id: 0, stage: "材料补充", status: "进行中", description: "推荐信待上传" }]).map((item) => (
                <article key={item.id}>
                  <strong>{item.stage}</strong>
                  <span>{item.status} / {item.description}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="panel-block">
            <div className="section-title">
              <h3>心理预警</h3>
              <AlertTriangle size={18} aria-hidden="true" />
            </div>
            {(tasks.psych_alerts.length ? tasks.psych_alerts : psychAlerts).map((item) => (
              <div className="risk-box" key={"id" in item ? item.id : item.student}>
                <strong>{"risk_level" in item ? `学生 #${item.student_id} / ${item.risk_level}` : `${item.student} / ${item.level}`}</strong>
                <span>{"trigger_reason" in item ? `${item.trigger_reason}；${item.status}` : `${item.reason}；${item.status}`}</span>
              </div>
            ))}
          </section>
        </aside>
      </section>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "未设置";
  return value.replace("T", " ").slice(0, 16);
}
