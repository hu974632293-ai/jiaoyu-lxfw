import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Filter, RefreshCw, Users } from "lucide-react";
import { apiRequest } from "../api/client";
import { crmPrototypeRows, pipelineStages } from "../data/prototype";
import type { BackofficePageKey } from "../navigation";

type Lead = { id: number; customer_name: string; status: string };

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
          <p>这里聚焦 CRM 流水线、客户队列和下一步推进；单个客户的画像、咨询、任务、活动和报告进入客户 360。</p>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={load}>
            <RefreshCw size={16} aria-hidden="true" />
            刷新队列
          </button>
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
