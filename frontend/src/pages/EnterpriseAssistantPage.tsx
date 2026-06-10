import { useEffect, useState } from "react";
import { Bot, Building2, Database, RefreshCw, Send, ShieldAlert } from "lucide-react";
import { apiRequest } from "../api/client";
import type { PageProps } from "../App";
import { enterpriseQuickCommands } from "../data/prototype";

type AssistantMessage = {
  role: "员工" | "企业助手";
  text: string;
  intent?: string;
  status?: "success" | "fallback" | "blocked";
};

type ChatResponse = {
  conversation_id: number;
  intent: string;
  status: "success" | "fallback" | "blocked";
  answer: string;
  result: Record<string, unknown>;
};

type DailyReport = {
  id: number;
  report_date: string;
  content: string;
  structured_summary: {
    progress?: string;
    next_action?: string;
  };
  risks: string[];
  status: string;
};

type DailySummary = {
  report_count: number;
  progress_text: string;
  risks_text: string;
  status: string;
};

type OrgUnit = {
  id: number;
  unit_name: string;
  unit_type: string;
  contact_info: string;
};

type Nl2SqlResult = {
  id: number;
  status: "success" | "blocked";
  sql_template: string;
  result: Record<string, unknown>;
};

const initialMessages: AssistantMessage[] = [
  {
    role: "企业助手",
    text: "我可以调用真实 API 完成客户录入、客户查询、状态更新、日报、组织架构、新人指南和受控 NL2SQL。",
    intent: "能力说明",
    status: "success",
  },
];

