import { Database, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import type { PageProps } from "../App";
import SystemAdminPage from "./SystemAdminPage";

export default function SystemGovernancePage(props: PageProps) {
  const { onSeedDemo, seedStatus } = props;

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">系统治理</p>
          <h2>用户、角色、权限、审计、通知和系统控制</h2>
        </div>
        <div className="heading-actions">
          <button className="icon-button" onClick={onSeedDemo}>
            <RefreshCw size={16} aria-hidden="true" />
            初始化 seed
          </button>
          <a className="icon-button secondary" href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer">
            <ExternalLink size={16} aria-hidden="true" />
            OpenAPI
          </a>
        </div>
      </section>

      <section className="governance-control-grid">
        <article className="panel-block">
          <div className="section-title">
            <h3>基础数据</h3>
            <Database size={18} aria-hidden="true" />
          </div>
          <span className={seedStatus.includes("成功") ? "status-pill success" : seedStatus.includes("失败") ? "status-pill danger" : "status-pill"}>{seedStatus}</span>
          <p className="muted">初始化仅用于演示数据和验收环境，不替代生产迁移。</p>
        </article>

        <article className="panel-block">
          <div className="section-title">
            <h3>AI 边界</h3>
            <ShieldCheck size={18} aria-hidden="true" />
          </div>
          <div className="tag-cloud">
            <span>知识来源</span>
            <span>Dify fallback</span>
            <span>NL2SQL 只读</span>
            <span>心理辅助</span>
          </div>
        </article>

        <article className="panel-block">
          <div className="section-title">
            <h3>治理范围</h3>
            <span className="status-pill">管理员</span>
          </div>
          <div className="tag-cloud">
            <span>用户</span>
            <span>角色</span>
            <span>权限</span>
            <span>审计</span>
            <span>通知</span>
            <span>知识来源</span>
          </div>
        </article>
      </section>

      <SystemAdminPage {...props} />
    </div>
  );
}
