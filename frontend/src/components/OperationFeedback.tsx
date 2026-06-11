import type { ReactNode } from "react";

export type OperationPhase = "idle" | "pending" | "success" | "error" | "fallback";

export type OperationFeedbackState = {
  phase: OperationPhase;
  title: string;
  detail?: string;
  target?: string;
  timestamp?: string;
  targetId?: number;
};

type OperationFeedbackProps = {
  feedback: OperationFeedbackState;
  action?: ReactNode;
  compact?: boolean;
};

const phaseLabel: Record<OperationPhase, string> = {
  idle: "待操作",
  pending: "处理中",
  success: "成功",
  error: "失败",
  fallback: "兜底",
};

export function OperationFeedback({ feedback, action, compact = false }: OperationFeedbackProps) {
  const liveMode = feedback.phase === "error" ? "assertive" : "polite";

  return (
    <div className={`operation-feedback ${feedback.phase} ${compact ? "compact" : ""}`} aria-live={liveMode}>
      <div className="operation-feedback-main">
        <span className="operation-feedback-label">{phaseLabel[feedback.phase]}</span>
        <div>
          <strong>{feedback.title}</strong>
          {feedback.detail ? <p>{feedback.detail}</p> : null}
          {feedback.target || feedback.timestamp ? (
            <small>
              {feedback.target ? `对象：${feedback.target}` : ""}
              {feedback.target && feedback.timestamp ? " · " : ""}
              {feedback.timestamp ? `时间：${feedback.timestamp}` : ""}
            </small>
          ) : null}
        </div>
      </div>
      {action ? <div className="operation-feedback-action">{action}</div> : null}
    </div>
  );
}
