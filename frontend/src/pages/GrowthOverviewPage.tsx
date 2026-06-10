import { ArrowRight, Bell, CalendarCheck, ClipboardList, Users } from "lucide-react";
import { crmPrototypeRows, growthFocusItems, growthMetrics, mockReportSnapshots, todoItems } from "../data/prototype";
import type { BackofficePageKey } from "../navigation";

type GrowthOverviewPageProps = {
  onNavigate: (page: BackofficePageKey, leadId?: number) => void;
};

export default function GrowthOverviewPage({ onNavigate }: GrowthOverviewPageProps) {
  const recentCustomers = crmPrototypeRows.slice(0, 3);
  const growthTodos = todoItems.filter((item) => item.meta.includes("CRM") || item.meta.includes("活动"));

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">增长总览</p>
          <h2>今天先推进高潜客户、跟进任务和活动转化</h2>
          <p>后台首页聚焦客户增长状态、今日推进和最近客户，不展示 OpenAPI、seed、fallback JSON 等系统演示信息。</p>
        </div>
        <div className="heading-actions">
          <button className="icon-button" onClick={() => onNavigate("customerGrowth")}>
            <Users size={16} aria-hidden="true" />
            进入客户增长
          </button>
        </div>
      </section>

      <section className="growth-metric-grid" aria-label="增长指标">
        {growthMetrics.map((metric) => (
          <article className={`metric-card ${metric.state}`} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <em>{metric.trend}</em>
          </article>
        ))}
      </section>

      <section className="growth-overview-grid">
        <div className="panel-block">
          <div className="section-title">
            <h3>今日推进重点</h3>
            <Bell size={18} aria-hidden="true" />
          </div>
          <div className="growth-focus-list">
            {growthFocusItems.map((item) => (
              <button className="growth-focus-card" key={item.title} onClick={() => onNavigate("customer360", item.leadId)}>
                <span className={`status-pill ${item.priority === "高" ? "danger" : item.priority === "中" ? "warning" : ""}`}>{item.priority}</span>
                <strong>{item.title}</strong>
                <small>{item.meta}</small>
                <em>
                  查看客户 360 <ArrowRight size={14} aria-hidden="true" />
                </em>
              </button>
            ))}
          </div>
        </div>

        <div className="panel-block">
          <div className="section-title">
            <h3>今日待办</h3>
            <ClipboardList size={18} aria-hidden="true" />
          </div>
          <div className="task-list">
            {growthTodos.map((item) => (
              <article className="task-row" key={item.title}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.meta}</span>
                </div>
                <em>{item.level}</em>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="split-layout secondary">
        <div className="panel-block">
          <div className="section-title">
            <h3>最近客户</h3>
            <button className="tiny-button" onClick={() => onNavigate("customerGrowth")}>
              查看队列
            </button>
          </div>
          <div className="recent-customer-grid">
            {recentCustomers.map((customer) => (
              <button className="customer-summary-card" key={customer.id} onClick={() => onNavigate("customer360", customer.id)}>
                <span>{customer.statusLabel}</span>
                <strong>{customer.customer_name}</strong>
                <small>{customer.project}</small>
                <p>{customer.nextTask}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="panel-block">
          <div className="section-title">
            <h3>报告摘要</h3>
            <CalendarCheck size={18} aria-hidden="true" />
          </div>
          <div className="report-summary-list">
            {mockReportSnapshots.slice(0, 2).map((report) => (
              <article className="mini-row" key={report.title}>
                <span>
                  <strong>{report.title}</strong>
                  <small>{report.period} / {report.risk}</small>
                </span>
                <em>{report.type}</em>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
