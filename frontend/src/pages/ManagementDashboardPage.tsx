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
  summary_type: "daily" | "weekly";
  period_start: string | null;
  period_end: string | null;
  report_count: number;
  progress_text: string;
  risks_text: string;
  status: string;
  departments: { department: string; report_count: number }[];
  employees: { user_id: number; employee_name: string; department: string; report_count: number }[];
};

type ManagementDashboardPageProps = {
  onNavigate: (page: BackofficePageKey, leadId?: number) => void;
  initialView?: ManagementView;
};
type ManagementOperation = "refresh" | "generate" | "openReport" | null;
type ManagementView = "overview" | "growth" | "daily" | "psych" | "feedback" | "risk";

const reportLabels: Record<string, string> = {
  customer_operation: "客户经营报告",
  daily_summary: "员工日报汇总",
  student_psych_weekly: "学生心理健康周报",
  feedback_weekly: "投诉处理周报",
};

const viewCopy: Record<ManagementView, { eyebrow: string; title: string; subtitle: string; reportTypes: string[] }> = {
  overview: {
    eyebrow: "经营管理后台",
    title: "增长总览、报告和风险队列",
    subtitle: "集中查看经营指标、日报风险、学生支持风险和投诉处理。",
    reportTypes: ["customer_operation", "daily_summary", "student_psych_weekly", "feedback_weekly"],
  },
  growth: {
    eyebrow: "增长总览",
    title: "查看线索、转化、流失和活动风险",
    subtitle: "聚焦客户增长表现和经营建议，不展示系统治理入口。",
    reportTypes: ["customer_operation"],
  },
  daily: {
    eyebrow: "日报汇总",
    title: "查看团队日报和周报汇总",
    subtitle: "按日期、周起始日和部门筛选日报风险与进展。",
    reportTypes: ["daily_summary"],
  },
  psych: {
    eyebrow: "心理周报",
    title: "查看心理辅助风险趋势和跟进状态",
    subtitle: "心理预警仅为辅助识别，不替代专业心理诊断。",
    reportTypes: ["student_psych_weekly"],
  },
  feedback: {
    eyebrow: "投诉周报",
    title: "查看投诉数量、分类和未关闭事项",
    subtitle: "聚焦服务反馈、处理时效和未决风险。",
    reportTypes: ["feedback_weekly"],
  },
  risk: {
    eyebrow: "风险队列",
    title: "统一查看经营和学生服务风险",
    subtitle: "将高优先级客户、日报、心理和投诉风险集中呈现。",
    reportTypes: ["customer_operation", "daily_summary", "student_psych_weekly", "feedback_weekly"],
  },
};

function formatOperationTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

