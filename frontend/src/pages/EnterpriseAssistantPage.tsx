import { useState } from "react";
import { Bot, Building2, Database, Send, ShieldAlert } from "lucide-react";
import type { PageProps } from "../App";
import { enterpriseQuickCommands } from "../data/prototype";

type AssistantMessage = {
  role: "员工" | "企业助手";
  text: string;
  intent?: string;
  status?: "success" | "fallback" | "blocked";
};

const initialMessages: AssistantMessage[] = [
  {
    role: "企业助手",
    text: "我可以演示客户录入、日报结构化、组织架构查询、新人指南和受控 NL2SQL。当前为前端 mock，不直接写库。",
    intent: "能力说明",
    status: "fallback",
  },
];

export default function EnterpriseAssistantPage({ onNavigate }: PageProps) {
  const [input, setInput] = useState(enterpriseQuickCommands[0]);
  const [messages, setMessages] = useState(initialMessages);
  const [dailyReport, setDailyReport] = useState({
    progress: "跟进 8 个客户，2 个高潜进入活动邀约。",
    risk: "德国项目材料不齐，需运营补充材料清单。",
    next: "明天完成高潜客户二次回访，并提交活动报名名单。",
  });
  const [nl2sqlStatus, setNl2sqlStatus] = useState("白名单只读：leads、events、reports");

  function handleSend(command = input) {
    const normalized = command.trim();
    if (!normalized) return;

    let reply: AssistantMessage;
    if (normalized.includes("录入") || normalized.includes("客户")) {
      reply = {
        role: "企业助手",
        text: "已识别为客户录入意图。原型中生成结构化客户：王晨 / 高三 / 新加坡本科 / 关注费用。真实写库将在企业助手 service 阶段接入。",
        intent: "create_lead",
        status: "success",
      };
    } else if (normalized.includes("日报")) {
      reply = {
        role: "企业助手",
        text: "已结构化日报：进展、风险、下一步计划已写入右侧日报区。当前不调用大模型直接写关键表。",
        intent: "daily_report",
        status: "success",
      };
      setDailyReport({
        progress: "跟进 8 个客户，2 个高潜进入活动邀约。",
        risk: "德国项目材料不齐，影响双元制转化。",
        next: "补齐材料清单，管理者查看日报汇总。",
      });
    } else if (normalized.toLowerCase().includes("sql") || normalized.includes("查询")) {
      reply = {
        role: "企业助手",
        text: "已识别为受控查询。只返回白名单统计，不执行任意 SQL：本周高潜线索 12 条，活动报名 44 人。",
        intent: "controlled_query",
        status: "blocked",
      };
      setNl2sqlStatus("已阻断写 SQL，仅返回白名单只读统计");
    } else {
      reply = {
        role: "企业助手",
        text: "Dify 未配置时使用新人指南 fallback：双元制事业部负责人为赵凯，新人入职先完成账号、制度学习和跟岗。",
        intent: "guide_qa",
        status: "fallback",
      };
    }

    setMessages((items) => [...items, { role: "员工", text: normalized }, reply]);
    setInput(normalized);
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">企业助手</p>
          <h2>员工自然语言录入、日报、组织架构和受控查询</h2>
          <p>当前是前端可点击原型：展示意图、执行状态、fallback 和 NL2SQL 安全边界。</p>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={() => onNavigate("crm")}>查看 CRM 结果</button>
          <button className="icon-button" onClick={() => onNavigate("reports")}>日报汇总报告</button>
        </div>
      </section>

      <section className="assistant-layout">
        <div className="panel-block chat-panel">
          <div className="section-title">
            <h3>对话区</h3>
            <span className="status-pill">前端 mock</span>
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
            <dl className="detail-list">
              <div>
                <dt>核心进展</dt>
                <dd>{dailyReport.progress}</dd>
              </div>
              <div>
                <dt>风险</dt>
                <dd>{dailyReport.risk}</dd>
              </div>
              <div>
                <dt>下一步</dt>
                <dd>{dailyReport.next}</dd>
              </div>
            </dl>
          </section>

          <section className="panel-block">
            <div className="section-title">
              <h3>组织架构 / 新人指南</h3>
              <Building2 size={18} aria-hidden="true" />
            </div>
            <div className="compact-card">
              <strong>双元制事业部</strong>
              <span>负责人：赵凯；联系方式：企业微信 / 8012</span>
            </div>
            <div className="compact-card">
              <strong>新人入职流程</strong>
              <span>账号开通、制度学习、跟岗 3 天、首周日报。</span>
            </div>
          </section>

          <section className="panel-block">
            <div className="section-title">
              <h3>受控 NL2SQL</h3>
              <Database size={18} aria-hidden="true" />
            </div>
            <p className="muted">{nl2sqlStatus}</p>
            <div className="risk-box">
              <ShieldAlert size={18} aria-hidden="true" />
              <span>禁止任意写 SQL；查询只能通过白名单模板返回统计。</span>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
