import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, DatabaseZap, RefreshCw, Send } from "lucide-react";
import { apiRequest } from "../api/client";
import type { PageProps } from "../App";

type SceneKey = "customer_service" | "enterprise_guide" | "student_life" | "policy";

type ChatResult = {
  id: number;
  scene: string;
  scene_label: string;
  answer: string;
  citations: Array<Record<string, unknown>>;
  conversation_id: string;
  status: string;
  fallback_reason: string;
};

type ChatLog = {
  id: number;
  scene: string;
  scene_label: string;
  question: string;
  status: string;
  fallback_reason: string;
  created_at: string | null;
};

type KnowledgeSource = {
  id: number;
  source_name: string;
  source_type: string;
  business_domain: string;
  scene: string;
  scene_label: string;
  owner: string;
  description: string;
  status: string;
};

type SyncJob = {
  id: number;
  source_id: number | null;
  job_type: string;
  status: string;
  message: string;
  created_at: string | null;
};

const sceneOptions: Array<{ key: SceneKey; label: string; sample: string }> = [
  { key: "customer_service", label: "客服咨询", sample: "新加坡国际本硕升学计划适合什么学生？" },
  { key: "enterprise_guide", label: "企业新人指南", sample: "新人入职后应该先了解哪些业务流程？" },
  { key: "student_life", label: "学生生活支持", sample: "海外学生遇到紧急医疗问题应该怎么求助？" },
  { key: "policy", label: "留学政策", sample: "德国双元制项目通常需要哪些申请条件？" },
];

const defaultSourceForm = {
  source_name: "阶段八海外生活知识",
  source_type: "document",
  owner: "学生服务部",
  description: "用于学生生活支持场景的知识来源记录。",
  status: "启用",
};

