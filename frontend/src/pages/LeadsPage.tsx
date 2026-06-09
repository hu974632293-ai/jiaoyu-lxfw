import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Filter, Plus, RefreshCw } from "lucide-react";
import { apiRequest } from "../api/client";
import type { PageProps } from "../App";
import { crmPrototypeRows, crmTimeline } from "../data/prototype";

type Lead = { id: number; customer_name: string; status: string };
type LeadDetail = {
  id: number;
  customer_name: string;
  contact_info: string;
  background_info: string;
  status: string;
};

const statusMap: Record<string, string> = {
  new: "新线索",
  contacted: "已联系",
  high_potential: "高潜跟进",
  consulting: "咨询中",
  converted: "已成交",
  lost: "暂缓/流失",
};

export default function LeadsPage({ onNavigate }: PageProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedId, setSelectedId] = useState(1);
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [keyword, setKeyword] = useState("");
  const [message, setMessage] = useState("正在加载真实 CRM 线索...");
  const [followUpText, setFollowUpText] = useState("家长关注新加坡本科费用，希望周末参加说明会。");
  const [localTimeline, setLocalTimeline] = useState(crmTimeline);

  async function load() {
    setMessage("正在刷新真实线索...");
    try {
      const data = await apiRequest<Lead[]>("/api/leads");
      setLeads(data);
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

  async function updateStatus(status: string) {
    setMessage("正在调用真实状态流转接口...");
    try {
      await apiRequest(`/api/leads/${selectedId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setMessage(`状态已更新为：${statusMap[status] ?? status}`);
      setLocalTimeline((items) => [{ time: "刚刚", title: "状态流转", detail: `通过真实 API 更新为 ${statusMap[status] ?? status}` }, ...items]);
      await load();
      await loadDetail(selectedId);
    } catch (error) {
      setMessage(error instanceof Error ? `状态更新失败：${error.message}` : "状态更新失败");
    }
  }

  function addFollowUp() {
    setLocalTimeline((items) => [{ time: "刚刚", title: "新增跟进（原型）", detail: followUpText }, ...items]);
    setMessage("跟进已追加到前端原型时间线，后端跟进 API 后续阶段实现");
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadDetail(selectedId);
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

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">完整 CRM</p>
          <h2>线索列表、详情、跟进时间线和阶段流转</h2>
          <p>列表和状态更新优先调用一期真实 API；跟进、任务、活动和画像详情先以原型数据补齐交互。</p>
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
            <h3>{selected.customer_name}</h3>
            <span className="status-pill success">{selected.statusLabel}</span>
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
            <span>新增跟进（原型）</span>
            <textarea value={followUpText} onChange={(event) => setFollowUpText(event.target.value)} rows={3} />
          </label>
          <button className="icon-button" onClick={addFollowUp}>
            <CheckCircle2 size={16} aria-hidden="true" />
            追加跟进
          </button>
        </aside>
      </section>

      <section className="panel-block">
        <div className="section-title">
          <h3>客户时间线</h3>
          <span>创建、画像、问答、跟进、状态变化、活动报名</span>
        </div>
        <div className="timeline">
          {localTimeline.map((item, index) => (
            <article key={`${item.time}-${item.title}-${index}`}>
              <span>{item.time}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
