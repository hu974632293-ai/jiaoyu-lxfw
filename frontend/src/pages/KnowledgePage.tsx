import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { BookOpenCheck, DatabaseZap, RefreshCw, Send } from "lucide-react";
import { apiRequest } from "../api/client";
import { OperationFeedback, type OperationFeedbackState } from "../components/OperationFeedback";
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
type DifyHealth = {
  configured: boolean;
  missing: string[];
  api_base_configured: boolean;
  api_key_configured: boolean;
  app_scenes: string[];
  ready_message: string;
};
type KnowledgeOperation = "ask" | "source" | "sync" | null;

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

function formatOperationTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

export default function KnowledgePage({ onNavigate }: PageProps) {
  const [question, setQuestion] = useState(sceneOptions[0].sample);
  const [scene, setScene] = useState<SceneKey>("customer_service");
  const [result, setResult] = useState<ChatResult | null>(null);
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [difyHealth, setDifyHealth] = useState<DifyHealth | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [sourceForm, setSourceForm] = useState(defaultSourceForm);
  const [message, setMessage] = useState("等待提问");
  const [sourceMessage, setSourceMessage] = useState("正在加载知识来源...");
  const [operationFeedback, setOperationFeedback] = useState<OperationFeedbackState>({
    phase: "idle",
    title: "知识库待操作",
    detail: "可提问、创建知识来源或记录同步任务；异常状态会单独展示。",
  });
  const [pendingOperation, setPendingOperation] = useState<KnowledgeOperation>(null);
  const [highlightSourceId, setHighlightSourceId] = useState<number | null>(null);
  const [highlightSyncJobId, setHighlightSyncJobId] = useState<number | null>(null);

  const selectedSource = useMemo(
    () => sources.find((item) => item.id === selectedSourceId) ?? sources.find((item) => item.scene === scene) ?? sources[0],
    [sources, selectedSourceId, scene],
  );

  async function ask() {
    if (!question.trim()) {
      setMessage("请先填写问题");
      setOperationFeedback({
        phase: "error",
        title: "知识库未提问",
        detail: "请先填写问题。当前场景和输入内容已保留。",
        target: sceneOptions.find((item) => item.key === scene)?.label,
        timestamp: formatOperationTime(),
      });
      return;
    }
    setMessage("正在调用知识库...");
    setPendingOperation("ask");
    setOperationFeedback({
      phase: "pending",
      title: "正在调用知识库问答",
      detail: "正在请求 Dify 场景问答；暂不可用时会返回业务说明。",
      target: sceneOptions.find((item) => item.key === scene)?.label,
    });
    try {
      const data = await apiRequest<ChatResult>("/api/knowledge/chat", {
        method: "POST",
        body: JSON.stringify({ scene, question, lead_id: null, conversation_id: null }),
      });
      setResult(data);
      setMessage(data.status === "success" ? "知识库回答成功" : "知识库已返回业务说明");
      await loadLogs();
      setOperationFeedback({
        phase: data.status === "success" ? "success" : "fallback",
        title: data.status === "success" ? "知识库回答已返回" : "知识库已返回业务说明",
        detail: data.status === "success" ? "回答已显示在场景问答区域，并已记录问答日志。" : "已返回可用业务说明，并记录问答日志。",
        target: data.scene_label,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setMessage(error instanceof Error ? `知识库调用失败：${error.message}` : "知识库调用失败");
      setOperationFeedback({
        phase: "error",
        title: "知识库调用失败",
        detail: error instanceof Error ? `${error.message}。问题内容已保留，可重试。` : "接口不可用。问题内容已保留，可重试。",
        target: sceneOptions.find((item) => item.key === scene)?.label,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  function handleQuestionKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!hasPendingOperation) {
        void ask();
      }
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
      setSourceMessage("正在加载知识来源...");
    try {
      const data = await apiRequest<KnowledgeSource[]>(`/api/knowledge/sources?scene=${encodeURIComponent(nextScene)}`);
      setSources(data);
      setSelectedSourceId(data[0]?.id ?? null);
      setSourceMessage(data.length ? "知识来源已加载" : "当前场景暂无知识来源，可创建一条记录");
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

  async function loadDifyHealth() {
    try {
      setDifyHealth(await apiRequest<DifyHealth>("/api/knowledge/dify-health"));
    } catch {
      setDifyHealth({
        configured: false,
        missing: ["health_check"],
        api_base_configured: false,
        api_key_configured: false,
        app_scenes: [],
        ready_message: "Dify 配置健康暂时无法读取。",
      });
    }
  }

  async function createSource() {
    if (!sourceForm.source_name.trim()) {
      setSourceMessage("请先填写知识来源名称");
      setOperationFeedback({
        phase: "error",
        title: "知识来源未创建",
        detail: "请先填写知识来源名称。表单内容已保留。",
        target: sceneOptions.find((item) => item.key === scene)?.label,
        timestamp: formatOperationTime(),
      });
      return;
    }
    setSourceMessage("正在创建知识来源...");
    setPendingOperation("source");
    setOperationFeedback({
      phase: "pending",
      title: "正在创建知识来源",
      detail: `来源名称：${sourceForm.source_name.trim()}。`,
      target: sceneOptions.find((item) => item.key === scene)?.label,
    });
    try {
      const created = await apiRequest<KnowledgeSource>("/api/knowledge/sources", {
        method: "POST",
        body: JSON.stringify({ ...sourceForm, scene, operator_username: "admin" }),
      });
      setSelectedSourceId(created.id);
      setHighlightSourceId(created.id);
      setSourceMessage("知识来源已创建，并写入审计日志");
      await loadSources(scene);
      setOperationFeedback({
        phase: "success",
        title: "知识来源已创建",
        detail: "已写入审计日志，并在知识来源列表中选中高亮。",
        target: `${created.source_name} / #${created.id}`,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setSourceMessage(error instanceof Error ? `知识来源创建失败：${error.message}` : "知识来源创建失败");
      setOperationFeedback({
        phase: "error",
        title: "知识来源创建失败",
        detail: error instanceof Error ? `${error.message}。表单内容已保留，可重试。` : "接口不可用。表单内容已保留，可重试。",
        target: sourceForm.source_name.trim(),
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function createSyncJob() {
    if (!selectedSource) {
      setSourceMessage("请先选择或创建知识来源");
      setOperationFeedback({
        phase: "error",
        title: "同步任务未记录",
        detail: "请先选择或创建知识来源。",
        target: sceneOptions.find((item) => item.key === scene)?.label,
        timestamp: formatOperationTime(),
      });
      return;
    }
    setSourceMessage("正在记录知识同步任务...");
    setPendingOperation("sync");
    setOperationFeedback({
      phase: "pending",
      title: "正在记录知识同步任务",
      detail: "当前先记录同步任务，由管理员确认后执行同步。",
      target: selectedSource.source_name,
    });
    try {
      const created = await apiRequest<SyncJob>("/api/knowledge/sync-jobs", {
        method: "POST",
        body: JSON.stringify({ source_id: selectedSource.id, job_type: "manual_record", triggered_by: "admin" }),
      });
      setHighlightSyncJobId(created.id);
      setSourceMessage("同步任务已记录");
      await loadSyncJobs();
      setOperationFeedback({
        phase: "success",
        title: "同步任务已记录",
        detail: "任务已显示在同步任务列表。",
        target: `同步任务 #${created.id}`,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setSourceMessage(error instanceof Error ? `同步任务记录失败：${error.message}` : "同步任务记录失败");
      setOperationFeedback({
        phase: "error",
        title: "同步任务记录失败",
        detail: error instanceof Error ? `${error.message}。可稍后重试。` : "接口不可用。可稍后重试。",
        target: selectedSource.source_name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function retrySyncJob(item: SyncJob) {
    setPendingOperation("sync");
    setOperationFeedback({
      phase: "pending",
      title: "正在重试同步任务",
      detail: `同步任务 #${item.id} 将重新记录状态。`,
      target: `同步任务 #${item.id}`,
    });
    try {
      const updated = await apiRequest<SyncJob>(`/api/knowledge/sync-jobs/${item.id}/retry`, {
        method: "POST",
        body: JSON.stringify({ triggered_by: "admin" }),
      });
      setHighlightSyncJobId(updated.id);
      await loadSyncJobs();
      await loadDifyHealth();
      setOperationFeedback({
        phase: updated.status.includes("fallback") ? "fallback" : "success",
        title: "同步任务重试已记录",
        detail: updated.message,
        target: `同步任务 #${updated.id}`,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "同步任务重试失败",
        detail: error instanceof Error ? `${error.message}。可稍后重试。` : "同步任务暂时无法重试。",
        target: `同步任务 #${item.id}`,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
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
    loadDifyHealth();
  }, []);

  const hasPendingOperation = pendingOperation !== null;
  const isAsking = pendingOperation === "ask";
  const isCreatingSource = pendingOperation === "source";
  const isCreatingSync = pendingOperation === "sync";

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">知识库</p>
          <h2>Dify 问答、知识来源和同步任务</h2>
          <p>客服、企业新人指南、学生生活支持和留学政策统一由知识库问答承接。</p>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={() => { loadLogs(); loadSources(); loadSyncJobs(); }}>
            <RefreshCw size={16} aria-hidden="true" />
            刷新知识库
          </button>
          <button className="icon-button" onClick={() => onNavigate("customerGrowth")}>关联客户</button>
        </div>
      </section>

      <OperationFeedback feedback={operationFeedback} />

      <section className="knowledge-layout">
        <div className="panel-block chat-panel">
          <div className="section-title">
            <h3>场景问答</h3>
            <span className={message.includes("失败") ? "status-pill fallback" : "status-pill"}>{message}</span>
          </div>
          <div className="toolbar">
            <BookOpenCheck size={16} aria-hidden="true" />
            <select value={scene} onChange={(event) => changeScene(event.target.value as SceneKey)} aria-label="问答场景">
              {sceneOptions.map((item) => (
                <option value={item.key} key={item.key}>{item.label}</option>
              ))}
            </select>
          </div>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={handleQuestionKeyDown} rows={4} />
          <div className="inline-actions">
            <button className="icon-button" onClick={ask} disabled={hasPendingOperation}>
              <Send size={16} aria-hidden="true" />
              {isAsking ? "正在提问" : "提交知识库提问"}
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
                <span className={result.status === "success" ? "status-pill success" : "status-pill fallback"}>
                  {result.status === "success" ? "已回答" : "业务说明"}
                </span>
              </div>
              <p>{result.answer}</p>
              {result.fallback_reason && <p className="muted">已提供可用业务说明。</p>}
              <pre>{JSON.stringify({ scene: result.scene_label, conversation_id: result.conversation_id, citations: result.citations }, null, 2)}</pre>
            </article>
          ) : (
            <div className="empty-state">提问后这里展示回答、引用来源和会话编号。</div>
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
                  className={`${item.id === selectedSource?.id ? "selected-row" : ""} ${highlightSourceId === item.id ? "is-highlighted" : ""}`}
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
            <div className="dify-health-panel">
              <div>
                <strong>{difyHealth?.configured ? "Dify 配置已就绪" : "配置待完善"}</strong>
                <span>{difyHealth?.ready_message ?? "正在读取配置健康..."}</span>
              </div>
              <button className="tiny-button" onClick={loadDifyHealth}>刷新状态</button>
              <em>{difyHealth?.missing.length ? `缺失：${difyHealth.missing.join("、")}` : "可进入同步预留流程"}</em>
            </div>
            <div className="section-title">
              <h3>同步任务</h3>
              <button className="tiny-button" onClick={createSyncJob} disabled={hasPendingOperation}>
                <DatabaseZap size={14} aria-hidden="true" />
                {isCreatingSync ? "记录中" : "记录同步任务"}
              </button>
            </div>
            <div className="log-list">
              {syncJobs.slice(0, 4).map((item) => (
                <article className={highlightSyncJobId === item.id ? "is-highlighted" : ""} key={item.id}>
                  <strong>#{item.id} / {item.status}</strong>
                  <span>来源 #{item.source_id ?? "-"} / {item.job_type}</span>
                  <em>{item.message}</em>
                  <button className="tiny-button" onClick={() => retrySyncJob(item)} disabled={hasPendingOperation}>
                    重试同步
                  </button>
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
          <button className="icon-button" onClick={createSource} disabled={hasPendingOperation}>{isCreatingSource ? "正在创建来源" : "创建知识来源"}</button>
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
                  <em>{item.status === "success" ? "已回答" : "业务说明"}</em>
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
