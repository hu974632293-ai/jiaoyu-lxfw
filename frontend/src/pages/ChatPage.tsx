import { useState } from "react";
import { apiRequest } from "../api/client";

type ChatResult = {
  id: number;
  answer: string;
  citations: Array<Record<string, unknown>>;
  conversation_id: string;
  status: string;
};

export default function ChatPage() {
  const [question, setQuestion] = useState("新加坡国际本硕升学计划适合什么学生？");
  const [result, setResult] = useState<ChatResult | null>(null);
  const [message, setMessage] = useState("");

  async function ask() {
    setMessage("正在调用 Dify...");
    try {
      const data = await apiRequest<ChatResult>("/api/knowledge/chat", {
        method: "POST",
        body: JSON.stringify({ question, lead_id: null, conversation_id: null }),
      });
      setResult(data);
      setMessage(data.status === "success" ? "调用成功" : `当前状态：${data.status}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "调用失败");
    }
  }

  return (
    <section className="panel">
      <h2>Dify 知识库咨询</h2>
      <textarea
        id="knowledge-question"
        name="knowledge-question"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        rows={3}
      />
      <div className="actions">
        <button onClick={ask}>提问</button>
      </div>
      <p className="status">{message}</p>
      {result && (
        <div className="answer">
          <strong>回答</strong>
          <p>{result.answer}</p>
          <strong>引用来源</strong>
          <pre>{JSON.stringify(result.citations, null, 2)}</pre>
        </div>
      )}
    </section>
  );
}
