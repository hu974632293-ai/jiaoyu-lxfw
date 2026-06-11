import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, GraduationCap, MessageSquare, RefreshCw } from "lucide-react";
import { apiRequest } from "../api/client";
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
  status: string;
};

type FeedbackTicket = {
  id: number;
  status: string;
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

type TeacherTasks = {
  leaves: LeaveTask[];
  feedback_tickets: FeedbackTicket[];
  psych_alerts: PsychAlert[];
};

const emptyTasks: TeacherTasks = { leaves: [], feedback_tickets: [], psych_alerts: [] };

export default function TeacherStudentServicePage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedId, setSelectedId] = useState(studentRows[0].id);
  const [tasks, setTasks] = useState<TeacherTasks>(emptyTasks);
  const [academicEvents, setAcademicEvents] = useState<AcademicEvent[]>([]);
  const [progressItems, setProgressItems] = useState<ApplicationProgress[]>([]);
  const [message, setMessage] = useState("学生服务工作台待处理");

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

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    void loadStudentDetails(selectedId);
  }, [selectedId]);

  async function loadAll() {
    setMessage("正在加载学生服务待办...");
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
      setMessage("学生服务待办已加载");
    } catch (error) {
      setMessage(error instanceof Error ? `学生服务接口失败：${error.message}` : "学生服务接口失败");
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

  async function reloadTasks() {
    const data = await apiRequest<TeacherTasks>("/api/student-assistant/teacher-tasks");
    setTasks(data);
  }

  async function approveLeave() {
    const leave = tasks.leaves.find((item) => item.status.includes("待")) ?? tasks.leaves[0];
    if (!leave) {
      setMessage("暂无请假审批");
      return;
    }
    setMessage("正在处理请假审批...");
    try {
      await apiRequest<LeaveTask>(`/api/student-assistant/leaves/${leave.id}/approve`, {
        method: "POST",
        body: JSON.stringify({ status: "已同意", resolution: "同意请假，返校后补交材料。", actor_username: "admin" }),
      });
      await reloadTasks();
      setMessage("请假审批已更新");
    } catch (error) {
      setMessage(error instanceof Error ? `请假审批失败：${error.message}` : "请假审批失败");
    }
  }

  async function handleFeedback() {
    const ticket = tasks.feedback_tickets.find((item) => !item.status.includes("已")) ?? tasks.feedback_tickets[0];
    if (!ticket) {
      setMessage("暂无反馈处理");
      return;
    }
    setMessage("正在更新反馈处理...");
    try {
      await apiRequest<FeedbackTicket>(`/api/student-assistant/feedback-tickets/${ticket.id}/handle`, {
        method: "POST",
        body: JSON.stringify({ resolution: "已分配老师跟进，并同步处理结果。", actor_username: "admin" }),
      });
      await reloadTasks();
      setMessage("反馈处理已更新");
    } catch (error) {
      setMessage(error instanceof Error ? `反馈处理失败：${error.message}` : "反馈处理失败");
    }
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">学生服务工作台</p>
          <h2>请假审批、反馈处理和心理预警</h2>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={loadAll}>
            <RefreshCw size={16} aria-hidden="true" />
            刷新
          </button>
        </div>
      </section>

      <section className="toolbar">
        <span className={message.includes("失败") ? "status-pill warning" : "status-pill success"}>{message}</span>
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
      </section>

      <section className="role-action-grid" aria-label="老师待办入口">
        <button className="role-action-card" onClick={approveLeave}>
          <CheckCircle2 size={20} aria-hidden="true" />
          <strong>请假审批</strong>
          <span>{tasks.leaves.length} 条</span>
        </button>
        <button className="role-action-card" onClick={handleFeedback}>
          <MessageSquare size={20} aria-hidden="true" />
          <strong>反馈处理</strong>
          <span>{tasks.feedback_tickets.length} 条</span>
        </button>
        <button className="role-action-card" onClick={() => setMessage("心理预警已进入跟进队列")}>
          <AlertTriangle size={20} aria-hidden="true" />
          <strong>心理预警</strong>
          <span>{tasks.psych_alerts.length || psychAlerts.length} 条</span>
        </button>
        <button className="role-action-card" onClick={() => void loadStudentDetails(selected.id)}>
          <GraduationCap size={20} aria-hidden="true" />
          <strong>学业/进度</strong>
          <span>节点查询</span>
        </button>
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
