import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Filter,
  ListTodo,
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
import { crmPrototypeRows, pipelineStages } from "../data/prototype";
import type { BackofficePageKey } from "../navigation";

type Lead = { id: number; customer_name: string; status: string };
type LeadCreated = { id: number };
type AssessmentResult = {
  assessment_id: number;
  matched_project: string;
  singapore_score: number;
  germany_score: number;
  missing_fields: string[];
};

type CustomerGrowthPageProps = {
  onNavigate: (page: BackofficePageKey, leadId?: number) => void;
};

type AdvisorPanel = "create" | "insight" | "today" | "tasks" | null;

const statusMap: Record<string, string> = {
  new: "新线索",
  contacted: "已联系",
  high_potential: "高潜跟进",
  consulting: "咨询中",
  converted: "已成交",
  lost: "暂缓/流失",
  新增意向: "新增意向",
};

export default function CustomerGrowthPage({ onNavigate }: CustomerGrowthPageProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("正在加载客户增长队列...");
  const [customerName, setCustomerName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [sourceText, setSourceText] = useState("19 岁，高中毕业，希望新加坡升学，家长关注预算和就业前景。");
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [activePanel, setActivePanel] = useState<AdvisorPanel>(null);

  async function load() {
    setMessage("正在刷新真实客户队列...");
    try {
      const data = await apiRequest<Lead[]>("/api/leads");
      setLeads(data);
      setMessage(data.length ? "真实客户队列已加载" : "真实接口返回空列表，展示原型样例");
    } catch (error) {
      setLeads([]);
      setMessage(error instanceof Error ? `真实客户接口失败：${error.message}` : "真实客户接口失败");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createLead() {
    const name = customerName.trim();
    if (!name) {
      setMessage("请先填写客户姓名");
      return;
    }
    setMessage("正在新建线索...");
    try {
      const data = await apiRequest<LeadCreated>("/api/leads", {
        method: "POST",
        body: JSON.stringify({
          customer_name: name,
          contact_info: contactInfo.trim(),
          background_info: sourceText.trim(),
          owner_id: 1,
        }),
      });
      setCreatedId(data.id);
      setMessage("新建线索成功，可继续触发研判或进入客户 360");
      setActivePanel("insight");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? `新建线索失败：${error.message}` : "新建线索失败");
    }
  }

  async function assessLead() {
    const rawInput = sourceText.trim();
    if (!rawInput) {
      setMessage("请先粘贴资料");
      return;
    }
    setMessage("正在触发画像研判...");
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
      setMessage(`画像研判完成，推荐：${data.matched_project || "待补充资料"}`);
      setActivePanel("insight");
    } catch (error) {
      setMessage(error instanceof Error ? `画像研判失败：${error.message}` : "画像研判失败");
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
      };
    });
    return realRows.length ? realRows : crmPrototypeRows;
  }, [leads]);

  const rows = useMemo(() => {
    return queueRows.filter((item) => {
      const hitKeyword = item.customer_name.includes(keyword) || item.project.includes(keyword) || item.owner.includes(keyword);
      const hitStatus = statusFilter === "all" || item.status === statusFilter;
      return hitKeyword && hitStatus;
    });
  }, [keyword, queueRows, statusFilter]);

  const commandMetrics = useMemo(() => {
    const highPotentialCount = queueRows.filter((item) => item.status === "high_potential").length;
    const activeCount = queueRows.filter((item) => !["converted", "lost"].includes(item.status)).length;
    const apiState = leads.length ? "真实 API" : message.includes("失败") ? "接口异常" : "样例队列";
    return [
      { label: "高潜客户", value: String(highPotentialCount), note: "优先回访", tone: "warning" },
      { label: "待推进", value: String(activeCount), note: "未成交/未流失", tone: "danger" },
      { label: "活动转化", value: "42%", note: "本周讲座", tone: "success" },
      { label: "接口状态", value: apiState, note: leads.length ? "/api/leads" : "可继续操作", tone: message.includes("失败") ? "danger" : "success" },
    ];
  }, [leads.length, message, queueRows]);

  const spotlightLead = rows[0] ?? queueRows[0];
  const recommendationName = assessment?.matched_project || spotlightLead?.project || "待补充资料";
  const todayActions = (rows.length ? rows : queueRows).slice(0, 3);

  return (
    <div className="page-stack advisor-page">
      <section className="page-heading advisor-heading">
        <div>
          <p className="eyebrow">顾问作战台</p>
          <h2>今天先处理高潜、待跟进和活动转化</h2>
          <p>围绕线索录入、画像研判、客户队列、下一步任务和客户 360，保留真实 API 闭环。</p>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={load}>
            <RefreshCw size={16} aria-hidden="true" />
            刷新队列
          </button>
          <button className="icon-button" onClick={() => setActivePanel("create")}>
            <UserPlus size={16} aria-hidden="true" />
            新建线索
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
          <button onClick={load} title="刷新队列">
            <RefreshCw size={19} aria-hidden="true" />
            <span>刷新</span>
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
            <button className="tiny-button" onClick={load}>
              <RefreshCw size={14} aria-hidden="true" />
              同步
            </button>
          </div>
          <div className="toolbar advisor-toolbar">
            <Search size={16} aria-hidden="true" />
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索客户、负责人或推荐项目" />
            <Filter size={16} aria-hidden="true" />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="状态筛选">
              <option value="all">全部状态</option>
              <option value="new">新线索</option>
              <option value="high_potential">高潜跟进</option>
              <option value="consulting">咨询中</option>
              <option value="converted">已成交</option>
              <option value="lost">暂缓/流失</option>
            </select>
          </div>
          <div className="advisor-stage-line" aria-label="客户增长阶段漏斗">
            {pipelineStages.map((stage, index) => (
              <article key={stage.label}>
                <span>0{index + 1}</span>
                <strong>{stage.count}</strong>
                <em>{stage.label}</em>
              </article>
            ))}
          </div>
          <div className="advisor-lead-list">
            {rows.map((lead) => (
              <button className="advisor-lead-card" key={lead.id} onClick={() => onNavigate("customer360", lead.id)}>
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
          <button onClick={() => spotlightLead && onNavigate("customer360", spotlightLead.id)} title="客户 360">
            <Users size={19} aria-hidden="true" />
            <span>360</span>
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
              <span>客户背景资料</span>
              <textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} rows={4} />
            </label>
            <div className="inline-actions">
              <button className="icon-button" onClick={createLead}>
                保存线索
              </button>
              <button className="icon-button secondary" onClick={assessLead}>
                <Sparkles size={16} aria-hidden="true" />
                触发研判
              </button>
              {createdId ? (
                <button className="ghost-button" onClick={() => onNavigate("customer360", createdId)}>
                  打开客户 360 <ArrowRight size={13} aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <span className={message.includes("失败") ? "status-pill warning" : "status-pill success"}>{message}</span>
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
                <button key={lead.id} onClick={() => onNavigate("customer360", lead.id)}>
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
                <button className="ghost-button" onClick={() => onNavigate("customer360", spotlightLead.id)}>
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
