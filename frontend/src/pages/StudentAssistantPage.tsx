import { useState } from "react";
import { AlertTriangle, CheckCircle2, MessageSquare, Send } from "lucide-react";
import type { PageProps } from "../App";
import { psychAlerts, studentRows, studentServiceItems } from "../data/prototype";

type ChatMessage = {
  from: "学生" | "学生助手";
  text: string;
  status?: "success" | "fallback" | "danger";
};

export default function StudentAssistantPage({ role, onNavigate }: PageProps) {
  const [selectedId, setSelectedId] = useState(studentRows[0].id);
  const [input, setInput] = useState("我想请假两天，并想知道签证材料进度。");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: "学生助手", text: "当前为统一运营工作台原型，可演示请假、反馈、进度、学业节点、生活支持和心理辅助预警。", status: "fallback" },
  ]);
  const [leaveStatus, setLeaveStatus] = useState("待老师审批");
  const [feedbackStatus, setFeedbackStatus] = useState("处理中");

  const selected = studentRows.find((item) => item.id === selectedId) ?? studentRows[0];

  function send() {
    const text = input.trim();
    if (!text) return;
    const reply: ChatMessage = text.includes("请假")
      ? { from: "学生助手", text: "已生成请假申请：06-12 至 06-13，原因待老师确认。状态可在老师处理区追踪。", status: "success" }
      : text.includes("进度")
        ? { from: "学生助手", text: "申请进度：文书初稿完成，推荐信待上传，签证材料清单已发送。", status: "success" }
        : { from: "学生助手", text: "Dify 未配置时使用海外生活支持 fallback；如涉及医疗、心理或法律问题，只提供求助路径。", status: "fallback" };
    setMessages((items) => [...items, { from: "学生", text }, reply]);
  }

  function approveLeave() {
    setLeaveStatus("已同意，通知学生");
    setMessages((items) => [...items, { from: "学生助手", text: "老师已同意请假申请，系统记录审批人和时间。", status: "success" }]);
  }

  function closeFeedback() {
    setFeedbackStatus("已处理，待学生确认");
    setMessages((items) => [...items, { from: "学生助手", text: "反馈工单已更新处理结果，学生可查看。", status: "success" }]);
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">学生助手</p>
          <h2>学生服务自助与老师跟进闭环</h2>
          <p>不做独立移动端；本页在统一工作台中演示学生视角和老师处理区，心理预警只做辅助识别。</p>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={() => onNavigate("knowledge")}>生活支持问答</button>
          <button className="icon-button" onClick={() => onNavigate("reports")}>生成学生周报</button>
        </div>
      </section>

      <section className="toolbar">
        <span className="status-pill">当前角色：{role}</span>
        <span className="status-pill danger">心理提示不替代专业诊断</span>
      </section>

      <section className="student-layout">
        <aside className="panel-block">
          <div className="section-title">
            <h3>学生选择</h3>
            <span>{studentRows.length} 人</span>
          </div>
          <div className="select-list">
            {studentRows.map((item) => (
              <button className={item.id === selected.id ? "active" : ""} key={item.id} onClick={() => setSelectedId(item.id)}>
                <strong>{item.name}</strong>
                <span>{item.project}</span>
                <em>风险：{item.risk}</em>
              </button>
            ))}
          </div>
        </aside>

        <div className="panel-block chat-panel">
          <div className="section-title">
            <h3>{selected.name} 的服务对话</h3>
            <span className="status-pill success">{selected.status}</span>
          </div>
          <div className="message-list">
            {messages.map((item, index) => (
              <article className={item.from === "学生" ? "message user" : `message ${item.status ?? ""}`} key={`${item.from}-${index}`}>
                <div>
                  <strong>{item.from}</strong>
                  {item.status && <span className={`status-pill ${item.status}`}>{item.status}</span>}
                </div>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
          <div className="composer">
            <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={3} />
            <button className="icon-button" onClick={send}>
              <Send size={16} aria-hidden="true" />
              发送
            </button>
          </div>
        </div>

        <aside className="side-stack">
          <section className="panel-block">
            <div className="section-title">
              <h3>服务事项</h3>
              <MessageSquare size={18} aria-hidden="true" />
            </div>
            <div className="service-grid">
              {studentServiceItems.map((item) => (
                <article key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.status}</span>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel-block">
            <div className="section-title">
              <h3>老师处理区</h3>
              <CheckCircle2 size={18} aria-hidden="true" />
            </div>
            <div className="action-list">
              <article>
                <strong>请假审批</strong>
                <span>{leaveStatus}</span>
                <button className="tiny-button" onClick={approveLeave}>同意请假</button>
              </article>
              <article>
                <strong>反馈工单</strong>
                <span>{feedbackStatus}</span>
                <button className="tiny-button" onClick={closeFeedback}>更新处理</button>
              </article>
            </div>
          </section>

          <section className="panel-block">
            <div className="section-title">
              <h3>心理辅助预警</h3>
              <AlertTriangle size={18} aria-hidden="true" />
            </div>
            {psychAlerts.map((item) => (
              <div className="risk-box" key={item.student}>
                <strong>{item.student} / {item.level}</strong>
                <span>{item.reason}；{item.status}</span>
              </div>
            ))}
          </section>
        </aside>
      </section>
    </div>
  );
}
