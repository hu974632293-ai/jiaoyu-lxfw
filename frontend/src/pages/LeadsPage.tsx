import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Filter, Plus, RefreshCw } from "lucide-react";
import { apiRequest } from "../api/client";
import type { PageProps } from "../App";
import { crmPrototypeRows, crmTimeline } from "../data/prototype";

type Lead = { id: number; customer_name: string; status: string };
type LeadDetail = {
  id: number;
  customer_name: string;
  contact_info: string | null;
  background_info: string | null;
  status: string;
};
type TimelineItem = {
  type: string;
  title: string;
  content: string;
  created_at: string | null;
  meta: Record<string, unknown>;
};
type DisplayTimelineItem = { time: string; title: string; detail: string; taskId?: number; taskStatus?: string };

const statusMap: Record<string, string> = {
  new: "新线索",
  contacted: "已联系",
  high_potential: "高潜跟进",
  consulting: "咨询中",
  converted: "已成交",
  lost: "暂缓/流失",
  新增意向: "新增意向",
};

function formatTimelineTime(raw: string | null) {
  if (!raw) {
    return "刚刚";
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }
  return date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function normalizeTimeline(items: TimelineItem[]): DisplayTimelineItem[] {
  return items.map((item) => ({
    time: formatTimelineTime(item.created_at),
    title: item.title,
    detail: item.content,
    taskId: typeof item.meta.task_id === "number" ? item.meta.task_id : undefined,
    taskStatus: typeof item.meta.status === "string" ? item.meta.status : undefined,
  }));
}

export default function LeadsPage({ onNavigate }: PageProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedId, setSelectedId] = useState(1);
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [keyword, setKeyword] = useState("");
  const [message, setMessage] = useState("正在加载真实 CRM 线索...");
  const [followUpText, setFollowUpText] = useState("家长关注新加坡本科费用，希望周末参加说明会。");
  const [taskTitle, setTaskTitle] = useState("邀约客户参加周末说明会");
  const [timeline, setTimeline] = useState<DisplayTimelineItem[]>(crmTimeline.map((item) => ({ time: item.time, title: item.title, detail: item.detail })));

  async function load() {
    setMessage("正在刷新真实线索...");
    try {
      const data = await apiRequest<Lead[]>("/api/leads");
      setLeads(data);
      if (data.length && !data.some((item) => item.id === selectedId)) {
        setSelectedId(data[0].id);
      }
      setMessage(data.length ? "真实 CRM 线索已加载" : "真实接口返回空列表，展示原型样例");
    } catch (error) {
      setLeads([]);
      setMessage(error instanceof Error ? `真实 CRM 接口失败：${error.message}` : "真实 CRM 接口失败");
    }
  }

  async function loadDetail(leadId: number) {
    try {
      setDetail(await apiRequest<LeadDetail>(`/api/leads/${leadId}`));
    } catch {
      setDetail(null);
    }
  }

  async function loadTimeline(leadId: number) {
    try {
      const data = await apiRequest<TimelineItem[]>(`/api/leads/${leadId}/timeline`);
      setTimeline(data.length ? normalizeTimeline(data) : []);
    } catch {
      setTimeline([]);
    }
  }

  async function refreshSelectedLead(leadId = selectedId) {
    await Promise.all([loadDetail(leadId), loadTimeline(leadId)]);
  }

  async function updateStatus(status: string) {
    setMessage("正在调用真实状态流转接口...");
    try {
      await apiRequest(`/api/leads/${selectedId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason: "CRM 页面快捷阶段流转", operator_username: "admin" }),
      });
      setMessage(`状态已更新为：${statusMap[status] ?? status}`);
      await load();
      await refreshSelectedLead();
    } catch (error) {
      setMessage(error instanceof Error ? `状态更新失败：${error.message}` : "状态更新失败");
    }
  }

  async function addFollowUp() {
    if (!followUpText.trim()) {
      setMessage("请先填写跟进内容");
      return;
    }
    setMessage("正在写入真实跟进记录...");
    try {
      await apiRequest(`/api/leads/${selectedId}/follow-ups`, {
        method: "POST",
        body: JSON.stringify({
          follow_type: "电话",
          content: followUpText,
          next_action: taskTitle,
          operator_username: "admin",
        }),
      });
      setMessage("跟进已写入后端，并进入真实时间线");
      await refreshSelectedLead();
    } catch (error) {
      setMessage(error instanceof Error ? `新增跟进失败：${error.message}` : "新增跟进失败");
    }
  }

  async function createTask() {
    if (!taskTitle.trim()) {
      setMessage("请先填写任务标题");
      return;
    }
    setMessage("正在创建真实 CRM 任务...");
    try {
      await apiRequest("/api/crm/tasks", {
        method: "POST",
        body: JSON.stringify({ lead_id: selectedId, title: taskTitle, owner_username: "admin" }),
      });
      setMessage("任务已创建，并进入真实时间线");
      await refreshSelectedLead();
    } catch (error) {
      setMessage(error instanceof Error ? `创建任务失败：${error.message}` : "创建任务失败");
    }
  }

  async function completeTask(taskId: number) {
    setMessage("正在完成真实 CRM 任务...");
    try {
      await apiRequest(`/api/crm/tasks/${taskId}/complete`, {
        method: "PATCH",
        body: JSON.stringify({ operator_username: "admin" }),
      });
      setMessage("任务已完成，并写入审计日志");
      await refreshSelectedLead();
    } catch (error) {
      setMessage(error instanceof Error ? `完成任务失败：${error.message}` : "完成任务失败");
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    refreshSelectedLead(selectedId);
  }, [selectedId]);

  const rows = useMemo(() => {
    const realRows = leads.map((lead) => {
      const mock = crmPrototypeRows.find((item) => item.id === lead.id);
      return {
        ...crmPrototypeRows[0],
        ...mock,
        id: lead.id,
        customer_name: lead.customer_name,
        status: lead.status,
        statusLabel: statusMap[lead.status] ?? lead.status,
      };
    });
    const source = realRows.length ? realRows : crmPrototypeRows;
    return source.filter((item) => item.customer_name.includes(keyword) || item.project.includes(keyword) || item.owner.includes(keyword));
  }, [keyword, leads]);

  const selected = rows.find((item) => item.id === selectedId) ?? rows[0] ?? crmPrototypeRows[0];
  const pendingTasks = timeline.filter((item) => item.taskId && item.title === "创建任务" && item.taskStatus !== "已完成");

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">完整 CRM</p>
          <h2>线索列表、详情、跟进时间线和阶段流转</h2>
          <p>线索详情、跟进、任务、阶段历史和时间线已优先接入真实后端，接口失败时展示明确空态。</p>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={load}>
            <RefreshCw size={16} aria-hidden="true" />
            刷新线索
          </button>
          <button className="icon-button" onClick={() => onNavigate("events")}>
            <Plus size={16} aria-hidden="true" />
            报名活动
          </button>
        </div>
      </section>

      <section className="toolbar">
        <Filter size={16} aria-hidden="true" />
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索客户、负责人或推荐项目" />
        <select defaultValue="all" aria-label="状态筛选">
          <option value="all">全部状态</option>
          <option value="high_potential">高潜跟进</option>
          <option value="consulting">咨询中</option>
          <option value="lost">暂缓/流失</option>
        </select>
        <span className="status-pill">{message}</span>
      </section>

      <section className="crm-layout">
        <div className="panel-block table-panel">
          <table>
            <thead>
              <tr>
                <th>客户</th>
                <th>状态</th>
                <th>推荐项目</th>
                <th>负责人</th>
                <th>下一步</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((lead) => (
                <tr className={lead.id === selected.id ? "selected-row" : ""} key={lead.id} onClick={() => setSelectedId(lead.id)}>
                  <td>
                    <strong>{lead.customer_name}</strong>
                    <span>{lead.contact}</span>
                  </td>
                  <td>
                    <span className="badge">{lead.statusLabel}</span>
                  </td>
                  <td>{lead.project}</td>
                  <td>{lead.owner}</td>
                  <td>{lead.nextTask}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="empty-state">当前筛选无匹配线索。</div>}
        </div>

        <aside className="panel-block detail-panel">
          <div className="section-title">
            <h3>{detail?.customer_name ?? selected.customer_name}</h3>
            <span className="status-pill success">{statusMap[detail?.status ?? selected.status] ?? selected.statusLabel}</span>
          </div>
          <dl className="detail-list">
            <div>
              <dt>真实接口详情</dt>
              <dd>{detail ? `${detail.contact_info || "无联系方式"} / ${detail.background_info || "暂无背景"}` : "后端未返回详情，展示原型信息"}</dd>
            </div>
            <div>
              <dt>画像研判</dt>
              <dd>命中“{selected.project}”，原因：升学意向明确、家庭支持较好、时间窗口合适。</dd>
            </div>
            <div>
              <dt>最近跟进</dt>
              <dd>{selected.recent}</dd>
            </div>
          </dl>

          <div className="inline-actions">
            <button onClick={() => updateStatus("high_potential")}>标记高潜</button>
            <button onClick={() => updateStatus("converted")}>标记成交</button>
            <button className="ghost-button" onClick={() => updateStatus("lost")}>标记流失</button>
          </div>

          <label className="stacked-input">
            <span>新增跟进</span>
            <textarea value={followUpText} onChange={(event) => setFollowUpText(event.target.value)} rows={3} />
          </label>
          <label className="stacked-input">
            <span>下一步任务</span>
            <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
          </label>
          <div className="inline-actions">
            <button className="icon-button" onClick={addFollowUp}>
              <CheckCircle2 size={16} aria-hidden="true" />
              写入跟进
            </button>
            <button className="icon-button secondary" onClick={createTask}>
              <Plus size={16} aria-hidden="true" />
              创建任务
            </button>
          </div>
        </aside>
      </section>

      <section className="panel-block">
        <div className="section-title">
          <h3>真实客户时间线</h3>
          <span>创建、画像、问答、跟进、状态变化、活动报名</span>
        </div>
        {pendingTasks.length > 0 && (
          <div className="task-list">
            {pendingTasks.map((task) => (
              <article className="task-row" key={task.taskId}>
                <div>
                  <strong>{task.detail}</strong>
                  <span>待办任务 / 来源真实 CRM API</span>
                </div>
                <button className="ghost-button" onClick={() => completeTask(task.taskId!)}>
                  完成
                </button>
              </article>
            ))}
          </div>
        )}
        <div className="timeline">
          {timeline.map((item, index) => (
            <article key={`${item.time}-${item.title}-${index}`}>
              <span>{item.time}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
          {!timeline.length && <div className="empty-state">当前线索暂无真实时间线记录。</div>}
        </div>
      </section>
    </div>
  );
}
