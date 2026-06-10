import { useEffect, useState } from "react";
import { FileJson, Play, RefreshCw } from "lucide-react";
import { apiRequest } from "../api/client";
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

export default function ReportsPage({ onNavigate }: PageProps) {
  const [activeType, setActiveType] = useState(reportTypes[0].key);
  const [created, setCreated] = useState<ReportCreated | null>(null);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [message, setMessage] = useState("选择报告类型后生成");

  async function loadReports() {
    try {
      setReports(await apiRequest<ReportListItem[]>("/api/reports"));
      setMessage("报告列表已刷新");
    } catch (error) {
      setReports([]);
      setMessage(error instanceof Error ? `报告列表加载失败：${error.message}` : "报告列表加载失败");
    }
  }

  async function generate() {
    setMessage("正在调用报告中心真实 API...");
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
      setMessage("报告已通过真实 API 生成");
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
          <p>报告先做页面报告和结构化快照，不做 PDF/Word 导出；四类报告均调用真实 API 并保存快照。</p>
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
            <span>{reports.length ? `${reports.length} 份` : "暂无真实快照"}</span>
          </div>
          <div className="log-list">
            {reports.map((item) => (
              <article key={item.id} onClick={() => apiRequest<ReportDetail>(`/api/reports/${item.id}`).then(setDetail).catch(() => setMessage("报告详情加载失败"))}>
                <strong>{item.title}</strong>
                <span>{item.report_type}</span>
                <em>{item.created_at?.slice(0, 16).replace("T", " ") ?? `#${item.id}`}</em>
              </article>
            ))}
            {!reports.length && <div className="empty-state">暂无报告快照，点击生成报告后出现。</div>}
          </div>
          <button className="icon-button secondary full-width" onClick={() => onNavigate("crm")}>跳转相关客户</button>
        </aside>
      </section>
    </div>
  );
}
