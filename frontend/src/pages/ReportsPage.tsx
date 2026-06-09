import { useEffect, useState } from "react";
import { FileJson, Play, RefreshCw } from "lucide-react";
import { apiRequest } from "../api/client";
import type { PageProps } from "../App";
import { mockReportSnapshots, reportTypes } from "../data/prototype";

type ReportCreated = { id: number; title: string; generation_mode: string };
type ReportDetail = { id: number; title: string; content: Record<string, unknown>; generation_mode: string };
type ReportListItem = { id: number; title: string; report_type: string };

export default function ReportsPage({ onNavigate }: PageProps) {
  const [activeType, setActiveType] = useState(reportTypes[0].key);
  const [created, setCreated] = useState<ReportCreated | null>(null);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [message, setMessage] = useState("选择报告类型后生成");

  async function loadReports() {
    try {
      setReports(await apiRequest<ReportListItem[]>("/api/reports"));
    } catch {
      setReports([]);
    }
  }

  async function generate() {
    if (activeType !== "customer") {
      setCreated(null);
      setDetail({
        id: 0,
        title: reportTypes.find((item) => item.key === activeType)?.title ?? "原型报告",
        generation_mode: "frontend_mock",
        content: {
          period: "2026-W24",
          conclusion: "本报告类型后端 API 后续阶段实现，当前展示页面报告和 JSON 快照结构。",
          risk: mockReportSnapshots.find((item) => item.type === activeType)?.risk,
          actions: ["补齐后端报告任务", "保留模板兜底", "接入审计日志"],
        },
      });
      setMessage("已生成前端 mock 报告快照");
      return;
    }

    setMessage("正在调用真实客户经营报告 API...");
    try {
      const data = await apiRequest<ReportCreated>("/api/reports/customer-operation", {
        method: "POST",
        body: JSON.stringify({ generated_by: "demo", use_llm_polish: false }),
      });
      setCreated(data);
      setDetail(await apiRequest<ReportDetail>(`/api/reports/${data.id}`));
      setMessage("客户经营报告已通过真实 API 生成");
      await loadReports();
    } catch (error) {
      setMessage(error instanceof Error ? `报告生成失败：${error.message}` : "报告生成失败");
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  const active = reportTypes.find((item) => item.key === activeType) ?? reportTypes[0];

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">报告中心</p>
          <h2>四类管理报告和 JSON 快照</h2>
          <p>报告先做页面报告和结构化快照，不做 PDF/Word 导出。客户经营报告继续调用真实 API。</p>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={loadReports}>
            <RefreshCw size={16} aria-hidden="true" />
            刷新列表
          </button>
          <button className="icon-button" onClick={generate}>
            <Play size={16} aria-hidden="true" />
            生成报告
          </button>
        </div>
      </section>

      <section className="report-layout">
        <aside className="panel-block">
          <div className="section-title">
            <h3>报告类型</h3>
            <span className="status-pill">{message}</span>
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
              <input defaultValue={activeType === "customer" ? "template_rule" : "frontend_mock"} />
            </label>
          </div>

          {created && (
            <div className="compact-card">
              <strong>最近真实报告</strong>
              <span>{created.title} / {created.generation_mode}</span>
            </div>
          )}

          {detail ? (
            <article className="answer-card">
              <div className="section-title">
                <h3>报告详情</h3>
                <FileJson size={18} aria-hidden="true" />
              </div>
              <pre>{JSON.stringify(detail.content, null, 2)}</pre>
            </article>
          ) : (
            <div className="empty-state">点击生成报告后展示结构化 JSON 快照。</div>
          )}
        </div>

        <aside className="panel-block">
          <div className="section-title">
            <h3>报告列表</h3>
            <span>真实 + mock</span>
          </div>
          <div className="log-list">
            {reports.map((item) => (
              <article key={item.id}>
                <strong>{item.title}</strong>
                <span>{item.report_type}</span>
                <em>#{item.id}</em>
              </article>
            ))}
            {mockReportSnapshots.map((item) => (
              <article key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.period}</span>
                <em>mock</em>
              </article>
            ))}
          </div>
          <button className="icon-button secondary full-width" onClick={() => onNavigate("crm")}>跳转相关客户</button>
        </aside>
      </section>
    </div>
  );
}
