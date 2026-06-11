import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, ClipboardList, FileText, RefreshCw } from "lucide-react";
import { apiRequest } from "../api/client";
import { OperationFeedback, type OperationFeedbackState } from "../components/OperationFeedback";
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
type ManagementOperation = "refresh" | "generate" | "openReport" | null;

const reportLabels: Record<string, string> = {
  customer_operation: "客户经营报告",
  daily_summary: "员工日报汇总",
  student_psych_weekly: "学生心理健康周报",
  feedback_weekly: "投诉处理周报",
};

function formatOperationTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

export default function ManagementDashboardPage({ onNavigate }: ManagementDashboardPageProps) {
  const [reports, setReports] = useState<ReportCreated[]>([]);
  const [activeReport, setActiveReport] = useState<ReportDetail | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [operationFeedback, setOperationFeedback] = useState<OperationFeedbackState>({
    phase: "idle",
    title: "经营管理后台待刷新",
    detail: "可刷新经营数据，或生成客户经营、日报、心理和投诉报告。",
  });
  const [pendingOperation, setPendingOperation] = useState<ManagementOperation>(null);
  const [highlightReportId, setHighlightReportId] = useState<number | null>(null);

  const riskQueue = useMemo(
    () => todoItems.filter((item) => item.level === "高" || item.meta.includes("投诉") || item.meta.includes("心理")),
    [],
  );

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh(options: { preserveFeedback?: boolean } = {}) {
    if (!options.preserveFeedback) {
      setPendingOperation("refresh");
      setOperationFeedback({
        phase: "pending",
        title: "正在刷新经营数据",
        detail: "读取报告列表和员工日报汇总。",
        target: "经营管理后台",
      });
    }
    try {
      const [reportData, summaryData] = await Promise.all([
        apiRequest<ReportCreated[]>("/api/reports"),
        apiRequest<DailySummary>("/api/enterprise-assistant/daily-reports/summary"),
      ]);
      setReports(reportData);
      setDailySummary(summaryData);
      if (!options.preserveFeedback) {
        setOperationFeedback({
          phase: "success",
          title: "经营数据已刷新",
          detail: `已同步 ${reportData.length} 份报告和 ${summaryData.report_count} 条日报汇总。`,
          target: "经营管理后台",
          timestamp: formatOperationTime(),
        });
      }
    } catch (error) {
      setReports([]);
      setDailySummary(null);
      if (!options.preserveFeedback) {
        setOperationFeedback({
          phase: "error",
          title: "经营数据加载失败",
          detail: error instanceof Error ? `${error.message}。可稍后重试，已保留页面兜底信息。` : "接口不可用。可稍后重试，已保留页面兜底信息。",
          target: "经营管理后台",
          timestamp: formatOperationTime(),
        });
      }
    } finally {
      if (!options.preserveFeedback) {
        setPendingOperation(null);
      }
    }
  }

  async function generateReport(reportType: string) {
    const reportLabel = reportLabels[reportType] ?? "报告";
    setPendingOperation("generate");
    setOperationFeedback({
      phase: "pending",
      title: `正在生成${reportLabel}`,
      detail: "生成后会自动打开报告详情，并刷新最近报告列表。",
      target: reportLabel,
    });
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
      setHighlightReportId(created.id);
      await refresh({ preserveFeedback: true });
      setOperationFeedback({
        phase: "success",
        title: `${reportLabel}已生成`,
        detail: "最新报告已打开详情，并在最近报告列表中高亮。",
        target: `${created.title} / #${created.id}`,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "报告生成失败",
        detail: error instanceof Error ? `${error.message}。报告类型已保留，可重试。` : "接口不可用。报告类型已保留，可重试。",
        target: reportLabel,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function openReport(reportId: number) {
    setPendingOperation("openReport");
    setOperationFeedback({
      phase: "pending",
      title: "正在打开报告详情",
      detail: `读取报告 #${reportId} 的经营摘要。`,
      target: `报告 #${reportId}`,
    });
    try {
      const detail = await apiRequest<ReportDetail>(`/api/reports/${reportId}`);
      setActiveReport(detail);
      setHighlightReportId(reportId);
      setOperationFeedback({
        phase: "success",
        title: "报告详情已打开",
        detail: "经营摘要已显示在详情区域。",
        target: `${detail.title} / #${reportId}`,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "报告详情加载失败",
        detail: error instanceof Error ? `${error.message}。列表选择已保留，可重试。` : "接口不可用。列表选择已保留，可重试。",
        target: `报告 #${reportId}`,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  const hasPendingOperation = pendingOperation !== null;
  const isRefreshing = pendingOperation === "refresh";
  const isGenerating = pendingOperation === "generate";

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">经营管理后台</p>
          <h2>增长总览、报告和风险队列</h2>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={() => refresh()} disabled={hasPendingOperation}>
            <RefreshCw className={isRefreshing ? "spin-icon" : ""} size={16} aria-hidden="true" />
            {isRefreshing ? "正在刷新" : "刷新经营数据"}
          </button>
          <button className="icon-button" onClick={() => onNavigate("customerGrowth")}>
            客户增长
          </button>
        </div>
      </section>

      <section className="toolbar">
        <OperationFeedback feedback={operationFeedback} />
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
                <button className="tiny-button" onClick={() => generateReport(item.key)} disabled={hasPendingOperation}>
                  {isGenerating ? "生成中" : "生成报告"}
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
              <article className={highlightReportId === item.id ? "is-highlighted" : ""} key={item.id} onClick={() => openReport(item.id)}>
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
