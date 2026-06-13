import { SendHorizonal, Bot } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { apiRequest } from "../api/client";

type Message = {
  role: "user" | "assistant";
  text: string;
};

type KnowledgeChatResult = {
  id: number;
  scene: string;
  answer: string;
  status: string;
};

export default function EmployeeAgentPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "你好！我是企业助手，可以帮你了解新人指南、组织架构、日报制度等。有什么想问的？",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const question = input.trim();
    if (!question || sending) return;
    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", text: question }]);

    try {
      const data = await apiRequest<KnowledgeChatResult>("/api/knowledge/chat", {
        method: "POST",
        body: JSON.stringify({
          scene: "enterprise_guide",
          question,
        }),
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.answer },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "抱歉，暂时无法回答，请稍后再试。" },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="agent-chat-panel">
      <div className="agent-chat-header">
        <Bot size={18} aria-hidden="true" />
        <span>企业助手</span>
        <small>新人指南 · 组织查询 · 日报草稿</small>
      </div>
      <div className="agent-chat-body">
        {messages.map((msg, i) => (
          <div key={i} className={`agent-chat-msg ${msg.role}`}>
            {msg.text}
          </div>
        ))}
        {sending && <div className="agent-chat-msg assistant">正在思考...</div>}
        <div ref={bottomRef} />
      </div>
      <form
        className="agent-chat-input"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入问题，例如：入职第一周需要完成什么？"
          disabled={sending}
        />
        <button type="submit" disabled={sending || !input.trim()}>
          <SendHorizonal size={16} />
        </button>
      </form>
    </div>
  );
}
