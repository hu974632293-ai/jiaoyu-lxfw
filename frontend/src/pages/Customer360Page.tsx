import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, PanelRightClose, PanelRightOpen, Plus, RefreshCw } from "lucide-react";
import { apiRequest } from "../api/client";
import { OperationFeedback, type OperationFeedbackState } from "../components/OperationFeedback";
import {
  crmPrototypeRows,
  crmTimeline,
  customerAdviceItems,
  eventPrototypeRows,
  mockReportSnapshots,
  projectRows,
} from "../data/prototype";
import type { BackofficePageKey } from "../navigation";

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
type Customer360Tab = "overview" | "profile" | "recommendations" | "consulting" | "tasks" | "events" | "reports";
type Customer360Operation = "refresh" | "status" | "followUp" | "createTask" | "completeTask" | null;

type Customer360PageProps = {
  selectedLeadId: number | null;
  onNavigate: (page: BackofficePageKey, leadId?: number) => void;
};

const statusMap: Record<string, string> = {
  new: "新线索",
  contacted: "已联系",
  high_potential: "高潜跟进",
  consulting: "咨询中",
  converted: "已成交",
  lost: "暂缓/流失",
  新增意向: "新增意向",
};

const tabs: Array<{ key: Customer360Tab; label: string }> = [
  { key: "overview", label: "总览" },
  { key: "profile", label: "画像研判" },
  { key: "recommendations", label: "项目推荐" },
  { key: "consulting", label: "咨询记录" },
  { key: "tasks", label: "跟进任务" },
  { key: "events", label: "活动报名" },
  { key: "reports", label: "报告快照" },
];

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

function formatOperationTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
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