export default function KnowledgePage({ onNavigate }: PageProps) {
  const [question, setQuestion] = useState(sceneOptions[0].sample);
  const [scene, setScene] = useState<SceneKey>("customer_service");
  const [result, setResult] = useState<ChatResult | null>(null);
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [sourceForm, setSourceForm] = useState(defaultSourceForm);
  const [message, setMessage] = useState("等待提问");
  const [sourceMessage, setSourceMessage] = useState("正在加载知识来源...");

  const selectedSource = useMemo(
    () => sources.find((item) => item.id === selectedSourceId) ?? sources.find((item) => item.scene === scene) ?? sources[0],
    [sources, selectedSourceId, scene],
  );

  async function ask() {
    if (!question.trim()) {
      setMessage("请先填写问题");
      return;
    }
    setMessage("正在调用知识库...");
    try {
      const data = await apiRequest<ChatResult>("/api/knowledge/chat", {
        method: "POST",
        body: JSON.stringify({ scene, question, lead_id: null, conversation_id: null }),
      });
      setResult(data);
      setMessage(data.status === "success" ? "Dify 调用成功" : `当前状态：${data.status}，已记录 fallback 状态`);
      await loadLogs();
    } catch (error) {
      setMessage(error instanceof Error ? `知识库调用失败：${error.message}` : "知识库调用失败");
    }
  }

  async function loadLogs(nextScene = scene) {
    try {
      setLogs(await apiRequest<ChatLog[]>(`/api/knowledge/logs?scene=${encodeURIComponent(nextScene)}`));
    } catch {
      setLogs([]);
    }
  }

  async function loadSources(nextScene = scene) {
    setSourceMessage("正在加载真实知识来源...");
    try {
      const data = await apiRequest<KnowledgeSource[]>(`/api/knowledge/sources?scene=${encodeURIComponent(nextScene)}`);
      setSources(data);
      setSelectedSourceId(data[0]?.id ?? null);
      setSourceMessage(data.length ? "真实知识来源已加载" : "当前场景暂无知识来源，可创建一条记录");
    } catch (error) {
      setSources([]);
      setSelectedSourceId(null);
      setSourceMessage(error instanceof Error ? `知识来源加载失败：${error.message}` : "知识来源加载失败");
    }
  }

  async function loadSyncJobs() {
    try {
      setSyncJobs(await apiRequest<SyncJob[]>("/api/knowledge/sync-jobs"));
    } catch {
      setSyncJobs([]);
    }
  }

  async function createSource() {
    if (!sourceForm.source_name.trim()) {
      setSourceMessage("请先填写知识来源名称");
      return;
    }
    setSourceMessage("正在创建知识来源...");
    try {
      const created = await apiRequest<KnowledgeSource>("/api/knowledge/sources", {
        method: "POST",
        body: JSON.stringify({ ...sourceForm, scene, operator_username: "admin" }),
      });
      setSelectedSourceId(created.id);
      setSourceMessage("知识来源已创建，并写入审计日志");
      await loadSources(scene);
    } catch (error) {
      setSourceMessage(error instanceof Error ? `知识来源创建失败：${error.message}` : "知识来源创建失败");
    }
  }

  async function createSyncJob() {
    if (!selectedSource) {
      setSourceMessage("请先选择或创建知识来源");
      return;
    }
    setSourceMessage("正在记录知识同步任务...");
    try {
      await apiRequest<SyncJob>("/api/knowledge/sync-jobs", {
        method: "POST",
        body: JSON.stringify({ source_id: selectedSource.id, job_type: "manual_record", triggered_by: "admin" }),
      });
      setSourceMessage("同步任务已记录；当前阶段不执行真实 Dify 上传");
      await loadSyncJobs();
    } catch (error) {
      setSourceMessage(error instanceof Error ? `同步任务记录失败：${error.message}` : "同步任务记录失败");
    }
  }

  function changeScene(nextScene: SceneKey) {
    setScene(nextScene);
    const nextOption = sceneOptions.find((item) => item.key === nextScene);
    if (nextOption) {
      setQuestion(nextOption.sample);
    }
    loadLogs(nextScene);
    loadSources(nextScene);
  }

  useEffect(() => {
    loadLogs();
    loadSources();
    loadSyncJobs();
  }, []);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">知识库</p>
          <h2>Dify 问答、知识来源、同步任务和 fallback 状态</h2>
          <p>客服、企业新人指南、学生生活支持和留学政策统一走知识库问答；未配置 Dify 时不阻断主业务。</p>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={() => { loadLogs(); loadSources(); loadSyncJobs(); }}>
            <RefreshCw size={16} aria-hidden="true" />
            刷新知识库
          </button>
          <button className="icon-button" onClick={() => onNavigate("customerGrowth")}>关联客户</button>
        </div>
      </section>

      <section className="knowledge-layout">
        <div className="panel-block chat-panel">
          <div className="section-title">
            <h3>场景问答</h3>
            <span className={message.includes("fallback") || message.includes("失败") ? "status-pill fallback" : "status-pill"}>{message}</span>
          </div>
          <div className="toolbar">
            <BookOpenCheck size={16} aria-hidden="true" />
            <select value={scene} onChange={(event) => changeScene(event.target.value as SceneKey)} aria-label="问答场景">
              {sceneOptions.map((item) => (
                <option value={item.key} key={item.key}>{item.label}</option>
              ))}
            </select>
          </div>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={4} />
          <div className="inline-actions">
            <button className="icon-button" onClick={ask}>
              <Send size={16} aria-hidden="true" />
              提问
            </button>
            {sceneOptions.map((item) => (
              <button className="ghost-button" key={item.key} onClick={() => changeScene(item.key)}>
                {item.label}
              </button>
            ))}
          </div>
          {result ? (
            <article className="answer-card">
              <div className="section-title">
                <h3>回答</h3>
                <span className={result.status === "success" ? "status-pill success" : "status-pill fallback"}>{result.status}</span>
              </div>
              <p>{result.answer}</p>
              {result.fallback_reason && <p className="muted">{result.fallback_reason}</p>}
              <pre>{JSON.stringify({ scene: result.scene_label, conversation_id: result.conversation_id, citations: result.citations }, null, 2)}</pre>
            </article>
          ) : (
            <div className="empty-state">提问后这里展示回答、引用来源、conversation id 和 fallback 状态。</div>
          )}
        </div>

        <aside className="side-stack">
          <section className="panel-block">
            <div className="section-title">
              <h3>知识来源</h3>
              <span className="status-pill">{sourceMessage}</span>
            </div>
            <div className="source-list">
              {sources.map((item) => (
                <article
                  key={item.id}
                  className={item.id === selectedSource?.id ? "selected-row" : ""}
                  onClick={() => setSelectedSourceId(item.id)}
                >
                  <strong>{item.source_name}</strong>
                  <span>{item.scene_label} / {item.owner || "未分配"}</span>
                  <em>{item.status}</em>
                </article>
              ))}
              {!sources.length && <div className="empty-state">当前场景暂无知识来源。</div>}
            </div>
          </section>

          <section className="panel-block">
            <div className="section-title">
              <h3>同步任务</h3>
              <button className="tiny-button" onClick={createSyncJob}>
                <DatabaseZap size={14} aria-hidden="true" />
                记录同步
              </button>
            </div>
            <div className="log-list">
              {syncJobs.slice(0, 4).map((item) => (
                <article key={item.id}>
                  <strong>#{item.id} / {item.status}</strong>
                  <span>来源 #{item.source_id ?? "-"} / {item.job_type}</span>
                  <em>{item.message}</em>
                </article>
              ))}
              {!syncJobs.length && <div className="empty-state">暂无同步任务记录。</div>}
            </div>
          </section>
        </aside>
      </section>

      <section className="split-layout secondary">
        <div className="panel-block">
          <div className="section-title">
            <h3>新增知识来源</h3>
            <span className="status-pill success">{sceneOptions.find((item) => item.key === scene)?.label}</span>
          </div>
          <label className="stacked-input">
            <span>来源名称</span>
            <input value={sourceForm.source_name} onChange={(event) => setSourceForm({ ...sourceForm, source_name: event.target.value })} />
          </label>
          <label className="stacked-input">
            <span>类型 / 状态</span>
            <input
              value={`${sourceForm.source_type} / ${sourceForm.status}`}
              onChange={(event) => {
                const [sourceType = "document", status = "待同步"] = event.target.value.split("/");
                setSourceForm({ ...sourceForm, source_type: sourceType.trim(), status: status.trim() });
              }}
            />
          </label>
          <label className="stacked-input">
            <span>负责人</span>
            <input value={sourceForm.owner} onChange={(event) => setSourceForm({ ...sourceForm, owner: event.target.value })} />
          </label>
          <label className="stacked-input">
            <span>说明</span>
            <textarea value={sourceForm.description} onChange={(event) => setSourceForm({ ...sourceForm, description: event.target.value })} rows={2} />
          </label>
          <button className="icon-button" onClick={createSource}>创建来源</button>
        </div>

        <div className="panel-block">
          <div className="section-title">
            <h3>最近问答日志</h3>
            <span>{logs.length} 条</span>
          </div>
          {logs.length ? (
            <div className="log-list">
              {logs.map((item) => (
                <article key={item.id}>
                  <strong>#{item.id} / {item.scene_label}</strong>
                  <span>{item.question}</span>
                  <em>{item.status}{item.fallback_reason ? ` / ${item.fallback_reason}` : ""}</em>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">当前场景暂无日志。</div>
          )}
        </div>
      </section>
    </div>
  );
}
