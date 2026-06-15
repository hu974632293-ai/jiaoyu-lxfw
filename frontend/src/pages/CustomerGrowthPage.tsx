import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Filter,
  ListTodo,
  Mic,
  PhoneCall,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { apiRequest } from "../api/client";
import { OperationFeedback, type OperationFeedbackState } from "../components/OperationFeedback";
import { crmPrototypeRows } from "../data/prototype";
import type { BackofficePageKey } from "../navigation";
import { startSpeechToText } from "../utils/speech";

type Lead = {
  id: number;
  customer_name: string;
  status: string;
  owner_id?: number | null;
  source_channel?: string;
};
type LeadCreated = { id: number };
type AssessmentResult = {
  assessment_id: number;
  matched_project: string;
  singapore_score: number;
  germany_score: number;
  missing_fields: string[];
};
type AdvisorAgentResult = {
  answer: string;
  status: string;
};
type LeadVoiceDraft = {
  customer_name: string;
  contact_info?: string;
  background_info: string;
  source_channel: string;
  owner_id?: number | null;
};
type VoiceDraftResponse<TDraft> = {
  draft: TDraft;
  requires_confirmation: boolean;
  confirmation_endpoint: string;
};

type CustomerGrowthPageProps = {
  onNavigate: (page: BackofficePageKey, leadId?: number) => void;
  initialPanel?: AdvisorPanel;
  initialStatusFilter?: string;
};

type AdvisorPanel = "create" | "insight" | "today" | "tasks" | null;
type OperationKey = "load" | "createLead" | "assessLead" | "voiceDraft" | "agent" | null;

const statusMap: Record<string, string> = {
  new: "新线索",
  contacted: "已联系",
  high_potential: "高潜跟进",
  consulting: "咨询中",
  converted: "已成交",
  lost: "暂缓/流失",
  新增意向: "新增意向",
};

const funnelStatusMap: Record<string, string> = {
  新线索: "new",
  已画像: "high_potential",
  咨询中: "consulting",
  活动邀约: "contacted",
  "成交/流失": "converted",
};

function formatOperationTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

