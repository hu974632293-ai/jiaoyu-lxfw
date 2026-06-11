import { useEffect, useState } from "react";
import { BarChart3, Play, RefreshCw } from "lucide-react";
import { apiRequest } from "../api/client";
import { OperationFeedback, type OperationFeedbackState } from "../components/OperationFeedback";
import type { PageProps } from "../App";
import { reportTypes } from "../data/prototype";

type ReportCreated = {
  id: number;
  title: string;
  report_type: string;
  generation_mode: string;
  period_start: string | null;
  period_end: string | null;
};
type ReportDetail = ReportCreated & {
  content: Record<string, unknown>;
};
type ReportListItem = ReportCreated & {
  created_at: string | null;
};
type ReportOperation = "load" | "generate" | "open" | null;

function formatOperationTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

export default function ReportsPage({ onNavigate }: PageProps) {
  const [activeType, setActiveType] = useState(reportTypes[0].key);
  const [created, setCreated] = useState<ReportCreated | null>(null);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [operationFeedback, setOperationFeedback] = useState<OperationFeedbackState>({
    phase: "idle",
    title: "选择报告类型后生成",
    detail: "生成后会自动打开报告详情，并在报告列表中高亮最新快照。",
  });
  const [pendingOperation, setPendingOperation] = useState<ReportOperation>(null);
  const [highlightReportId, setHighlightReportId] = useState<number | null>(null);

  async function loadReports(options: { preserveFeedback?: boolean } = {}) {
    if (!options.preserveFeedback) {
      setPendingOperation("load");
      setOperationFeedback({
        phase: "pending",
        title: "正在刷新报告列表",
        detail: "读取报告中心快照列表。",
        target: "报告列表",
      });
    }
    try {
      setReports(await apiRequest<ReportListItem[]>("/api/reports"));
      if (!options.preserveFeedback) {
        setOperationFeedback({
          phase: "success",
          title: "报告列表已刷新",
          detail: "可打开已有报告详情，或继续生成新的业务报告。",
          target: "报告列表",
          timestamp: formatOperationTime(),
        });
      }
    } catch (error) {
      setReports([]);
      if (!options.preserveFeedback) {
        setOperationFeedback({
          phase: "error",
          title: "报告列表加载失败",
          detail: error instanceof Error ? `${error.message}。可稍后重试，当前报告生成条件不会丢失。` : "接口不可用。可稍后重试，当前报告生成条件不会丢失。",
          target: "报告列表",
          timestamp: formatOperationTime(),
        });
      }
    } finally {
      if (!options.preserveFeedback) {
        setPendingOperation(null);
      }
    }
  }

  async function generate() {
    const active = reportTypes.find((item) => item.key === activeType) ?? reportTypes[0];
    setPendingOperation("generate");
    setOperationFeedback({
      phase: "pending",
      title: "正在生成报告",
      detail: `报告类型：${active.title}。生成后会自动打开详情。`,
      target: active.title,
    });
    try {
      const data = await apiRequest<ReportCreated>("/api/reports/generate", {
        method: "POST",
        body: JSON.stringify({
          report_type: activeType,
          generated_by: "demo",
          period_start: "2026-06-01",
          period_end: "2026-06-10",
          use_llm_polish: false,
        }),
      });
      setCreated(data);
      setDetail(await apiRequest<ReportDetail>(`/api/reports/${data.id}`));
      setHighlightReportId(data.id);
      await loadReports({ preserveFeedback: true });
      setOperationFeedback({
        phase: "success",
        title: "报告已生成并打开详情",
        detail: "最新报告已显示在业务摘要区域，并在右侧报告列表中高亮。",
        target: `${data.title} / #${data.id}`,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "报告生成失败",
        detail: error instanceof Error ? `${error.message}。报告类型和时间条件已保留，可重试。` : "接口不可用。报告类型和时间条件已保留，可重试。",
        target: active.title,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function openReport(reportId: number) {
    setPendingOperation("open");
    setOperationFeedback({
      phase: "pending",
      title: "正在打开报告详情",
      detail: `读取报告 #${reportId} 的业务摘要。`,
      target: `报告 #${reportId}`,
    });
    try {
      const nextDetail = await apiRequest<ReportDetail>(`/api/reports/${reportId}`);
      setDetail(nextDetail);
      setHighlightReportId(reportId);
      setOperationFeedback({
        phase: "success",
        title: "报告详情已打开",
        detail: "业务摘要已显示在中间详情区域。",
        target: `${nextDetail.title} / #${reportId}`,
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

  useEffect(() => {
    loadReports();
  }, []);

  const active = reportTypes.find((item) => item.key === activeType) ?? reportTypes[0];
  const hasPendingOperation = pendingOperation !== null;
  const isLoadingReports = pendingOperation === "load";
  const isGenerating = pendingOperation === "generate";

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">报告中心</p>
          <h2>经营、日报、心理和投诉报告</h2>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={() => loadReports()} disabled={hasPendingOperation}>
            <RefreshCw className={isLoadingReports ? "spin-icon" : ""} size={16} aria-hidden="true" />
            {isLoadingReports ? "正在刷新" : "刷新报告列表"}
          </button>
          <button className="icon-button" onClick={generate} disabled={hasPendingOperation}>
            <Play size={16} aria-hidden="true" />
            {isGenerating ? "正在生成" : "生成当前报告"}
          </button>
        </div>
      </section>

      <OperationFeedback feedback={operationFeedback} />

      <section className="report-layout">
        <aside className="panel-block">
          <div className="section-title">
            <h3>报告类型</h3>
            <span className="status-pill">{operationFeedback.phase === "pending" ? "处理中" : "可操作"}</span>
          </div>
          <div className="select-list">
            {reportTypes.map((item) => (
              <button className={item.key === activeType ? "active" : ""} key={item.key} onClick={() => setActiveType(item.key)}>
                <strong>{item.title}</strong>
                <span>{item.summary}</span>
                <em>{item.mode}</em>
              </button>
            ))}
          </div>
        </aside>

        <div className="panel-block">
          <div className="section-title">
            <h3>{active.title}</h3>
            <span className={active.mode.includes("真实") ? "status-pill success" : "status-pill fallback"}>{active.mode}</span>
          </div>
          <div className="parameter-grid">
            <label>
              <span>时间范围</span>
              <input defaultValue="2026-06-01 至 2026-06-10" />
            </label>
            <label>
              <span>部门/项目</span>
              <input defaultValue="全部部门 / 全部项目" />
            </label>
            <label>
              <span>生成方式</span>
              <input value="template_rule" readOnly />
            </label>
          </div>

          {created && (
            <div className="compact-card">
              <strong>最近生成报告</strong>
              <span>{created.title} / {created.generation_mode} / #{created.id}</span>
            </div>
          )}

          {detail ? (
            <article className="answer-card report-business-card">
              <div className="section-title">
                <h3>报告详情</h3>
                <BarChart3 size={18} aria-hidden="true" />
              </div>
              <ReportBusinessSummary content={detail.content} />
            </article>
          ) : (
            <div className="empty-state">点击生成报告后展示业务摘要。</div>
          )}
        </div>

        <aside className="panel-block">
          <div className="section-title">
            <h3>报告列表</h3>
            <span>{reports.length ? `${reports.length} 份` : "暂无真实快照"}</span>
          </div>
          <div className="log-list">
            {reports.map((item) => (
              <article className={highlightReportId === item.id ? "is-highlighted" : ""} key={item.id} onClick={() => openReport(item.id)}>
                <strong>{item.title}</strong>
                <span>{item.report_type}</span>
                <em>{item.created_at?.slice(0, 16).replace("T", " ") ?? `#${item.id}`}</em>
              </article>
            ))}
            {!reports.length && <div className="empty-state">暂无报告快照，点击生成报告后出现。</div>}
          </div>
          <button className="icon-button secondary full-width" onClick={() => onNavigate("customerGrowth")}>跳转相关客户</button>
        </aside>
      </section>
    </div>
  );
}

function ReportBusinessSummary({ content }: { content: Record<string, unknown> }) {
  const entries = Object.entries(content).slice(0, 8);

  return (
    <div className="report-business-list">
      {entries.map(([key, value]) => (
        <article key={key}>
          <span>{formatReportKey(key)}</span>
          <strong>{formatReportValue(value)}</strong>
        </article>
      ))}
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