export default function EnterpriseAssistantPage({ onNavigate }: PageProps) {
  const [input, setInput] = useState(enterpriseQuickCommands[0]);
  const [messages, setMessages] = useState(initialMessages);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [nl2sqlResult, setNl2sqlResult] = useState<Nl2SqlResult | null>(null);
  const [dailyContent, setDailyContent] = useState("今天跟进 8 个客户，2 个高潜进入活动邀约，风险是德国项目材料不齐，明天补齐材料清单。");
  const [message, setMessage] = useState("企业助手真实 API 待调用");
  const [dailyMessage, setDailyMessage] = useState("正在加载日报和组织架构...");

  async function handleSend(command = input) {
    const normalized = command.trim();
    if (!normalized) {
      return;
    }
    setMessages((items) => [...items, { role: "员工", text: normalized }]);
    setMessage("正在调用企业助手真实 API...");
    try {
      const data = await apiRequest<ChatResponse>("/api/enterprise-assistant/chat", {
        method: "POST",
        body: JSON.stringify({ message: normalized, actor_username: "admin" }),
      });
      setMessages((items) => [
        ...items,
        {
          role: "企业助手",
          text: data.answer,
          intent: data.intent,
          status: data.status,
        },
      ]);
      setMessage(data.status === "fallback" ? "已使用企业指南 fallback" : "企业助手 API 调用成功");
      if (data.intent === "create_lead" || data.intent === "update_lead_status") {
        onNavigate("enterprise");
      }
    } catch (error) {
      setMessages((items) => [
        ...items,
        {
          role: "企业助手",
          text: error instanceof Error ? `调用失败：${error.message}` : "调用失败",
          intent: "error",
          status: "blocked",
        },
      ]);
      setMessage(error instanceof Error ? `企业助手调用失败：${error.message}` : "企业助手调用失败");
    }
  }

  async function submitDailyReport() {
    if (!dailyContent.trim()) {
      setDailyMessage("请先填写日报内容");
      return;
    }
    setDailyMessage("正在提交真实日报...");
    try {
      await apiRequest<DailyReport>("/api/enterprise-assistant/daily-reports", {
        method: "POST",
        body: JSON.stringify({ content: dailyContent, actor_username: "admin" }),
      });
      setDailyMessage("日报已提交，并写入审计日志");
      await loadDailyData();
    } catch (error) {
      setDailyMessage(error instanceof Error ? `日报提交失败：${error.message}` : "日报提交失败");
    }
  }

  async function loadDailyData() {
    try {
      const [reports, summary] = await Promise.all([
        apiRequest<DailyReport[]>("/api/enterprise-assistant/daily-reports"),
        apiRequest<DailySummary>("/api/enterprise-assistant/daily-reports/summary"),
      ]);
      setDailyReports(reports);
      setDailySummary(summary);
      setDailyMessage(reports.length ? "真实日报数据已加载" : "暂无日报，可提交右侧内容");
    } catch (error) {
      setDailyReports([]);
      setDailySummary(null);
      setDailyMessage(error instanceof Error ? `日报加载失败：${error.message}` : "日报加载失败");
    }
  }

  async function loadOrgUnits() {
    try {
      setOrgUnits(await apiRequest<OrgUnit[]>("/api/enterprise-assistant/org-units"));
    } catch {
      setOrgUnits([]);
    }
  }

  async function runNl2Sql(question: string) {
    setMessage("正在执行白名单只读查询...");
    try {
      const data = await apiRequest<Nl2SqlResult>("/api/enterprise-assistant/nl2sql/query", {
        method: "POST",
        body: JSON.stringify({ question, actor_username: "admin" }),
      });
      setNl2sqlResult(data);
      setMessage(data.status === "blocked" ? "写 SQL 已阻断，仅允许白名单只读查询" : "白名单查询已返回");
    } catch (error) {
      setMessage(error instanceof Error ? `受控查询失败：${error.message}` : "受控查询失败");
    }
  }

  useEffect(() => {
    loadDailyData();
    loadOrgUnits();
  }, []);

  const latestReport = dailyReports[0];

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">企业助手</p>
          <h2>员工自然语言录入、日报、组织架构和受控查询</h2>
          <p>企业助手已接入真实 API；写操作经过 service 层，NL2SQL 只走白名单只读模板。</p>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={() => { loadDailyData(); loadOrgUnits(); }}>
            <RefreshCw size={16} aria-hidden="true" />
            刷新数据
          </button>
          <button className="icon-button secondary" onClick={() => onNavigate("crm")}>查看 CRM 结果</button>
          <button className="icon-button" onClick={() => onNavigate("reports")}>日报汇总报告</button>
        </div>
      </section>

      <section className="toolbar">
        <span className={message.includes("失败") || message.includes("阻断") ? "status-pill warning" : "status-pill success"}>{message}</span>
        <span className="status-pill success">真实 API + service 校验</span>
      </section>

      <section className="assistant-layout">
        <div className="panel-block chat-panel">
          <div className="section-title">
            <h3>对话区</h3>
            <span className="status-pill">真实 API</span>
          </div>
          <div className="quick-command-grid">
            {enterpriseQuickCommands.map((item) => (
              <button key={item} onClick={() => handleSend(item)}>
                {item}
              </button>
            ))}
          </div>
          <div className="message-list">
            {messages.map((item, index) => (
              <article className={item.role === "员工" ? "message user" : "message"} key={`${item.role}-${index}`}>
                <div>
                  <strong>{item.role}</strong>
                  {item.intent && <span className={`status-pill ${item.status ?? ""}`}>{item.intent}</span>}
                </div>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
          <div className="composer">
            <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={3} />
            <button className="icon-button" onClick={() => handleSend()}>
              <Send size={16} aria-hidden="true" />
              发送
            </button>
          </div>
        </div>

        <aside className="side-stack">
          <section className="panel-block">
            <div className="section-title">
              <h3>结构化日报</h3>
              <Bot size={18} aria-hidden="true" />
            </div>
            <span className="status-pill">{dailyMessage}</span>
            <label className="stacked-input">
              <span>日报内容</span>
              <textarea value={dailyContent} onChange={(event) => setDailyContent(event.target.value)} rows={3} />
            </label>
            <button className="tiny-button" onClick={submitDailyReport}>提交日报</button>
            {latestReport ? (
              <dl className="detail-list">
                <div>
                  <dt>核心进展</dt>
                  <dd>{latestReport.structured_summary.progress || "暂无"}</dd>
                </div>
                <div>
                  <dt>风险</dt>
                  <dd>{latestReport.risks.join("；") || "暂无风险"}</dd>
                </div>
                <div>
                  <dt>下一步</dt>
                  <dd>{latestReport.structured_summary.next_action || "暂无"}</dd>
                </div>
              </dl>
            ) : (
              <div className="empty-state">暂无日报。</div>
            )}
          </section>

          <section className="panel-block">
            <div className="section-title">
              <h3>组织架构 / 新人指南</h3>
              <Building2 size={18} aria-hidden="true" />
            </div>
            {orgUnits.length ? (
              <div className="source-list">
                {orgUnits.map((item) => (
                  <article key={item.id}>
                    <strong>{item.unit_name}</strong>
                    <span>{item.unit_type}</span>
                    <em>{item.contact_info}</em>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">暂无组织架构数据。</div>
            )}
          </section>

          <section className="panel-block">
            <div className="section-title">
              <h3>受控 NL2SQL</h3>
              <Database size={18} aria-hidden="true" />
            </div>
            <div className="inline-actions">
              <button className="tiny-button" onClick={() => runNl2Sql("查询本周高潜线索数量")}>高潜线索</button>
              <button className="tiny-button" onClick={() => runNl2Sql("删除所有客户")}>测试阻断</button>
            </div>
            {nl2sqlResult ? (
              <pre>{JSON.stringify(nl2sqlResult, null, 2)}</pre>
            ) : (
              <p className="muted">白名单只读：leads、events。写 SQL 会被阻断。</p>
            )}
            <div className="risk-box">
              <ShieldAlert size={18} aria-hidden="true" />
              <span>禁止任意写 SQL；查询只能通过白名单模板返回统计。</span>
            </div>
          </section>
        </aside>
      </section>

      <section className="panel-block">
        <div className="section-title">
          <h3>日报汇总</h3>
          <span>{dailySummary?.report_count ?? 0} 条日报</span>
        </div>
        {dailySummary ? (
          <div className="count-grid">
            <div>
              <span>汇总状态</span>
              <strong>{dailySummary.status}</strong>
            </div>
            <div>
              <span>近期进展</span>
              <strong>{dailySummary.progress_text ? "已汇总" : "暂无"}</strong>
            </div>
            <div>
              <span>风险</span>
              <strong>{dailySummary.risks_text ? "有记录" : "暂无"}</strong>
            </div>
            <div>
              <span>来源</span>
              <strong>真实 API</strong>
            </div>
          </div>
        ) : (
          <div className="empty-state">暂无日报汇总。</div>
        )}
      </section>
    </div>
  );
}