export default function ManagementDashboardPage({ onNavigate, initialView = "overview" }: ManagementDashboardPageProps) {
  const [reports, setReports] = useState<ReportCreated[]>([]);
  const [activeReport, setActiveReport] = useState<ReportDetail | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [dailySummaryFilters, setDailySummaryFilters] = useState({
    summaryType: "daily" as "daily" | "weekly",
    date: "",
    weekStart: "",
    department: "",
  });
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

  function buildDailySummaryPath() {
    const params = new URLSearchParams();
    params.set("summary_type", dailySummaryFilters.summaryType);
    if (dailySummaryFilters.summaryType === "daily" && dailySummaryFilters.date) {
      params.set("date", dailySummaryFilters.date);
    }
    if (dailySummaryFilters.summaryType === "weekly" && dailySummaryFilters.weekStart) {
      params.set("week_start", dailySummaryFilters.weekStart);
    }
    if (dailySummaryFilters.department.trim()) {
      params.set("department", dailySummaryFilters.department.trim());
    }
    return `/api/enterprise-assistant/daily-reports/summary?${params.toString()}`;
  }

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
        apiRequest<DailySummary>(buildDailySummaryPath()),
      ]);
      setReports(reportData);
      setDailySummary(summaryData);
      if (!options.preserveFeedback) {
        setOperationFeedback({
          phase: "success",
          title: "经营数据已刷新",
          detail: `已同步 ${reportData.length} 份报告和 ${summaryData.report_count} 条${summaryData.summary_type === "weekly" ? "周" : "日"}报记录。`,
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
          detail: error instanceof Error ? `${error.message}。可稍后重试，当前页面选择不会丢失。` : "服务暂不可用。可稍后重试，当前页面选择不会丢失。",
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
        detail: error instanceof Error ? `${error.message}。报告类型已保留，可重试。` : "服务暂不可用。报告类型已保留，可重试。",
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
        detail: error instanceof Error ? `${error.message}。列表选择已保留，可重试。` : "服务暂不可用。列表选择已保留，可重试。",
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
  const copy = viewCopy[initialView];
  const visibleReportTypes = reportTypes.filter((item) => copy.reportTypes.includes(item.key));
  const showMetrics = initialView === "overview" || initialView === "growth";
  const showReportPanel = initialView !== "risk";
  const showRiskQueue = initialView === "overview" || initialView === "risk" || initialView === "psych" || initialView === "feedback";
  const showDailySummary = initialView === "overview" || initialView === "daily";
  const showReportList = initialView !== "risk";

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={() => refresh()} disabled={hasPendingOperation}>
            <RefreshCw className={isRefreshing ? "spin-icon" : ""} size={16} aria-hidden="true" />
            {isRefreshing ? "正在刷新" : "刷新经营数据"}
          </button>
          <button className="icon-button" onClick={() => onNavigate("managerRiskQueue")}>
            风险队列
          </button>
        </div>
      </section>

      <section className="toolbar">
        <OperationFeedback feedback={operationFeedback} />
        <span className="status-pill">日报：{dailySummary?.report_count ?? 0} 条</span>
      </section>

      {showMetrics ? <section className="metric-grid" aria-label="经营指标">
        {dashboardMetrics.map((metric) => (
          <article className={`metric-card ${metric.state}`} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <em>{metric.trend}</em>
          </article>
        ))}
      </section> : null}

      <section className="management-layout">
        {showReportPanel ? <div className="panel-block">
          <div className="section-title">
            <h3>管理报告</h3>
            <FileText size={18} aria-hidden="true" />
          </div>
          <div className="management-report-grid">
            {visibleReportTypes.map((item) => (
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
        </div> : null}

        {showRiskQueue || showDailySummary ? <aside className="side-stack">
          {showRiskQueue ? <section className="panel-block">
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
          </section> : null}

          {showDailySummary ? <section className="panel-block">
            <div className="section-title">
              <h3>员工日报汇总</h3>
              <ClipboardList size={18} aria-hidden="true" />
            </div>
            <div className="form-grid compact-form-grid">
              <label className="stacked-input">
                <span>周期</span>
                <select
                  value={dailySummaryFilters.summaryType}
                  onChange={(event) =>
                    setDailySummaryFilters((current) => ({
                      ...current,
                      summaryType: event.target.value as "daily" | "weekly",
                    }))
                  }
                >
                  <option value="daily">日汇总</option>
                  <option value="weekly">周汇总</option>
                </select>
              </label>
              {dailySummaryFilters.summaryType === "daily" ? (
                <label className="stacked-input">
                  <span>日期</span>
                  <input
                    type="date"
                    value={dailySummaryFilters.date}
                    onChange={(event) => setDailySummaryFilters((current) => ({ ...current, date: event.target.value }))}
                  />
                </label>
              ) : (
                <label className="stacked-input">
                  <span>周起始</span>
                  <input
                    type="date"
                    value={dailySummaryFilters.weekStart}
                    onChange={(event) => setDailySummaryFilters((current) => ({ ...current, weekStart: event.target.value }))}
                  />
                </label>
              )}
              <label className="stacked-input">
                <span>部门</span>
                <input
                  value={dailySummaryFilters.department}
                  onChange={(event) => setDailySummaryFilters((current) => ({ ...current, department: event.target.value }))}
                  placeholder="如：升学规划部"
                />
              </label>
            </div>
            <button className="tiny-button" onClick={() => refresh()} disabled={hasPendingOperation}>
              查看汇总
            </button>
            <dl className="detail-list">
              <div>
                <dt>周期</dt>
                <dd>{dailySummary?.summary_type === "weekly" ? "周汇总" : "日汇总"} / {dailySummary?.period_start || "不限"} 至 {dailySummary?.period_end || "不限"}</dd>
              </div>
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
            <div className="source-list">
              {(dailySummary?.departments ?? []).slice(0, 4).map((item) => (
                <article key={item.department}>
                  <strong>{item.department}</strong>
                  <span>{item.report_count} 条日报</span>
                  <em>部门汇总</em>
                </article>
              ))}
              {dailySummary && !dailySummary.departments.length ? <div className="empty-state">当前筛选下暂无部门汇总。</div> : null}
            </div>
            <div className="log-list">
              {(dailySummary?.employees ?? []).slice(0, 5).map((item) => (
                <article key={`${item.user_id}-${item.department}`}>
                  <strong>{item.employee_name || `员工 #${item.user_id}`}</strong>
                  <span>{item.department || "未分配部门"}</span>
                  <em>{item.report_count} 条</em>
                </article>
              ))}
            </div>
          </section> : null}
        </aside> : null}
      </section>

      {showReportList ? <section className="split-layout secondary">
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
                <em>已生成</em>
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
      </section> : null}
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
