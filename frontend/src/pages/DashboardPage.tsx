import { useEffect, useState } from "react";
import { ArrowRight, Database, FileText, RefreshCw } from "lucide-react";
import { apiRequest } from "../api/client";
import type { PageProps } from "../App";
import { dashboardMetrics, todoItems, workflowCards } from "../data/prototype";

type Phase2Overview = {
  modules: Array<{ key: string; name: string; status: string }>;
  counts: Record<string, number>;
};

export default function DashboardPage({ onNavigate, onSeedDemo, seedStatus }: PageProps) {
  const [overview, setOverview] = useState<Phase2Overview | null>(null);
  const [message, setMessage] = useState("正在加载二期业务底座...");

  useEffect(() => {
    let alive = true;
    apiRequest<Phase2Overview>("/api/phase2/overview")
      .then((data) => {
        if (!alive) return;
        setOverview(data);
        setMessage("二期业务底座 API 已连接");
      })
      .catch((error) => {
        if (!alive) return;
        setMessage(error instanceof Error ? `二期 overview 加载失败：${error.message}` : "二期 overview 加载失败");
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">运营总览</p>
          <h2>从客户增长 demo 升级到完整教育服务业务系统</h2>
          <p>第一屏直接展示经营、客户、企业助手、学生服务和报告治理状态，不做营销首页。</p>
        </div>
        <div className="heading-actions">
          <button className="icon-button" onClick={onSeedDemo}>
            <RefreshCw size={16} aria-hidden="true" />
            初始化演示数据
          </button>
          <a className="icon-button secondary" href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer">
            <FileText size={16} aria-hidden="true" />
            OpenAPI
          </a>
        </div>
      </section>

      <section className="metric-grid">
        {dashboardMetrics.map((metric) => (
          <article className={`metric-card ${metric.state}`} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <em>{metric.trend}</em>
          </article>
        ))}
      </section>

      <section className="split-layout">
        <div className="panel-block">
          <div className="section-title">
            <h3>四条演示主线</h3>
            <span className="status-pill">{message}</span>
          </div>
          <div className="workflow-grid">
            {workflowCards.map((card) => (
              <button className="workflow-card" key={card.key} onClick={() => onNavigate(card.key as Parameters<typeof onNavigate>[0])}>
                <span>{card.status}</span>
                <strong>{card.title}</strong>
                <p>{card.summary}</p>
                <em>
                  进入模块 <ArrowRight size={14} aria-hidden="true" />
                </em>
              </button>
            ))}
          </div>
        </div>

        <div className="panel-block">
          <div className="section-title">
            <h3>今日待办</h3>
            <span>{todoItems.length} 项</span>
          </div>
          <div className="task-list">
            {todoItems.map((item) => (
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
            <h3>二期底座计数</h3>
            <Database size={18} aria-hidden="true" />
          </div>
          {overview ? (
            <div className="count-grid">
              {Object.entries(overview.counts).map(([key, value]) => (
                <div key={key}>
                  <span>{key}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">后端未启动时这里保留 empty/error 状态，不影响前端原型浏览。</div>
          )}
        </div>

        <div className="panel-block">
          <div className="section-title">
            <h3>AI 与 fallback 状态</h3>
            <span className="status-pill success">可解释</span>
          </div>
          <div className="ai-state">
            <p>Dify 未配置时，知识库、企业新人指南、学生生活支持都显示 fallback 原因，不阻断 CRM、活动和报告。</p>
            <pre>{JSON.stringify({ seedStatus, knowledge: "fallback_ready", direct_sql: "blocked", psych: "assistive_only" }, null, 2)}</pre>
          </div>
        </div>
      </section>
    </div>
  );
}
