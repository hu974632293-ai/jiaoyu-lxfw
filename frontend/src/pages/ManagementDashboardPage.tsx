import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, ClipboardList, FileText, RefreshCw } from "lucide-react";
import { apiRequest } from "../api/client";
import { dashboardMetrics, reportTypes, todoItems } from "../data/prototype";
import type { BackofficePageKey } from "../navigation";

type ReportCreated = {
  id: number;
  title: string;
  report_type: string;
  generation_mode: string;
};

type ReportDetail = ReportCreated & {
  content: Record<string, unknown>;
};

type DailySummary = {
  report_count: number;
  progress_text: string;
  risks_text: string;
  status: string;
};

type ManagementDashboardPageProps = {
  onNavigate: (page: BackofficePageKey, leadId?: number) => void;
};

const reportLabels: Record<string, string> = {
  customer_operation: "客户经营报告",
  daily_summary: "员工日报汇总",
  student_psych_weekly: "学生心理健康周报",
  feedback_weekly: "投诉处理周报",
};

export default function ManagementDashboardPage({ onNavigate }: ManagementDashboardPageProps) {
  const [reports, setReports] = useState<ReportCreated[]>([]);
  const [activeReport, setActiveReport] = useState<ReportDetail | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [message, setMessage] = useState("经营管理后台待刷新");

  const riskQueue = useMemo(
    () => todoItems.filter((item) => item.level === "高" || item.meta.includes("投诉") || item.meta.includes("心理")),
    [],
  );

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setMessage("正在刷新经营数据...");
    try {
      const [reportData, summaryData] = await Promise.all([
        apiRequest<ReportCreated[]>("/api/reports"),
        apiRequest<DailySummary>("/api/enterprise-assistant/daily-reports/summary"),
      ]);
      setReports(reportData);
      setDailySummary(summaryData);
      setMessage("经营数据已刷新");
    } catch (error) {
      setReports([]);
      setDailySummary(null);
      setMessage(error instanceof Error ? `经营数据加载失败：${error.message}` : "经营数据加载失败");
    }
  }

  async function generateReport(reportType: string) {
    setMessage(`正在生成${reportLabels[reportType] ?? "报告"}...`);
    try {
      const created = await apiRequest<ReportCreated>("/api/reports/generate", {
        method: "POST",
        body: JSON.stringify({
          report_type: reportType,
          generated_by: "manager",
          period_start: "2026-06-01",
          period_end: "2026-06-10",
          use_llm_polish: false,
        }),
      });
      const detail = await apiRequest<ReportDetail>(`/api/reports/${created.id}`);
      setActiveReport(detail);
      setMessage(`${reportLabels[reportType] ?? created.title}已生成`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? `报告生成失败：${error.message}` : "报告生成失败");
    }
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">经营管理后台</p>
          <h2>增长总览、报告和风险队列</h2>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={refresh}>
            <RefreshCw size={16} aria-hidden="true" />
            刷新
          </button>
          <button className="icon-button" onClick={() => onNavigate("customerGrowth")}>
            客户增长
          </button>
        </div>
      </section>

      <section className="toolbar">
        <span className={message.includes("失败") ? "status-pill warning" : "status-pill success"}>{message}</span>
        <span className="status-pill">日报：{dailySummary?.report_count ?? 0} 条</span>
      </section>

      <section className="metric-grid" aria-label="经营指标">
        {dashboardMetrics.map((metric) => (
          <article className={`metric-card ${metric.state}`} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <em>{metric.trend}</em>
          </article>
        ))}
      </section>

      <section className="management-layout">
        <div className="panel-block">
          <div className="section-title">
            <h3>管理报告</h3>
            <FileText size={18} aria-hidden="true" />
          </div>
          <div className="management-report-grid">
            {reportTypes.map((item) => (
              <article key={item.key}>
                <span>{item.mode}</span>
                <strong>{reportLabels[item.key] ?? item.title}</strong>
                <p>{item.summary}</p>
                <button className="tiny-button" onClick={() => generateReport(item.key)}>
                  生成
                </button>
              </article>
            ))}
          </div>
        </div>

        <aside className="side-stack">
          <section className="panel-block">
            <div className="section-title">
              <h3>风险队列</h3>
              <AlertTriangle size={18} aria-hidden="true" />
            </div>
            <div className="task-list">
              {riskQueue.map((item) => (
                <article className="task-row" key={item.title}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.meta}</span>
                  </div>
                  <em>{item.level}</em>
                </article>
              ))}
            </div>
          </section>

          <section className="panel-block">
            <div className="section-title">
              <h3>员工日报汇总</h3>
              <ClipboardList size={18} aria-hidden="true" />
            </div>
            <dl className="detail-list">
              <div>
                <dt>状态</dt>
                <dd>{dailySummary?.status ?? "暂无"}</dd>
              </div>
              <div>
                <dt>进展</dt>
                <dd>{dailySummary?.progress_text || "暂无"}</dd>
              </div>
              <div>
                <dt>风险</dt>
                <dd>{dailySummary?.risks_text || "暂无"}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </section>

      <section className="split-layout secondary">
        <div className="panel-block">
          <div className="section-title">
            <h3>最近报告</h3>
            <span>{reports.length} 份</span>
          </div>
          <div className="log-list">
            {reports.slice(0, 5).map((item) => (
              <article key={item.id} onClick={() => apiRequest<ReportDetail>(`/api/reports/${item.id}`).then(setActiveReport).catch(() => setMessage("报告详情加载失败"))}>
                <strong>{item.title}</strong>
                <span>{reportLabels[item.report_type] ?? item.report_type}</span>
                <em>{item.generation_mode}</em>
              </article>
            ))}
            {!reports.length && <div className="empty-state">暂无报告。</div>}
          </div>
        </div>

        <div className="panel-block">
          <div className="section-title">
            <h3>{activeReport?.title ?? "报告详情"}</h3>
            <BarChart3 size={18} aria-hidden="true" />
          </div>
          {activeReport ? (
            <div className="report-business-list compact-report-list">
              {Object.entries(activeReport.content).slice(0, 6).map(([key, value]) => (
                <article key={key}>
                  <span>{formatReportKey(key)}</span>
                  <strong>{formatReportValue(value)}</strong>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">选择或生成报告后展示。</div>
          )}
        </div>
      </section>
    </div>
  );
}

function formatReportKey(value: string): string {
  return value.replace(/_/g, " ");
}

function formatReportValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => formatReportValue(item)).join("；") || "暂无";
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${formatReportKey(key)}：${formatReportValue(item)}`)
      .join("；") || "暂无";
  }
  return String(value ?? "暂无");
}
