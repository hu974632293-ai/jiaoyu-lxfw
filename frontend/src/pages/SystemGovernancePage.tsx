import { Database, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import type { PageProps } from "../App";
import KnowledgePage from "./KnowledgePage";
import SystemAdminPage from "./SystemAdminPage";
import type { AdminGovernanceView } from "./SystemAdminPage";

type SystemGovernanceView = AdminGovernanceView | "knowledgeSources" | "systemStatus";

type SystemGovernancePageProps = PageProps & {
  initialView?: SystemGovernanceView;
};

export default function SystemGovernancePage(props: SystemGovernancePageProps) {
  const { onSeedDemo, seedStatus } = props;
  const initialView = props.initialView ?? "overview";
  const pageProps: PageProps = {
    role: props.role,
    onNavigate: props.onNavigate,
    onSeedDemo: props.onSeedDemo,
    seedStatus: props.seedStatus,
  };

  if (initialView === "knowledgeSources") {
    return <KnowledgePage {...pageProps} />;
  }

  if (["users", "roles", "permissions", "audit", "notifications"].includes(initialView)) {
    return <SystemAdminPage {...pageProps} initialView={initialView as AdminGovernanceView} />;
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">{initialView === "systemStatus" ? "系统状态" : "系统治理"}</p>
          <h2>{initialView === "systemStatus" ? "OpenAPI、seed、接口状态和 AI 边界" : "用户、角色、权限、审计、通知和系统控制"}</h2>
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
            <h3>演示数据</h3>
            <Database size={18} aria-hidden="true" />
          </div>
          <span className={seedStatus.includes("成功") ? "status-pill success" : seedStatus.includes("失败") ? "status-pill danger" : "status-pill"}>{seedStatus}</span>
          <p className="muted">初始化会重建干净演示业务数据，管理员操作后通过治理记录追踪。</p>
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

      {initialView === "overview" ? <SystemAdminPage {...pageProps} /> : null}
    </div>
  );
}
