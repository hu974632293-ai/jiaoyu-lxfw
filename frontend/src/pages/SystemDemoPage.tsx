import { useEffect, useState } from "react";
import { Database, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { apiRequest } from "../api/client";
import type { PageProps } from "../App";
import SystemAdminPage from "./SystemAdminPage";

type Phase2Overview = {
  modules: Array<{ key: string; name: string; status: string }>;
  counts: Record<string, number>;
};

export default function SystemDemoPage(props: PageProps) {
  const { onSeedDemo, seedStatus } = props;
  const [overview, setOverview] = useState<Phase2Overview | null>(null);
  const [message, setMessage] = useState("正在加载 phase2 overview...");

  async function loadOverview() {
    setMessage("正在加载 phase2 overview...");
    try {
      const data = await apiRequest<Phase2Overview>("/api/phase2/overview");
      setOverview(data);
      setMessage("phase2 overview 已连接");
    } catch (error) {
      setOverview(null);
      setMessage(error instanceof Error ? `phase2 overview 加载失败：${error.message}` : "phase2 overview 加载失败");
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">系统与演示</p>
          <h2>集中放置 OpenAPI、seed、fallback 和系统治理入口</h2>
          <p>这些内容只在登录后可见，不出现在公开官网，也不作为客户增长主链路的首屏内容。</p>
        </div>
        <div className="heading-actions">
          <button className="icon-button" onClick={onSeedDemo}>
            <RefreshCw size={16} aria-hidden="true" />
            初始化演示数据
          </button>
          <a className="icon-button secondary" href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer">
            <ExternalLink size={16} aria-hidden="true" />
            OpenAPI
          </a>
        </div>
      </section>

      <section className="system-demo-grid">
        <article className="panel-block">
          <div className="section-title">
            <h3>演示数据</h3>
            <Database size={18} aria-hidden="true" />
          </div>
          <span className={seedStatus.includes("成功") ? "status-pill success" : seedStatus.includes("失败") || seedStatus.includes("请求") ? "status-pill danger" : "status-pill"}>
            {seedStatus}
          </span>
          <p className="muted">调用 `POST /api/demo/seed` 初始化演示数据，系统治理操作由管理员执行。</p>
        </article>

        <article className="panel-block">
          <div className="section-title">
            <h3>Dify / fallback</h3>
            <ShieldCheck size={18} aria-hidden="true" />
          </div>
          <div className="tag-cloud">
            <span>knowledge fallback_ready</span>
            <span>direct_sql blocked</span>
            <span>psych assistive_only</span>
          </div>
          <p className="muted">未配置 Dify 时，知识问答、企业指南和学生生活支持保留可解释 fallback，不阻断主业务。</p>
        </article>

        <article className="panel-block">
          <div className="section-title">
            <h3>phase2 overview</h3>
            <button className="tiny-button" onClick={loadOverview}>刷新</button>
          </div>
          <span className={overview ? "status-pill success" : "status-pill fallback"}>{message}</span>
          {overview ? (
            <div className="count-grid">
              {Object.entries(overview.counts).slice(0, 4).map(([key, value]) => (
                <div key={key}>
                  <span>{key}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">后端未启动时保留明确 fallback 状态。</div>
          )}
        </article>
      </section>

      <SystemAdminPage {...props} />
    </div>
  );
}
