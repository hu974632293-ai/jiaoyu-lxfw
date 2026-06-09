import { useEffect, useState } from "react";
import { BookOpenCheck, RefreshCw, Send } from "lucide-react";
import { apiRequest } from "../api/client";
import type { PageProps } from "../App";

type ChatResult = {
  id: number;
  answer: string;
  citations: Array<Record<string, unknown>>;
  conversation_id: string;
  status: string;
};

type ChatLog = {
  id: number;
  question: string;
  status: string;
};

const sources = [
  { name: "公司信息", status: "已纳入 Dify", scene: "客服咨询" },
  { name: "公司业务", status: "fallback 可用", scene: "项目推荐" },
  { name: "留学政策", status: "fallback 可用", scene: "政策问答" },
  { name: "新人指南", status: "待同步", scene: "企业助手" },
  { name: "海外生活", status: "待同步", scene: "学生助手" },
];

export default function KnowledgePage({ onNavigate }: PageProps) {
  const [question, setQuestion] = useState("新加坡国际本硕升学计划适合什么学生？");
  const [scene, setScene] = useState("客服咨询");
  const [result, setResult] = useState<ChatResult | null>(null);
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [message, setMessage] = useState("等待提问");

  async function ask() {
    setMessage("正在调用知识库...");
    try {
      const data = await apiRequest<ChatResult>("/api/knowledge/chat", {
        method: "POST",
        body: JSON.stringify({ question, lead_id: null, conversation_id: null }),
      });
      setResult(data);
      setMessage(data.status === "success" ? "Dify 调用成功" : `当前状态：${data.status}，已展示 fallback`);
      await loadLogs();
    } catch (error) {
      setMessage(error instanceof Error ? `知识库调用失败：${error.message}` : "知识库调用失败");
    }
  }

  async function loadLogs() {
    try {
      setLogs(await apiRequest<ChatLog[]>("/api/knowledge/logs"));
    } catch {
      setLogs([]);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">知识库</p>
          <h2>Dify 问答、知识来源、日志和 fallback 状态</h2>
          <p>客服 Agent 先并入知识库/客户咨询页，不单独做独立前台。</p>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={loadLogs}>
            <RefreshCw size={16} aria-hidden="true" />
            刷新日志
          </button>
          <button className="icon-button" onClick={() => onNavigate("crm")}>关联客户</button>
        </div>
      </section>

      <section className="knowledge-layout">
        <div className="panel-block chat-panel">
          <div className="section-title">
            <h3>场景问答</h3>
            <span className="status-pill">{message}</span>
          </div>
          <div className="toolbar">
            <BookOpenCheck size={16} aria-hidden="true" />
            <select value={scene} onChange={(event) => setScene(event.target.value)} aria-label="问答场景">
              <option>客服咨询</option>
              <option>企业新人指南</option>
              <option>学生生活支持</option>
              <option>留学政策</option>
            </select>
          </div>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={4} />
          <div className="inline-actions">
            <button className="icon-button" onClick={ask}>
              <Send size={16} aria-hidden="true" />
              提问
            </button>
            <button className="ghost-button" onClick={() => setQuestion("海外学生遇到紧急医疗问题应该怎么求助？")}>生活支持样例</button>
          </div>
          {result ? (
            <article className="answer-card">
              <div className="section-title">
                <h3>回答</h3>
                <span className={result.status === "success" ? "status-pill success" : "status-pill fallback"}>{result.status}</span>
              </div>
              <p>{result.answer}</p>
              <pre>{JSON.stringify({ scene, conversation_id: result.conversation_id, citations: result.citations }, null, 2)}</pre>
            </article>
          ) : (
            <div className="empty-state">提问后这里展示回答、引用来源、conversation id 和 fallback 状态。</div>
          )}
        </div>

        <aside className="side-stack">
          <section className="panel-block">
            <div className="section-title">
              <h3>知识来源</h3>
              <span>{sources.length} 类</span>
            </div>
            <div className="source-list">
              {sources.map((item) => (
                <article key={item.name}>
                  <strong>{item.name}</strong>
                  <span>{item.scene}</span>
                  <em>{item.status}</em>
                </article>
              ))}
            </div>
          </section>

          <section className="panel-block">
            <div className="section-title">
              <h3>最近日志</h3>
              <span>真实 API</span>
            </div>
            {logs.length ? (
              <div className="log-list">
                {logs.map((item) => (
                  <article key={item.id}>
                    <strong>#{item.id}</strong>
                    <span>{item.question}</span>
                    <em>{item.status}</em>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">暂无日志或后端未启动。</div>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}
