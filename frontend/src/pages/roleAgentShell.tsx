import { Bot, ClipboardCheck, SendHorizonal } from "lucide-react";
import { useState, type KeyboardEvent, type ReactNode } from "react";

type RoleAgentShellProps = {
  title: string;
  subtitle: string;
  sceneLabel: string;
  sceneHint: string;
  sceneTags: Array<{ key: string; label: string }>;
  activeTag: string;
  onTagChange: (tag: string) => void;
  question: string;
  onQuestionChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  statusLabel: string;
  statusDetail: string;
  taskTitle: string;
  taskItems: Array<{ label: string; value: string }>;
  capabilities: Array<{ title: string; detail: string }>;
  resultTitle: string;
  resultBody: string;
  footerNote?: string;
  children?: ReactNode;
  onQuestionKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
};

export function RoleAgentShell({
  title,
  subtitle,
  sceneLabel,
  sceneHint,
  sceneTags,
  activeTag,
  onTagChange,
  question,
  onQuestionChange,
  onSend,
  sending,
  statusLabel,
  statusDetail,
  taskTitle,
  taskItems,
  capabilities,
  resultTitle,
  resultBody,
  footerNote,
  children,
  onQuestionKeyDown,
}: RoleAgentShellProps) {
  return (
    <section className="role-agent-shell enterprise-agent-shell">
      <header className="role-agent-header enterprise-agent-header">
        <div className="role-agent-title enterprise-agent-title">
          <span className="role-agent-mark enterprise-agent-mark">
            <Bot size={22} aria-hidden="true" />
          </span>
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>
        <div className="role-agent-scenes enterprise-agent-tabs" aria-label={`${title} 场景`}>
          {sceneTags.map((item) => (
            <button
              key={item.key}
              className={item.key === activeTag ? "active" : ""}
              type="button"
              onClick={() => onTagChange(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <div className="role-agent-main enterprise-agent-main">
        <section className="role-agent-conversation enterprise-agent-conversation" aria-label={`${title} 对话`}>
          <div className="role-agent-scene-line enterprise-agent-scene-line">
            <span>{sceneLabel}</span>
            <strong>{sceneLabel}</strong>
            <em>{sceneHint}</em>
          </div>
          <div className="role-agent-dialog enterprise-agent-dialog">{children}</div>
          <form
            className="role-agent-composer enterprise-agent-input"
            onSubmit={(event) => {
              event.preventDefault();
              onSend();
            }}
          >
            <textarea value={question} onChange={(event) => onQuestionChange(event.target.value)} onKeyDown={onQuestionKeyDown} rows={3} />
            <button type="submit" disabled={sending || !question.trim()} aria-label={`发送${title}`}>
              <SendHorizonal size={18} aria-hidden="true" />
            </button>
            <small>{footerNote ?? "Enter 发送，Shift+Enter 换行"}</small>
          </form>
        </section>

        <aside className="role-agent-task-card enterprise-agent-execution" aria-label={`${title} 当前任务`}>
          <div className="role-agent-task-head enterprise-panel-heading">
            <div>
              <h2>{taskTitle}</h2>
              <span>{statusLabel}</span>
            </div>
            <ClipboardCheck size={18} aria-hidden="true" />
          </div>
          <div className="role-agent-task-list enterprise-agent-task-card">
            {taskItems.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
          <div className="role-agent-capability-grid enterprise-agent-context" aria-label={`${title} 功能范围`}>
            <h3>功能范围</h3>
            {capabilities.map((item) => (
              <div key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </div>
            ))}
          </div>
          <article className="role-agent-result">
            <strong>{resultTitle}</strong>
            <p>{resultBody}</p>
            <small>{statusDetail}</small>
          </article>
        </aside>
      </div>
    </section>
  );
}
