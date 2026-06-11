import { useEffect, useState } from "react";
import { Building2, ClipboardCheck, Database, RefreshCw, Search, UserPlus } from "lucide-react";
import { apiRequest } from "../api/client";
import type { PageProps } from "../App";

type ChatResponse = {
  status: "success" | "fallback" | "blocked";
  answer: string;
};

type DailyReport = {
  id: number;
  structured_summary: {
    progress?: string;
    next_action?: string;
  };
  risks: string[];
};

type DailySummary = {
  report_count: number;
  progress_text: string;
  risks_text: string;
};

type OrgUnit = {
  id: number;
  unit_name: string;
  unit_type: string;
  contact_info: string;
};

type Nl2SqlResult = {
  status: "success" | "blocked";
  result: Record<string, unknown>;
};

const customerDraft = "录入客户：王晨，高三，想去新加坡读本科，家长关注预算和就业前景。";
const statusDraft = "更新客户王晨状态为高潜，今天 17:30 回访家长。";

export default function EmployeeWorkspacePage({ onNavigate }: PageProps) {
  const [message, setMessage] = useState("员工工作台待操作");
  const [dailyContent, setDailyContent] = useState("今天跟进 8 个客户，2 个高潜进入活动邀约，风险是德国项目材料不齐，明天补齐材料清单。");
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [queryResult, setQueryResult] = useState<Nl2SqlResult | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setMessage("正在刷新员工数据...");
    try {
      const [reports, summary, units] = await Promise.all([
        apiRequest<DailyReport[]>("/api/enterprise-assistant/daily-reports"),
        apiRequest<DailySummary>("/api/enterprise-assistant/daily-reports/summary"),
        apiRequest<OrgUnit[]>("/api/enterprise-assistant/org-units"),
      ]);
      setDailyReports(reports);
      setDailySummary(summary);
      setOrgUnits(units);
      setMessage("员工数据已刷新");
    } catch (error) {
      setMessage(error instanceof Error ? `员工数据加载失败：${error.message}` : "员工数据加载失败");
    }
  }

  async function runCommand(text: string, next?: () => void) {
    setMessage("正在处理员工指令...");
    try {
      const data = await apiRequest<ChatResponse>("/api/enterprise-assistant/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, actor_username: "admin" }),
      });
      setMessage(data.status === "fallback" ? data.answer : "员工指令已处理");
      next?.();
    } catch (error) {
      setMessage(error instanceof Error ? `员工指令失败：${error.message}` : "员工指令失败");
    }
  }

  async function submitDailyReport() {
    if (!dailyContent.trim()) {
      setMessage("请先填写日报内容");
      return;
    }
    setMessage("正在提交日报...");
    try {
      await apiRequest<DailyReport>("/api/enterprise-assistant/daily-reports", {
        method: "POST",
        body: JSON.stringify({ content: dailyContent, actor_username: "admin" }),
      });
      setMessage("提交日报成功");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? `提交日报失败：${error.message}` : "提交日报失败");
    }
  }

  async function runControlledQuery() {
    setMessage("正在查询客户统计...");
    try {
      const data = await apiRequest<Nl2SqlResult>("/api/enterprise-assistant/nl2sql/query", {
        method: "POST",
        body: JSON.stringify({ question: "查询本周高潜线索数量", actor_username: "admin" }),
      });
      setQueryResult(data);
      setMessage(data.status === "blocked" ? "查询被阻断" : "查询客户完成");
    } catch (error) {
      setMessage(error instanceof Error ? `查询客户失败：${error.message}` : "查询客户失败");
    }
  }

  const latestReport = dailyReports[0];

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">员工工作台</p>
          <h2>客户快捷操作、日报和内部查询</h2>
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
        <span className={message.includes("失败") || message.includes("阻断") ? "status-pill warning" : "status-pill success"}>{message}</span>
      </section>

      <section className="role-snapshot-grid" aria-label="员工今日概览">
        <article>
          <span>日报数量</span>
          <strong>{dailySummary?.report_count ?? dailyReports.length}</strong>
          <em>今日结构化记录</em>
        </article>
        <article>
          <span>组织资源</span>
          <strong>{orgUnits.length || "待加载"}</strong>
          <em>部门与联系人</em>
        </article>
        <article>
          <span>受控查询</span>
          <strong>{queryResult?.status ?? "待查询"}</strong>
          <em>只读白名单</em>
        </article>
      </section>

      <section className="role-action-grid" aria-label="员工快捷入口">
        <button className="role-action-card" onClick={() => runCommand(customerDraft, () => onNavigate("customerGrowth"))}>
          <UserPlus size={20} aria-hidden="true" />
          <strong>录入客户</strong>
          <span>写入客户线索</span>
        </button>
        <button className="role-action-card" onClick={runControlledQuery}>
          <Search size={20} aria-hidden="true" />
          <strong>查询客户</strong>
          <span>白名单统计</span>
        </button>
        <button className="role-action-card" onClick={() => runCommand(statusDraft, () => onNavigate("customerGrowth"))}>
          <ClipboardCheck size={20} aria-hidden="true" />
          <strong>更新状态</strong>
          <span>同步跟进状态</span>
        </button>
        <button className="role-action-card" onClick={submitDailyReport}>
          <Database size={20} aria-hidden="true" />
          <strong>提交日报</strong>
          <span>生成结构化摘要</span>
        </button>
      </section>

      <section className="role-workbench-grid employee-workbench-grid">
        <div className="panel-block employee-daily-panel">
          <div className="section-title">
            <h3>日报</h3>
            <span className="status-pill">{dailySummary?.report_count ?? 0} 条</span>
          </div>
          <label className="stacked-input">
            <span>日报内容</span>
            <textarea value={dailyContent} onChange={(event) => setDailyContent(event.target.value)} rows={4} />
          </label>
          <button className="tiny-button" onClick={submitDailyReport}>提交日报</button>
          {latestReport ? (
            <dl className="detail-list">
              <div>
                <dt>进展</dt>
                <dd>{latestReport.structured_summary.progress || dailySummary?.progress_text || "暂无"}</dd>
              </div>
              <div>
                <dt>风险</dt>
                <dd>{latestReport.risks.join("；") || dailySummary?.risks_text || "暂无"}</dd>
              </div>
              <div>
                <dt>下一步</dt>
                <dd>{latestReport.structured_summary.next_action || "待补充"}</dd>
              </div>
            </dl>
          ) : (
            <div className="empty-state">暂无日报。</div>
          )}
        </div>

        <aside className="side-stack employee-side-panel">
          <section className="panel-block">
            <div className="section-title">
              <h3>组织架构</h3>
              <Building2 size={18} aria-hidden="true" />
            </div>
            <div className="source-list">
              {orgUnits.length ? orgUnits.map((item) => (
                <article key={item.id}>
                  <strong>{item.unit_name}</strong>
                  <span>{item.unit_type}</span>
                  <em>{item.contact_info}</em>
                </article>
              )) : <div className="empty-state">暂无组织架构。</div>}
            </div>
          </section>

          <section className="panel-block">
            <div className="section-title">
              <h3>新人指南</h3>
              <span className="status-pill">内部</span>
            </div>
            <div className="guide-list">
              <article><strong>客户录入</strong><span>先建线索，再补资料和跟进。</span></article>
              <article><strong>日报口径</strong><span>进展、风险、明日动作必须明确。</span></article>
              <article><strong>受控查询</strong><span>只允许白名单只读统计。</span></article>
            </div>
          </section>

          <section className="panel-block">
            <div className="section-title">
              <h3>查询客户</h3>
              <span className="status-pill">{queryResult?.status ?? "待查询"}</span>
            </div>
            <pre>{queryResult ? JSON.stringify(queryResult.result, null, 2) : "暂无查询结果"}</pre>
          </section>
        </aside>
      </section>
    </div>
  );
}
