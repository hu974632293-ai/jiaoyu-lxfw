import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ClipboardList, Filter, RefreshCw, Sparkles, UserPlus, Users } from "lucide-react";
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
  const [sourceText, setSourceText] = useState("19岁 高中毕业 希望新加坡升学，家长关注预算和就业前景。");
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);

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
    load();
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
    setMessage("正在触发研判...");
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
      setMessage(`触发研判完成，推荐：${data.matched_project || "待补充资料"}`);
    } catch (error) {
      setMessage(error instanceof Error ? `触发研判失败：${error.message}` : "触发研判失败");
    }
  }

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
    return source.filter((item) => {
      const hitKeyword = item.customer_name.includes(keyword) || item.project.includes(keyword) || item.owner.includes(keyword);
      const hitStatus = statusFilter === "all" || item.status === statusFilter;
      return hitKeyword && hitStatus;
    });
  }, [keyword, leads, statusFilter]);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">客户增长</p>
          <h2>从新线索到成交/流失的增长队列</h2>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={load}>
            <RefreshCw size={16} aria-hidden="true" />
            刷新队列
          </button>
        </div>
      </section>

      <section className="split-layout secondary">
        <div className="panel-block">
          <div className="section-title">
            <h3>新建线索</h3>
            <UserPlus size={18} aria-hidden="true" />
          </div>
          <div className="form-grid compact">
            <label className="stacked-input">
              <span>客户姓名</span>
              <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="例如：王晨" />
            </label>
            <label className="stacked-input">
              <span>联系方式</span>
              <input value={contactInfo} onChange={(event) => setContactInfo(event.target.value)} placeholder="手机号 / 微信 / 邮箱" />
            </label>
          </div>
          <label className="stacked-input">
            <span>粘贴资料</span>
            <textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} rows={4} />
          </label>
          <div className="inline-actions">
            <button className="icon-button" onClick={createLead}>
              <UserPlus size={16} aria-hidden="true" />
              新建线索
            </button>
            <button className="icon-button secondary" onClick={assessLead}>
              <Sparkles size={16} aria-hidden="true" />
              触发研判
            </button>
            {createdId ? (
              <button className="ghost-button" onClick={() => onNavigate("customer360", createdId)}>
                客户 360 <ArrowRight size={13} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="panel-block">
          <div className="section-title">
            <h3>研判结果</h3>
            <ClipboardList size={18} aria-hidden="true" />
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
            <div className="empty-state">新建或粘贴资料后可触发研判。</div>
          )}
        </div>
      </section>

      <section className="pipeline-stage-grid" aria-label="客户增长阶段漏斗">
        {pipelineStages.map((stage, index) => (
          <article className="pipeline-stage-card" key={stage.label}>
            <span>0{index + 1}</span>
            <strong>{stage.count}</strong>
            <em>{stage.label}</em>
          </article>
        ))}
      </section>

      <section className="toolbar">
        <Filter size={16} aria-hidden="true" />
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索客户、负责人或推荐项目" />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="状态筛选">
          <option value="all">全部状态</option>
          <option value="new">新线索</option>
          <option value="high_potential">高潜跟进</option>
          <option value="consulting">咨询中</option>
          <option value="converted">已成交</option>
          <option value="lost">暂缓/流失</option>
        </select>
        <span className="status-pill">{message}</span>
      </section>

      <section className="panel-block table-panel">
        <div className="section-title">
          <h3>客户队列</h3>
          <span>{rows.length} 位客户</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>客户</th>
              <th>阶段</th>
              <th>推荐项目</th>
              <th>负责人</th>
              <th>下一步</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((lead) => (
              <tr key={lead.id} onClick={() => onNavigate("customer360", lead.id)}>
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
                <td>
                  <button className="tiny-button" onClick={() => onNavigate("customer360", lead.id)}>
                    <Users size={14} aria-hidden="true" />
                    客户 360 <ArrowRight size={13} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="empty-state">当前筛选无匹配客户。</div>}
      </section>
    </div>
  );
}