export default function Customer360Page({ selectedLeadId, onNavigate }: Customer360PageProps) {
  const leadId = selectedLeadId ?? crmPrototypeRows[0].id;
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [tab, setTab] = useState<Customer360Tab>("overview");
  const [operationFeedback, setOperationFeedback] = useState<OperationFeedbackState>({
    phase: "pending",
    title: "正在加载客户 360",
    detail: "读取客户详情、时间线和任务状态。",
    target: `客户 #${leadId}`,
  });
  const [pendingOperation, setPendingOperation] = useState<Customer360Operation>("refresh");
  const [highlightArea, setHighlightArea] = useState<"timeline" | "tasks" | null>(null);
  const [adviceOpen, setAdviceOpen] = useState(true);
  const [followUpText, setFollowUpText] = useState("家长关注费用，希望周末参加说明会。");
  const [taskTitle, setTaskTitle] = useState("邀约客户参加周末说明会");
  const [timeline, setTimeline] = useState<DisplayTimelineItem[]>(crmTimeline.map((item) => ({ time: item.time, title: item.title, detail: item.detail })));

  const selected = useMemo(() => crmPrototypeRows.find((item) => item.id === leadId) ?? crmPrototypeRows[0], [leadId]);
  const pendingTasks = timeline.filter((item) => item.taskId && item.title === "创建任务" && item.taskStatus !== "已完成");

  async function loadDetail(nextLeadId = leadId) {
    try {
      setDetail(await apiRequest<LeadDetail>(`/api/leads/${nextLeadId}`));
    } catch {
      setDetail(null);
    }
  }

  async function loadTimeline(nextLeadId = leadId) {
    try {
      const data = await apiRequest<TimelineItem[]>(`/api/leads/${nextLeadId}/timeline`);
      setTimeline(data.length ? normalizeTimeline(data) : crmTimeline.map((item) => ({ time: item.time, title: item.title, detail: item.detail })));
    } catch {
      setTimeline(crmTimeline.map((item) => ({ time: item.time, title: item.title, detail: item.detail })));
    }
  }

  async function refreshSelectedLead(nextLeadId = leadId, options: { preserveFeedback?: boolean } = {}) {
    if (!options.preserveFeedback) {
      setPendingOperation("refresh");
      setOperationFeedback({
        phase: "pending",
        title: "正在刷新客户 360",
        detail: "正在读取客户详情和真实时间线。",
        target: `客户 #${nextLeadId}`,
      });
    }
    await Promise.all([loadDetail(nextLeadId), loadTimeline(nextLeadId)]);
    if (!options.preserveFeedback) {
      setOperationFeedback({
        phase: "success",
        title: "客户 360 已刷新",
        detail: "客户详情、时间线和任务状态已同步；后端不可用时会展示原型兜底。",
        target: `客户 #${nextLeadId}`,
        timestamp: formatOperationTime(),
      });
      setPendingOperation(null);
    }
  }

  async function updateStatus(status: string) {
    setPendingOperation("status");
    setOperationFeedback({
      phase: "pending",
      title: "正在更新客户阶段",
      detail: `目标状态：${statusMap[status] ?? status}。`,
      target: detail?.customer_name ?? selected.customer_name,
    });
    try {
      await apiRequest(`/api/leads/${leadId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason: "客户 360 快捷阶段流转", operator_username: "admin" }),
      });
      setHighlightArea("timeline");
      setTab("consulting");
      await refreshSelectedLead(leadId, { preserveFeedback: true });
      setOperationFeedback({
        phase: "success",
        title: `客户阶段已更新为：${statusMap[status] ?? status}`,
        detail: "阶段流转已写入客户时间线，可在咨询记录中查看最新处理记录。",
        target: detail?.customer_name ?? selected.customer_name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "客户阶段更新失败",
        detail: error instanceof Error ? `${error.message}。当前客户状态未改动，可重试。` : "接口不可用。当前客户状态未改动，可重试。",
        target: detail?.customer_name ?? selected.customer_name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function addFollowUp() {
    if (!followUpText.trim()) {
      setOperationFeedback({
        phase: "error",
        title: "跟进记录未写入",
        detail: "请先填写跟进内容。当前任务标题和输入内容已保留。",
        target: detail?.customer_name ?? selected.customer_name,
        timestamp: formatOperationTime(),
      });
      return;
    }
    setPendingOperation("followUp");
    setOperationFeedback({
      phase: "pending",
      title: "正在写入跟进记录",
      detail: "保存后会同步进入客户时间线。",
      target: detail?.customer_name ?? selected.customer_name,
    });
    try {
      await apiRequest(`/api/leads/${leadId}/follow-ups`, {
        method: "POST",
        body: JSON.stringify({
          follow_type: "电话",
          content: followUpText,
          next_action: taskTitle,
          operator_username: "admin",
        }),
      });
      setHighlightArea("timeline");
      setTab("consulting");
      await refreshSelectedLead(leadId, { preserveFeedback: true });
      setOperationFeedback({
        phase: "success",
        title: "跟进记录已写入",
        detail: "最新记录已定位到咨询记录时间线，可继续创建下一步任务。",
        target: detail?.customer_name ?? selected.customer_name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "新增跟进失败",
        detail: error instanceof Error ? `${error.message}。跟进内容已保留，可重试。` : "接口不可用。跟进内容已保留，可重试。",
        target: detail?.customer_name ?? selected.customer_name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function createTask() {
    if (!taskTitle.trim()) {
      setOperationFeedback({
        phase: "error",
        title: "任务未创建",
        detail: "请先填写任务标题。跟进内容和任务输入已保留。",
        target: detail?.customer_name ?? selected.customer_name,
        timestamp: formatOperationTime(),
      });
      return;
    }
    setPendingOperation("createTask");
    setOperationFeedback({
      phase: "pending",
      title: "正在创建跟进任务",
      detail: `任务标题：${taskTitle.trim()}。`,
      target: detail?.customer_name ?? selected.customer_name,
    });
    try {
      await apiRequest("/api/crm/tasks", {
        method: "POST",
        body: JSON.stringify({ lead_id: leadId, title: taskTitle, owner_username: "admin" }),
      });
      setHighlightArea("tasks");
      setTab("tasks");
      await refreshSelectedLead(leadId, { preserveFeedback: true });
      setOperationFeedback({
        phase: "success",
        title: "跟进任务已创建",
        detail: "已切换到跟进任务页签，最新待办会在列表中高亮展示。",
        target: detail?.customer_name ?? selected.customer_name,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "创建任务失败",
        detail: error instanceof Error ? `${error.message}。任务标题已保留，可重试。` : "接口不可用。任务标题已保留，可重试。",
        target: detail?.customer_name ?? selected.customer_name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function completeTask(taskId: number) {
    setPendingOperation("completeTask");
    setOperationFeedback({
      phase: "pending",
      title: "正在完成跟进任务",
      detail: `正在更新任务 #${taskId} 并写入审计日志。`,
      target: detail?.customer_name ?? selected.customer_name,
    });
    try {
      await apiRequest(`/api/crm/tasks/${taskId}/complete`, {
        method: "PATCH",
        body: JSON.stringify({ operator_username: "admin" }),
      });
      setHighlightArea("timeline");
      setTab("consulting");
      await refreshSelectedLead(leadId, { preserveFeedback: true });
      setOperationFeedback({
        phase: "success",
        title: "跟进任务已完成",
        detail: "完成记录已写入审计日志，并定位到咨询记录时间线。",
        target: `任务 #${taskId}`,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "完成任务失败",
        detail: error instanceof Error ? `${error.message}。任务状态未改动，可重试。` : "接口不可用。任务状态未改动，可重试。",
        target: `任务 #${taskId}`,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  useEffect(() => {
    refreshSelectedLead(leadId);
  }, [leadId]);

  const hasPendingOperation = pendingOperation !== null;
  const isRefreshing = pendingOperation === "refresh";
  const isUpdatingStatus = pendingOperation === "status";
  const isAddingFollowUp = pendingOperation === "followUp";
  const isCreatingTask = pendingOperation === "createTask";
  const isCompletingTask = pendingOperation === "completeTask";

  function renderTabContent() {
    if (tab === "profile") {
      return (
        <div className="detail-list">
          <div>
            <dt>真实接口详情</dt>
            <dd>{detail ? `${detail.contact_info || "无联系方式"} / ${detail.background_info || "暂无背景"}` : "后端未返回详情，展示原型画像"}</dd>
          </div>
          <div>
            <dt>画像判断</dt>
            <dd>升学意向明确，家庭支持较好，当前缺口是预算上限、目标院校优先级和语言准备周期。</dd>
          </div>
          <div>
            <dt>风险提示</dt>
            <dd>AI 画像只作为辅助研判，顾问仍需在跟进记录中确认事实依据。</dd>
          </div>
        </div>
      );
    }

    if (tab === "recommendations") {
      return (
        <div className="service-grid">
          {projectRows.slice(0, 3).map((project) => (
            <article key={project.name}>
              <strong>{project.name}</strong>
              <span>{project.country} / {project.category} / {project.cost}</span>
              <p>{project.tags.join("、")}</p>
            </article>
          ))}
        </div>
      );
    }

    if (tab === "consulting") {
      return (
        <div className="timeline">
          {timeline.map((item, index) => (
            <article className={highlightArea === "timeline" && index === 0 ? "is-highlighted" : ""} key={`${item.time}-${item.title}-${index}`}>
              <span>{item.time}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
      );
    }

    if (tab === "tasks") {
      return (
        <div className="task-list">
          {pendingTasks.length ? (
            pendingTasks.map((task, index) => (
              <article className={`task-row ${highlightArea === "tasks" && index === 0 ? "is-highlighted" : ""}`} key={task.taskId}>
                <div>
                  <strong>{task.detail}</strong>
                  <span>待办任务 / 来源真实 CRM API</span>
                </div>
                <button className="ghost-button" onClick={() => completeTask(task.taskId!)} disabled={hasPendingOperation}>
                  {isCompletingTask ? "正在完成" : "完成任务"}
                </button>
              </article>
            ))
          ) : (
            <div className="empty-state">当前客户暂无未完成真实任务，可在右侧录入下一步。</div>
          )}
        </div>
      );
    }

    if (tab === "events") {
      return (
        <div className="action-list">
          {eventPrototypeRows.slice(0, 2).map((event) => (
            <article key={event.name}>
              <strong>{event.name}</strong>
              <span>{event.time} / {event.status} / {event.signed}/{event.capacity}</span>
            </article>
          ))}
        </div>
      );
    }

    if (tab === "reports") {
      return (
        <div className="source-list">
          {mockReportSnapshots.map((report) => (
            <article key={report.title}>
              <strong>{report.title}</strong>
              <span>{report.period}</span>
              <em>{report.risk}</em>
            </article>
          ))}
        </div>
      );
    }

    return (
      <div className="customer-overview-grid">
        <article className="compact-card">
          <strong>最近跟进</strong>
          <span>{selected.recent}</span>
        </article>
        <article className="compact-card">
          <strong>推荐项目</strong>
          <span>{selected.project}</span>
        </article>
        <article className="compact-card">
          <strong>下一步动作</strong>
          <span>{selected.nextTask}</span>
        </article>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">客户 360</p>
          <h2>{detail?.customer_name ?? selected.customer_name}</h2>
          <p>客户画像、推荐项目、咨询记录、跟进任务、活动报名和报告快照集中在单个客户工作台。</p>
        </div>
        <div className="heading-actions">
          <span className="status-pill success">{statusMap[detail?.status ?? selected.status] ?? selected.statusLabel}</span>
          <button className="ghost-button" onClick={() => refreshSelectedLead()} disabled={hasPendingOperation}>
            <RefreshCw className={isRefreshing ? "spin-icon" : ""} size={16} aria-hidden="true" />
            {isRefreshing ? "正在刷新" : "刷新客户 360"}
          </button>
          <button className="ghost-button" onClick={() => onNavigate("customerGrowth")}>
            返回客户增长
          </button>
        </div>
      </section>

      <section className="customer-360-layout">
        <div className="customer-main-panel">
          <div className="customer-tabs" role="tablist" aria-label="客户 360 tabs">
            {tabs.map((item) => (
              <button className={tab === item.key ? "active" : ""} key={item.key} onClick={() => setTab(item.key)}>
                {item.label}
              </button>
            ))}
          </div>

          <OperationFeedback feedback={operationFeedback} />

          <div className="panel-block">
            <div className="section-title">
              <h3>{tabs.find((item) => item.key === tab)?.label}</h3>
              <span className="status-pill">{operationFeedback.phase === "pending" ? "处理中" : "已就绪"}</span>
            </div>
            {renderTabContent()}
          </div>

          <div className="panel-block">
            <div className="section-title">
              <h3>阶段流转与跟进</h3>
              <span>真实接口优先，失败时保留提示</span>
            </div>
            <div className="inline-actions">
              <button onClick={() => updateStatus("high_potential")} disabled={hasPendingOperation}>
                {isUpdatingStatus ? "正在更新阶段" : "标记为高潜跟进"}
              </button>
              <button onClick={() => updateStatus("converted")} disabled={hasPendingOperation}>
                {isUpdatingStatus ? "正在更新阶段" : "标记为已成交"}
              </button>
              <button className="ghost-button" onClick={() => updateStatus("lost")} disabled={hasPendingOperation}>
                {isUpdatingStatus ? "正在更新阶段" : "标记为暂缓/流失"}
              </button>
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
              <button className="icon-button" onClick={addFollowUp} disabled={hasPendingOperation}>
                <CheckCircle2 size={16} aria-hidden="true" />
                {isAddingFollowUp ? "正在写入跟进" : "写入跟进记录"}
              </button>
              <button className="icon-button secondary" onClick={createTask} disabled={hasPendingOperation}>
                <Plus size={16} aria-hidden="true" />
                {isCreatingTask ? "正在创建任务" : "创建跟进任务"}
              </button>
            </div>
            <OperationFeedback feedback={operationFeedback} compact />
          </div>
        </div>

        <aside className={adviceOpen ? "customer-advice-panel open" : "customer-advice-panel"}>
          <button className="customer-advice-toggle" onClick={() => setAdviceOpen((value) => !value)} title={adviceOpen ? "收起建议面板" : "展开建议面板"}>
            {adviceOpen ? <PanelRightClose size={16} aria-hidden="true" /> : <PanelRightOpen size={16} aria-hidden="true" />}
          </button>
          {adviceOpen && (
            <div className="side-stack">
              <div>
                <p className="eyebrow">页面内建议</p>
                <h3>下一步推进</h3>
              </div>
              {customerAdviceItems.map((item) => (
                <article className="compact-card" key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                  <em>
                    顾问确认 <ChevronRight size={13} aria-hidden="true" />
                  </em>
                </article>
              ))}
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