export default function CustomerGrowthPage({ onNavigate, initialPanel = null, initialStatusFilter = "all" }: CustomerGrowthPageProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [operationFeedback, setOperationFeedback] = useState<OperationFeedbackState>({
    phase: "pending",
    title: "正在加载客户增长队列",
    detail: "读取线索列表并准备今日工作流。",
  });
  const [pendingOperation, setPendingOperation] = useState<OperationKey>("load");
  const [customerName, setCustomerName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [sourceText, setSourceText] = useState("19 岁，高中毕业，希望新加坡升学，家长关注预算和就业前景。");
  const [voiceTranscript, setVoiceTranscript] = useState("客户：陈语，电话 13900008888，高三，想申请新加坡本科，家长关注预算和就业。");
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [highlightLeadId, setHighlightLeadId] = useState<number | null>(null);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [activePanel, setActivePanel] = useState<AdvisorPanel>(initialPanel);
  const [agentResult, setAgentResult] = useState<AdvisorAgentResult | null>(null);
  const [agentQuestion, setAgentQuestion] = useState("请补齐当前客户研判依据，并给出下一步跟进建议。");

  const leadFilters = useMemo(
    () => ({
      keyword: keyword.trim(),
      status: statusFilter === "all" ? "" : statusFilter,
      source_channel: sourceFilter === "all" ? "" : sourceFilter,
    }),
    [keyword, sourceFilter, statusFilter],
  );

  function buildLeadQuery(filters: typeof leadFilters) {
    const params = new URLSearchParams();
    if (filters.keyword) {
      params.set("keyword", filters.keyword);
    }
    if (filters.status) {
      params.set("status", filters.status);
    }
    if (filters.source_channel) {
      params.set("source_channel", filters.source_channel);
    }
    const query = params.toString();
    return query ? `/api/leads?${query}` : "/api/leads";
  }

  useEffect(() => {
    setActivePanel(initialPanel);
  }, [initialPanel]);

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  function handleFunnelClick(event: MouseEvent<HTMLDivElement>) {
    const stageLabel = (event.target as HTMLElement).closest("article")?.getAttribute("data-stage");
    if (stageLabel) {
      setStatusFilter(funnelStatusMap[stageLabel] ?? "all");
    }
  }

  async function load(options: { preserveFeedback?: boolean; filters?: typeof leadFilters } = {}) {
    const filters = options.filters ?? leadFilters;
    if (!options.preserveFeedback) {
      setPendingOperation("load");
      setOperationFeedback({
        phase: "pending",
        title: "正在刷新客户队列",
        detail: "正在按当前条件更新线索工作流。",
        target: "线索工作流",
      });
    }
    try {
      const data = await apiRequest<Lead[]>(buildLeadQuery(filters));
      setLeads(data);
      if (!options.preserveFeedback) {
        setOperationFeedback({
          phase: data.length ? "success" : "pending",
          title: data.length ? "客户队列已刷新" : "当前条件暂无匹配客户",
          detail: `当前工作流显示 ${data.length} 条线索，可调整筛选或进入客户 360。`,
          target: "线索工作流",
          timestamp: formatOperationTime(),
        });
      }
    } catch (error) {
      setLeads([]);
      if (!options.preserveFeedback) {
        setOperationFeedback({
          phase: "error",
          title: "客户队列刷新失败",
          detail: error instanceof Error ? `${error.message}。可稍后重试。` : "客户队列暂时无法刷新，可稍后重试。",
          target: "线索工作流",
          timestamp: formatOperationTime(),
        });
      }
    } finally {
      if (!options.preserveFeedback) {
        setPendingOperation(null);
      }
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load({ filters: leadFilters });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [leadFilters]);

  async function createLead() {
    const name = customerName.trim();
    if (!name) {
      setActivePanel("create");
      setOperationFeedback({
        phase: "error",
        title: "线索创建失败",
        detail: "请先填写客户姓名。表单内容已保留，可补充后重试。",
        target: "快速录入表单",
        timestamp: formatOperationTime(),
      });
      return;
    }
    setPendingOperation("createLead");
    setOperationFeedback({
      phase: "pending",
      title: "正在创建客户线索",
      detail: `正在保存 ${name} 的联系方式和背景资料。`,
      target: name,
    });
    try {
      const data = await apiRequest<LeadCreated>("/api/leads", {
        method: "POST",
        body: JSON.stringify({
          customer_name: name,
          contact_info: contactInfo.trim(),
          background_info: sourceText.trim(),
          source_channel: "顾问录入",
          owner_id: 1,
        }),
      });
      setCreatedId(data.id);
      setHighlightLeadId(data.id);
      setActivePanel("insight");
      await load({ preserveFeedback: true, filters: leadFilters });
      setOperationFeedback({
        phase: "success",
        title: `线索已创建：${name}`,
        detail: "已在队列中高亮新线索，可继续画像研判或进入客户 360。",
        target: `线索 #${data.id}`,
        targetId: data.id,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "线索创建失败",
        detail: error instanceof Error ? `${error.message}。表单内容已保留，可重试。` : "客户线索暂时无法保存。表单内容已保留，可重试。",
        target: name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function buildLeadVoiceDraft() {
    const transcript = voiceTranscript.trim();
    if (!transcript) {
      setOperationFeedback({
        phase: "error",
        title: "口述内容为空",
        detail: "请先输入客户口述内容，再生成待确认草稿。",
        target: "口述录入",
        timestamp: formatOperationTime(),
      });
      return;
    }
    setPendingOperation("voiceDraft");
    setOperationFeedback({
      phase: "pending",
      title: "正在生成线索草稿",
      detail: "系统会先整理为表单草稿，不会直接写入客户表。",
      target: "口述录入",
    });
    try {
      const data = await apiRequest<VoiceDraftResponse<LeadVoiceDraft>>("/api/enterprise-assistant/voice-drafts", {
        method: "POST",
        body: JSON.stringify({ target_type: "lead", transcript, actor_username: "admin" }),
      });
      setCustomerName(data.draft.customer_name);
      setContactInfo(data.draft.contact_info ?? "");
      setSourceText(data.draft.background_info);
      setActivePanel("create");
      setOperationFeedback({
        phase: "success",
        title: "线索草稿已生成",
        detail: "请核对姓名、联系方式和背景资料，确认无误后再保存线索。",
        target: "线索表单",
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "线索草稿生成失败",
        detail: error instanceof Error ? `${error.message}。口述内容已保留，可调整后重试。` : "口述内容已保留，可调整后重试。",
        target: "口述录入",
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  function startLeadVoiceInput() {
    const started = startSpeechToText(
      setVoiceTranscript,
      (message) =>
        setOperationFeedback({
          phase: "error",
          title: "语音输入不可用",
          detail: message,
          target: "口述录入",
          timestamp: formatOperationTime(),
        }),
    );
    if (started) {
      setOperationFeedback({
        phase: "pending",
        title: "正在听取客户口述",
        detail: "语音会先转成文本，请确认文本后再生成线索草稿。",
        target: "口述录入",
      });
    }
  }

  async function assessLead() {
    const rawInput = sourceText.trim();
    if (!rawInput) {
      setOperationFeedback({
        phase: "error",
        title: "画像研判未触发",
        detail: "请先粘贴客户背景资料。当前输入已保留，可补充后重试。",
        target: "客户背景资料",
        timestamp: formatOperationTime(),
      });
      return;
    }
    setPendingOperation("assessLead");
    setOperationFeedback({
      phase: "pending",
      title: "正在触发画像研判",
      detail: createdId ? `正在基于线索 #${createdId} 生成推荐结果。` : "未绑定线索，将按当前资料生成临时推荐结果。",
      target: createdId ? `线索 #${createdId}` : "当前资料",
    });
    try {
      const data = await apiRequest<AssessmentResult>("/api/profile/assess", {
        method: "POST",
        body: JSON.stringify({
          lead_id: createdId,
          raw_input: rawInput,
          source_type: "text",
        }),
      });
      setAssessment(data);
      setActivePanel("insight");
      setOperationFeedback({
        phase: "success",
        title: "画像研判已完成",
        detail: `推荐项目：${data.matched_project || "待补充资料"}。结果已展示在研判与推荐面板。`,
        target: createdId ? `线索 #${createdId}` : "当前资料",
        targetId: createdId ?? undefined,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "画像研判失败",
        detail: error instanceof Error ? `${error.message}。客户资料已保留，可重试。` : "画像研判暂时无法完成。客户资料已保留，可重试。",
        target: createdId ? `线索 #${createdId}` : "当前资料",
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function askAssessmentAssistant() {
    const lead = spotlightLead;
    const question = agentQuestion.trim() || "请补齐当前客户研判依据，并给出下一步跟进建议。";
    setPendingOperation("agent");
    setOperationFeedback({
      phase: "pending",
      title: "正在处理客户研判问题",
      detail: `围绕 ${lead.customer_name} 的资料补齐、项目匹配和下一步跟进生成建议。`,
      target: lead.customer_name,
    });
    try {
      const result = await apiRequest<AdvisorAgentResult>("/api/knowledge/chat", {
        method: "POST",
        body: JSON.stringify({
          scene: "customer_assessment",
          question: `${question} 当前客户：${lead.customer_name}，${lead.project}，${lead.recent}`,
          lead_id: lead.id,
          actor_username: "advisor",
          business_context: { customer_name: lead.customer_name, status: lead.statusLabel, project: lead.project },
        }),
      });
      setAgentResult(result);
      setOperationFeedback({
        phase: result.status === "success" ? "success" : "fallback",
        title: "客户研判建议已返回",
        detail: "建议已显示在研判助手面板，可继续进入客户 360 记录跟进。",
        target: lead.customer_name,
        targetId: lead.id,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "客户研判建议生成失败",
        detail: error instanceof Error ? `${error.message}。可稍后重试。` : "暂时无法生成建议，可稍后重试。",
        target: lead.customer_name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  function handleAssessmentAgentKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!hasPendingOperation) {
        void askAssessmentAssistant();
      }
    }
  }

  const queueRows = useMemo(() => {
    const realRows = leads.map((lead) => {
      const mock = crmPrototypeRows.find((item) => item.id === lead.id);
      return {
        ...crmPrototypeRows[0],
        ...mock,
        id: lead.id,
        customer_name: lead.customer_name,
        status: lead.status,
        statusLabel: statusMap[lead.status] ?? lead.status,
        source: lead.source_channel || "顾问维护",
      };
    });
    return realRows;
  }, [leads]);

  const rows = useMemo(() => {
    return queueRows;
  }, [queueRows]);

  const funnelStages = useMemo(() => {
    const countByStatus = (statuses: string[]) => queueRows.filter((item) => statuses.includes(item.status)).length;
    return [
      { label: "新线索", count: countByStatus(["new", "新增意向"]) },
      { label: "已画像", count: countByStatus(["high_potential"]) },
      { label: "咨询中", count: countByStatus(["consulting"]) },
      { label: "活动邀约", count: countByStatus(["contacted"]) },
      { label: "成交/流失", count: countByStatus(["converted", "lost", "已转化", "已成交", "流失", "暂缓/流失"]) },
    ];
  }, [queueRows]);

  const commandMetrics = useMemo(() => {
    const highPotentialCount = queueRows.filter((item) => item.status === "high_potential").length;
    const activeCount = queueRows.filter((item) => !["converted", "lost"].includes(item.status)).length;
    const queueState = operationFeedback.phase === "error" ? "暂不可用" : "已更新";
    return [
      { label: "高潜客户", value: String(highPotentialCount), note: "优先回访", tone: "warning" },
      { label: "待推进", value: String(activeCount), note: "未成交/未流失", tone: "danger" },
      { label: "活动转化", value: "42%", note: "本周讲座", tone: "success" },
      { label: "队列状态", value: queueState, note: "可继续操作", tone: operationFeedback.phase === "error" ? "danger" : "success" },
    ];
  }, [leads.length, operationFeedback.phase, queueRows]);

  const spotlightLead = rows[0] ?? crmPrototypeRows[0];
  const recommendationName = assessment?.matched_project || spotlightLead?.project || "待补充资料";
  const todayActions = rows.slice(0, 3);
  const isRefreshing = pendingOperation === "load";
  const isCreating = pendingOperation === "createLead";
  const isAssessing = pendingOperation === "assessLead";
  const isDrafting = pendingOperation === "voiceDraft";
  const hasPendingOperation = pendingOperation !== null;
  const feedbackTargetId = operationFeedback.targetId;
  const feedbackAction = typeof feedbackTargetId === "number" ? (
    <button className="tiny-button" onClick={() => onNavigate("consultantCustomer360", feedbackTargetId)}>
      打开客户 360 <ArrowRight size={13} aria-hidden="true" />
    </button>
  ) : null;

  return (
    <div className="page-stack advisor-page">
      <section className="page-heading advisor-heading">
        <div>
          <p className="eyebrow">顾问作战台</p>
          <h2>今天先处理高潜、待跟进和活动转化</h2>
          <p>围绕线索录入、画像研判、客户队列、下一步任务和客户 360 推进增长闭环。</p>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={() => load()} disabled={hasPendingOperation}>
            <RefreshCw className={isRefreshing ? "spin-icon" : ""} size={16} aria-hidden="true" />
            {isRefreshing ? "正在刷新" : "刷新客户队列"}
          </button>
          <button className="icon-button" onClick={() => setActivePanel("create")}>
            <UserPlus size={16} aria-hidden="true" />
            打开新建线索
          </button>
        </div>
      </section>

      <section className="advisor-command-strip" aria-label="今日增长指挥条">
        {commandMetrics.map((metric) => (
          <article className={`advisor-command-card ${metric.tone}`} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <em>{metric.note}</em>
          </article>
        ))}
      </section>

      <OperationFeedback feedback={operationFeedback} action={feedbackAction} />

      <section className={`advisor-workbench-grid ${activePanel ? "has-open-panel" : ""}`}>
        <aside className="advisor-action-rail advisor-left-rail" aria-label="顾问快捷操作">
          <button className={activePanel === "create" ? "active" : ""} onClick={() => setActivePanel("create")} title="快速录入">
            <UserPlus size={19} aria-hidden="true" />
            <span>录入</span>
          </button>
          <button className={activePanel === "insight" ? "active" : ""} onClick={() => setActivePanel("insight")} title="研判结果">
            <Sparkles size={19} aria-hidden="true" />
            <span>研判</span>
          </button>
          <button onClick={() => load()} title="刷新客户队列" disabled={hasPendingOperation}>
            <RefreshCw className={isRefreshing ? "spin-icon" : ""} size={19} aria-hidden="true" />
            <span>{isRefreshing ? "刷新中" : "刷新"}</span>
          </button>
          <button onClick={() => setStatusFilter("high_potential")} title="只看高潜">
            <Filter size={19} aria-hidden="true" />
            <span>高潜</span>
          </button>
        </aside>

        <div className="panel-block advisor-queue-panel">
          <div className="section-title advisor-queue-title">
            <div>
              <h3>线索工作流</h3>
              <span>{rows.length} 位客户匹配当前筛选</span>
            </div>
            <button className="tiny-button" onClick={() => load()} disabled={hasPendingOperation}>
              <RefreshCw className={isRefreshing ? "spin-icon" : ""} size={14} aria-hidden="true" />
              {isRefreshing ? "刷新中" : "刷新队列"}
            </button>
          </div>
          <div className="toolbar advisor-toolbar">
            <Search size={16} aria-hidden="true" />
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索客户、联系方式或背景" />
            <Filter size={16} aria-hidden="true" />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="状态筛选">
              <option value="all">全部状态</option>
              <option value="new">新线索</option>
              <option value="contacted">已联系</option>
              <option value="high_potential">高潜跟进</option>
              <option value="consulting">咨询中</option>
              <option value="converted">已成交</option>
              <option value="lost">暂缓/流失</option>
            </select>
            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} aria-label="来源筛选">
              <option value="all">全部来源</option>
              <option value="官网咨询">官网咨询</option>
              <option value="顾问录入">顾问录入</option>
              <option value="活动报名">活动报名</option>
            </select>
          </div>
          <div className="advisor-stage-line" aria-label="客户增长阶段漏斗" onClick={handleFunnelClick}>
            {funnelStages.map((stage, index) => (
              <article key={stage.label} data-stage={stage.label}>
                <span>0{index + 1}</span>
                <strong>{stage.count}</strong>
                <em>{stage.label}</em>
              </article>
            ))}
          </div>
          <div className="advisor-lead-list">
            {rows.map((lead) => (
              <button
                className={`advisor-lead-card ${highlightLeadId === lead.id ? "is-highlighted" : ""}`}
                key={lead.id}
                onClick={() => onNavigate("consultantCustomer360", lead.id)}
              >
                <span className="advisor-lead-rank">#{lead.id}</span>
                <div className="advisor-lead-main">
                  <strong>{lead.customer_name}</strong>
                  <small>{lead.contact}</small>
                </div>
                <span className="badge">{lead.statusLabel}</span>
                <div className="advisor-lead-detail">
                  <span>{lead.project}</span>
                  <em>{lead.recent}</em>
                </div>
                <div className="advisor-next-step">
                  <CalendarClock size={15} aria-hidden="true" />
                  <span>{lead.nextTask}</span>
                </div>
                <div className="advisor-card-action">
                  <Users size={14} aria-hidden="true" />
                  客户 360 <ArrowRight size={13} aria-hidden="true" />
                </div>
              </button>
            ))}
          </div>
          {!rows.length && <div className="empty-state">当前筛选无匹配客户。</div>}
        </div>

        <aside className="advisor-action-rail advisor-right-rail" aria-label="顾问详情操作">
          <button className={activePanel === "insight" ? "active" : ""} onClick={() => setActivePanel("insight")} title="研判与推荐">
            <ClipboardList size={19} aria-hidden="true" />
            <span>推荐</span>
          </button>
          <button className={activePanel === "today" ? "active" : ""} onClick={() => setActivePanel("today")} title="今日推进">
            <PhoneCall size={19} aria-hidden="true" />
            <span>推进</span>
          </button>
          <button className={activePanel === "tasks" ? "active" : ""} onClick={() => setActivePanel("tasks")} title="下一步任务">
            <ListTodo size={19} aria-hidden="true" />
            <span>任务</span>
          </button>
          <button onClick={() => spotlightLead && onNavigate("consultantCustomer360", spotlightLead.id)} title="客户 360">
            <Users size={19} aria-hidden="true" />
            <span>360</span>
          </button>
          <button onClick={() => spotlightLead && onNavigate("consultantAgent", spotlightLead.id)} title="交给助手">
            <Sparkles size={19} aria-hidden="true" />
            <span>交给助手</span>
          </button>
        </aside>

        {activePanel === "create" ? (
          <aside className="panel-block advisor-drawer advisor-drawer-left" aria-label="快速录入与研判">
            <div className="section-title">
              <h3>快速录入与研判</h3>
              <button className="tiny-button" onClick={() => setActivePanel(null)} aria-label="收起录入面板">
                <X size={14} aria-hidden="true" />
                收起
              </button>
            </div>
            <label className="stacked-input">
              <span>口述客户资料</span>
              <textarea value={voiceTranscript} onChange={(event) => setVoiceTranscript(event.target.value)} rows={3} />
            </label>
            <button className="tiny-button" onClick={startLeadVoiceInput} disabled={hasPendingOperation}>
              <Mic size={14} aria-hidden="true" />
              开始语音输入
            </button>
            <button className="tiny-button" onClick={buildLeadVoiceDraft} disabled={hasPendingOperation}>
              <Mic className={isDrafting ? "spin-icon" : ""} size={14} aria-hidden="true" />
              {isDrafting ? "正在生成草稿" : "生成线索草稿"}
            </button>
            <div className="form-grid compact">
              <label className="stacked-input">
                <span>客户姓名</span>
                <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="例如：王晴" />
              </label>
              <label className="stacked-input">
                <span>联系方式</span>
                <input value={contactInfo} onChange={(event) => setContactInfo(event.target.value)} placeholder="手机 / 微信 / 邮箱" />
              </label>
            </div>
            <label className="stacked-input">
              <span>粘贴资料</span>
              <textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} rows={4} />
            </label>
            <div className="inline-actions">
              <button className="icon-button" onClick={createLead} disabled={hasPendingOperation}>
                {isCreating ? "正在保存线索" : "保存线索并进入研判"}
              </button>
              <button className="icon-button secondary" onClick={assessLead} disabled={hasPendingOperation}>
                <Sparkles className={isAssessing ? "spin-icon" : ""} size={16} aria-hidden="true" />
                {isAssessing ? "正在研判" : "触发研判"}
              </button>
              {createdId ? (
                <button className="ghost-button" onClick={() => onNavigate("consultantCustomer360", createdId)}>
                  打开客户 360 <ArrowRight size={13} aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <OperationFeedback feedback={operationFeedback} action={feedbackAction} compact />
          </aside>
        ) : null}

        {activePanel === "insight" ? (
          <aside className="panel-block advisor-drawer advisor-drawer-right" aria-label="研判与推荐">
            <div className="section-title">
              <h3>研判与推荐</h3>
              <button className="tiny-button" onClick={() => setActivePanel(null)} aria-label="收起研判面板">
                <X size={14} aria-hidden="true" />
                收起
              </button>
            </div>
            {assessment ? (
              <dl className="detail-list">
                <div>
                  <dt>推荐项目</dt>
                  <dd>{assessment.matched_project || "待补充资料"}</dd>
                </div>
                <div>
                  <dt>匹配评分</dt>
                  <dd>新加坡 {assessment.singapore_score} / 德国 {assessment.germany_score}</dd>
                </div>
                <div>
                  <dt>缺失字段</dt>
                  <dd>{assessment.missing_fields.join("、") || "暂无"}</dd>
                </div>
              </dl>
            ) : (
              <div className="advisor-recommend-card">
                <Target size={18} aria-hidden="true" />
                <strong>{recommendationName}</strong>
                <span>优先补齐预算、目标国家和入学时间后触发画像研判。</span>
              </div>
            )}
            <div className="customer-assessment-agent">
              <div className="section-title">
                <h3>客户研判助手</h3>
                <span className="status-pill">顾问可见</span>
              </div>
              <div className="customer-agent-actions">
                <button className="tiny-button" onClick={askAssessmentAssistant} disabled={hasPendingOperation}>
                  补齐研判依据
                </button>
                <button className="ghost-button" onClick={askAssessmentAssistant} disabled={hasPendingOperation}>
                  生成跟进建议
                </button>
              </div>
              <div className="customer-agent-composer">
                <textarea value={agentQuestion} onChange={(event) => setAgentQuestion(event.target.value)} onKeyDown={handleAssessmentAgentKeyDown} rows={3} />
                <small>Enter 发送，Shift+Enter 换行</small>
              </div>
              <article className="customer-agent-result">
                <strong>{agentResult ? "建议摘要" : "待生成建议"}</strong>
                <span>{agentResult?.answer ?? "选择当前高潜客户后，可生成项目匹配、资料缺口和下一步跟进建议。"}</span>
              </article>
            </div>
          </aside>
        ) : null}

        {activePanel === "today" ? (
          <aside className="panel-block advisor-drawer advisor-drawer-right" aria-label="今日推进">
            <div className="section-title">
              <h3>今日推进</h3>
              <button className="tiny-button" onClick={() => setActivePanel(null)} aria-label="收起今日推进面板">
                <X size={14} aria-hidden="true" />
                收起
              </button>
            </div>
            <div className="advisor-action-list">
              {todayActions.map((lead) => (
                <button key={lead.id} onClick={() => onNavigate("consultantCustomer360", lead.id)}>
                  <span className="status-pill warning">{lead.statusLabel}</span>
                  <strong>{lead.customer_name}</strong>
                  <small>{lead.nextTask}</small>
                </button>
              ))}
            </div>
          </aside>
        ) : null}

        {activePanel === "tasks" ? (
          <aside className="panel-block advisor-drawer advisor-drawer-right" aria-label="下一步任务">
            <div className="section-title">
              <h3>下一步任务</h3>
              <button className="tiny-button" onClick={() => setActivePanel(null)} aria-label="收起任务面板">
                <X size={14} aria-hidden="true" />
                收起
              </button>
            </div>
            <div className="advisor-task-checklist">
              <span>补齐资料字段</span>
              <span>触发画像研判</span>
              <span>进入客户 360 记录跟进</span>
              {spotlightLead ? (
                <button className="ghost-button" onClick={() => onNavigate("consultantCustomer360", spotlightLead.id)}>
                  处理 {spotlightLead.customer_name}
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </aside>
        ) : null}
      </section>
    </div>
  );
}
