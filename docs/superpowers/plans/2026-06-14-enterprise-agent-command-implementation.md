# Enterprise Agent Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前简单聊天框版企业助手改造成已确认的 AI 指挥台页面，中心工作区最大，执行队列贴近 AI 结果，快捷入口降权为最右侧辅助入口。

**Architecture:** 本批次优先做前端专项，不改后端。`EmployeeAgentPanel` 负责企业助手页面状态、场景切换、对话流、结构化业务产物、执行队列和快捷入口；API 调用继续通过 `frontend/src/api/client.ts`，优先复用 `/api/knowledge/chat`、`/api/enterprise-assistant/chat`、`/api/enterprise-assistant/voice-drafts` 等既有契约。样式集中追加到 `frontend/src/styles.css` 的企业助手区域，避免影响其他后台页面。

**Tech Stack:** React + TypeScript + Vite + lucide-react；前端静态结构检查使用 Node 脚本；构建验证使用 `npm.cmd run build`。

---

## File Structure

- Modify: `frontend/src/pages/EmployeeAgentPanel.tsx`
  - 从单一聊天框改为企业助手 AI 指挥台。
  - 管理场景、消息、业务产物、执行步骤、快捷入口、当前上下文。
  - 所有请求继续走 `apiRequest`。
- Modify: `frontend/src/styles.css`
  - 替换现有 `.agent-chat-*` 简单聊天样式。
  - 新增 `.enterprise-agent-*` 指挥台布局样式。
- Modify: `frontend/tests/navigation_check.js`
  - 保留现有导航和映射检查。
  - 增加企业助手必须渲染指挥台结构的静态检查。
- Create: `frontend/tests/employee_agent_command_check.js`
  - 专项检查企业助手组件和样式是否包含关键结构、业务动作和禁用实现话术。
- Optional modify only if build requires it: `frontend/src/pages/BackofficeShellPage.tsx`
  - 当前已映射 `employeeAgent: EmployeeAgentPanel`，默认不改。

---

## Task 1: Add Failing Structure Checks

**Files:**
- Modify: `frontend/tests/navigation_check.js`
- Create: `frontend/tests/employee_agent_command_check.js`

- [ ] **Step 1: Extend navigation structure check**

Add these checks near the end of `frontend/tests/navigation_check.js`, before `console.log("navigation check OK");`:

```js
if (!contents["src/pages/BackofficeShellPage.tsx"].includes("employeeAgent: EmployeeAgentPanel")) {
  throw new Error("企业助手缺少后台页面映射");
}

if (!contents["src/navigation.ts"].includes('key: "employeeAgent"')) {
  throw new Error("企业助手缺少导航项");
}
```

- [ ] **Step 2: Create enterprise agent command check**

Create `frontend/tests/employee_agent_command_check.js`:

```js
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const componentPath = path.join(root, "src/pages/EmployeeAgentPanel.tsx");
const stylesPath = path.join(root, "src/styles.css");
const component = fs.readFileSync(componentPath, "utf8");
const styles = fs.readFileSync(stylesPath, "utf8");

const requiredComponentTokens = [
  "enterprise-agent-shell",
  "enterprise-agent-main",
  "enterprise-agent-conversation",
  "enterprise-agent-execution",
  "enterprise-agent-side",
  "日报草稿已生成",
  "执行队列",
  "快捷启动",
  "当前上下文",
  "提交日报",
];

for (const token of requiredComponentTokens) {
  if (!component.includes(token)) {
    throw new Error(`企业助手组件缺少结构或业务文案: ${token}`);
  }
}

const requiredStyleTokens = [
  ".enterprise-agent-shell",
  ".enterprise-agent-main",
  ".enterprise-agent-conversation",
  ".enterprise-agent-execution",
  ".enterprise-agent-side",
  "grid-template-columns: minmax(0, 1fr) 270px",
];

for (const token of requiredStyleTokens) {
  if (!styles.includes(token)) {
    throw new Error(`企业助手样式缺少布局规则: ${token}`);
  }
}

for (const forbidden of ["fallback", "真实 API", "原型数据", "seed", "OpenAPI", "后续 V2", "后续 V3"]) {
  if (component.includes(forbidden)) {
    throw new Error(`企业助手业务界面不应出现实现话术: ${forbidden}`);
  }
}

console.log("employee agent command check OK");
```

- [ ] **Step 3: Run checks and verify RED**

Run:

```bash
cd frontend
node tests/navigation_check.js
node tests/employee_agent_command_check.js
```

Expected:

- `navigation_check.js` should still pass if previous employeeAgent mapping remains intact.
- `employee_agent_command_check.js` should fail because `EmployeeAgentPanel.tsx` still uses `agent-chat-panel` and lacks `enterprise-agent-*` structure.

- [ ] **Step 4: Commit failing test**

```bash
git add frontend/tests/navigation_check.js frontend/tests/employee_agent_command_check.js
git commit -m "增加企业助手指挥台结构检查"
```

---

## Task 2: Replace EmployeeAgentPanel With Command Layout

**Files:**
- Modify: `frontend/src/pages/EmployeeAgentPanel.tsx`

- [ ] **Step 1: Replace imports and local types**

Replace the top of `EmployeeAgentPanel.tsx` with:

```tsx
import {
  Bot,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Search,
  SendHorizonal,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../api/client";

type AgentScene = "daily" | "org" | "customer" | "guide";

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

type ExecutionStep = {
  id: number;
  title: string;
  desc: string;
  status: "done" | "active" | "pending";
};

type ArtifactItem = {
  label: string;
  value: string;
};

type AgentArtifact = {
  title: string;
  notice: string;
  items: ArtifactItem[];
  primaryAction: string;
  secondaryAction: string;
};
```

- [ ] **Step 2: Add static scene, artifact, and execution data**

Add these constants below the types:

```tsx
const scenes: Array<{ key: AgentScene; label: string; icon: JSX.Element; desc: string }> = [
  { key: "daily", label: "生成日报", icon: <FileText size={16} aria-hidden="true" />, desc: "整理口述为草稿" },
  { key: "org", label: "查负责人", icon: <Building2 size={16} aria-hidden="true" />, desc: "按事项定位联系人" },
  { key: "customer", label: "查客户", icon: <Search size={16} aria-hidden="true" />, desc: "受控客户视图" },
  { key: "guide", label: "新人指南", icon: <ClipboardCheck size={16} aria-hidden="true" />, desc: "制度与流程" },
];

const initialExecutionSteps: ExecutionStep[] = [
  { id: 1, title: "识别意图", desc: "日报场景", status: "done" },
  { id: 2, title: "生成草稿", desc: "等待本人确认", status: "active" },
  { id: 3, title: "写入记录", desc: "提交后同步", status: "pending" },
  { id: 4, title: "跳转处理", desc: "可进入队列", status: "pending" },
];

const defaultArtifact: AgentArtifact = {
  title: "日报草稿已生成",
  notice: "需要本人确认后提交",
  items: [
    { label: "今日完成", value: "申请材料跟进；家长预算确认" },
    { label: "风险事项", value: "签证材料缺少资产证明" },
    { label: "明日计划", value: "补齐证明并同步顾问" },
  ],
  secondaryAction: "编辑内容",
  primaryAction: "提交日报",
};
```

- [ ] **Step 3: Replace component state and send function**

Inside `EmployeeAgentPanel`, use this state and `send` implementation:

```tsx
export default function EmployeeAgentPanel() {
  const [activeScene, setActiveScene] = useState<AgentScene>("daily");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "你可以直接说业务目标，例如“帮我整理今天日报”“查询学生服务投诉负责人”“客户阶段更新前需要确认什么”。",
    },
    {
      role: "user",
      text: "今天跟进了王同学申请材料，联系家长确认预算，发现签证材料还缺资产证明。帮我生成日报草稿。",
    },
  ]);
  const [artifact, setArtifact] = useState<AgentArtifact>(defaultArtifact);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>(initialExecutionSteps);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, artifact]);

  async function send() {
    const question = input.trim();
    if (!question || sending) return;

    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setExecutionSteps((steps) =>
      steps.map((step) => (step.id === 2 ? { ...step, status: "active" } : step)),
    );

    try {
      const data = await apiRequest<KnowledgeChatResult>("/api/knowledge/chat", {
        method: "POST",
        body: JSON.stringify({
          scene: "enterprise_guide",
          question,
        }),
      });
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "暂时无法完成回答，请稍后再试。" }]);
    } finally {
      setSending(false);
    }
  }
```

- [ ] **Step 4: Replace JSX with command layout**

Replace the current `return (...)` with:

```tsx
  return (
    <section className="enterprise-agent-shell" aria-label="企业助手 AI 指挥台">
      <header className="enterprise-agent-header">
        <div className="enterprise-agent-title">
          <span className="enterprise-agent-mark">
            <Bot size={24} aria-hidden="true" />
          </span>
          <div>
            <h2>企业助手</h2>
            <p>把员工问题转成可确认、可跳转、可追踪的业务动作</p>
          </div>
        </div>
        <div className="enterprise-agent-tabs" aria-label="企业助手场景">
          {scenes.map((scene) => (
            <button
              key={scene.key}
              className={activeScene === scene.key ? "active" : ""}
              type="button"
              onClick={() => setActiveScene(scene.key)}
            >
              {scene.label.replace("生成", "").replace("查", "")}
            </button>
          ))}
        </div>
      </header>

      <div className="enterprise-agent-main">
        <section className="enterprise-agent-conversation" aria-label="企业助手对话与业务产物">
          <div className="enterprise-agent-stream">
            {messages.map((msg, index) => (
              <div key={`${msg.role}-${index}`} className={`enterprise-agent-bubble ${msg.role}`}>
                {msg.text}
              </div>
            ))}

            <article className="enterprise-agent-artifact">
              <div className="enterprise-agent-artifact-head">
                <strong>{artifact.title}</strong>
                <span>{artifact.notice}</span>
              </div>
              <div className="enterprise-agent-artifact-grid">
                {artifact.items.map((item) => (
                  <div key={item.label} className="enterprise-agent-artifact-item">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
              <div className="enterprise-agent-actions">
                <button type="button" className="soft">{artifact.secondaryAction}</button>
                <button type="button">{artifact.primaryAction}</button>
              </div>
            </article>

            <div ref={bottomRef} />
          </div>

          <form
            className="enterprise-agent-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="输入问题，例如：把张三更新为已签约前需要确认什么？"
              disabled={sending}
            />
            <button type="submit" disabled={sending || !input.trim()}>
              <SendHorizonal size={16} aria-hidden="true" />
              发送
            </button>
          </form>
        </section>

        <aside className="enterprise-agent-execution" aria-label="执行队列和当前上下文">
          <div className="enterprise-agent-section-title">
            <h3>执行队列</h3>
            <span>贴近结果</span>
          </div>
          <div className="enterprise-agent-step-list">
            {executionSteps.map((step) => (
              <div key={step.id} className={`enterprise-agent-step ${step.status}`}>
                <span>{step.id}</span>
                <div>
                  <strong>{step.title}</strong>
                  <small>{step.desc}</small>
                </div>
              </div>
            ))}
          </div>

          <div className="enterprise-agent-context-card">
            <div className="enterprise-agent-section-title">
              <h3>当前上下文</h3>
              <span>本轮</span>
            </div>
            <div className="enterprise-agent-context-row">
              <UserRound size={16} aria-hidden="true" />
              <div>
                <strong>王同学</strong>
                <small>申请材料跟进中</small>
              </div>
            </div>
            <div className="enterprise-agent-context-row">
              <CheckCircle2 size={16} aria-hidden="true" />
              <div>
                <strong>签证材料</strong>
                <small>缺少资产证明</small>
              </div>
            </div>
          </div>
        </aside>

        <aside className="enterprise-agent-side" aria-label="快捷启动与最近结果">
          <div className="enterprise-agent-section-title">
            <h3>快捷启动</h3>
            <span>轻入口</span>
          </div>
          <div className="enterprise-agent-quick-list">
            {scenes.map((scene) => (
              <button
                key={scene.key}
                type="button"
                className={activeScene === scene.key ? "active" : ""}
                onClick={() => setActiveScene(scene.key)}
              >
                <span>{scene.icon}</span>
                <strong>{scene.label}</strong>
                <small>{scene.desc}</small>
              </button>
            ))}
          </div>

          <div className="enterprise-agent-feed">
            <div className="enterprise-agent-section-title">
              <h3>最近结果</h3>
              <span>团队可复盘</span>
            </div>
            <p><strong>生成日报草稿</strong><span>2 分钟前 / 张员工</span></p>
            <p><strong>查询投诉负责人</strong><span>8 分钟前 / 周老师</span></p>
            <p><strong>打开新人清单</strong><span>23 分钟前 / 李顾问</span></p>
          </div>
        </aside>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Run targeted structure check**

Run:

```bash
cd frontend
node tests/employee_agent_command_check.js
```

Expected: still fail because CSS classes are not implemented yet.

---

## Task 3: Add Enterprise Agent Command Styles

**Files:**
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Replace simple chat panel styles**

Locate the existing comment:

```css
/* 企业助手 Agent 面板 */
```

Keep the comment and replace the `.agent-chat-*` block with the new `.enterprise-agent-*` block below.

- [ ] **Step 2: Add command layout CSS**

```css
/* 企业助手 Agent 面板 */
.enterprise-agent-shell {
  min-height: 720px;
  display: grid;
  grid-template-rows: auto 1fr;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid rgba(23, 35, 31, 0.12);
  background:
    radial-gradient(circle at 20% 0%, rgba(36, 123, 100, 0.12), transparent 30%),
    linear-gradient(135deg, #fffdf8 0%, #f0f8f3 100%);
}

.enterprise-agent-header {
  min-height: 92px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px;
  border-bottom: 1px solid rgba(23, 35, 31, 0.12);
}

.enterprise-agent-title {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.enterprise-agent-mark {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  color: #fff8ec;
  background: linear-gradient(145deg, #0f3d35, #247b64);
  flex: 0 0 auto;
}

.enterprise-agent-title h2 {
  margin: 0;
  font-size: 24px;
  color: #17231f;
}

.enterprise-agent-title p {
  margin: 4px 0 0;
  color: #68766f;
  line-height: 1.5;
}

.enterprise-agent-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.enterprise-agent-tabs button {
  min-height: 34px;
  border: 1px solid rgba(23, 35, 31, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #68766f;
  padding: 0 12px;
}

.enterprise-agent-tabs button.active {
  border-color: transparent;
  background: #c9953d;
  color: #fffdf8;
  font-weight: 700;
}

.enterprise-agent-main {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 270px 292px;
  gap: 14px;
  padding: 18px 20px 20px;
}

.enterprise-agent-conversation,
.enterprise-agent-execution,
.enterprise-agent-side {
  min-width: 0;
  min-height: 0;
  border: 1px solid rgba(23, 35, 31, 0.1);
  border-radius: 22px;
  background: rgba(255, 253, 248, 0.82);
}

.enterprise-agent-conversation {
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 14px;
  padding: 18px;
}

.enterprise-agent-stream {
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 13px;
  overflow-y: auto;
  padding-right: 2px;
}

.enterprise-agent-bubble {
  max-width: 82%;
  border-radius: 18px;
  padding: 14px 16px;
  line-height: 1.62;
  font-size: 14px;
}

.enterprise-agent-bubble.assistant {
  background: #edf8f3;
  border: 1px solid rgba(36, 123, 100, 0.18);
  color: #17231f;
}

.enterprise-agent-bubble.user {
  justify-self: end;
  background: #0f3d35;
  color: #fff8ec;
  box-shadow: 0 16px 36px rgba(15, 61, 53, 0.22);
}

.enterprise-agent-artifact {
  width: min(800px, 94%);
  border: 1px solid rgba(15, 61, 53, 0.16);
  border-radius: 24px;
  background: #fffdf8;
  box-shadow: 0 18px 46px rgba(23, 35, 31, 0.08);
  padding: 16px;
  display: grid;
  gap: 13px;
}

.enterprise-agent-artifact-head,
.enterprise-agent-section-title {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.enterprise-agent-artifact-head strong,
.enterprise-agent-section-title h3 {
  margin: 0;
  color: #17231f;
}

.enterprise-agent-artifact-head span {
  color: #c85f4c;
  font-size: 12px;
  font-weight: 700;
}

.enterprise-agent-section-title span {
  color: #68766f;
  font-size: 12px;
}

.enterprise-agent-artifact-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}

.enterprise-agent-artifact-item {
  min-height: 86px;
  border-radius: 17px;
  background: #f6f1e7;
  padding: 12px;
}

.enterprise-agent-artifact-item span {
  display: block;
  color: #68766f;
  font-size: 12px;
  margin-bottom: 7px;
}

.enterprise-agent-artifact-item strong {
  color: #17231f;
  line-height: 1.45;
}

.enterprise-agent-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.enterprise-agent-actions button,
.enterprise-agent-composer button {
  border: 0;
  border-radius: 14px;
  background: #0f3d35;
  color: #fff8ec;
  font-weight: 700;
  padding: 11px 14px;
}

.enterprise-agent-actions button.soft {
  background: #dff4ec;
  color: #0f3d35;
}

.enterprise-agent-composer {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  border-top: 1px solid rgba(23, 35, 31, 0.12);
  padding-top: 13px;
}

.enterprise-agent-composer input {
  min-width: 0;
  height: 50px;
  border: 1px solid rgba(23, 35, 31, 0.12);
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.88);
  padding: 0 15px;
  font-size: 14px;
  color: #17231f;
}

.enterprise-agent-composer button {
  min-width: 92px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.enterprise-agent-composer button:disabled {
  opacity: 0.52;
  cursor: not-allowed;
}

.enterprise-agent-execution,
.enterprise-agent-side {
  padding: 14px;
  display: grid;
  align-content: start;
  gap: 13px;
}

.enterprise-agent-step-list,
.enterprise-agent-quick-list,
.enterprise-agent-feed {
  display: grid;
  gap: 10px;
}

.enterprise-agent-step,
.enterprise-agent-context-row {
  border: 1px solid rgba(15, 61, 53, 0.1);
  border-radius: 17px;
  background: #fffdf8;
  padding: 10px;
  display: grid;
  grid-template-columns: 30px 1fr;
  gap: 9px;
  align-items: center;
}

.enterprise-agent-step.active {
  background: #102f29;
  color: #fff8ec;
}

.enterprise-agent-step > span {
  width: 30px;
  height: 30px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: #dff4ec;
  color: #0f3d35;
  font-weight: 700;
}

.enterprise-agent-step.active > span {
  background: rgba(255, 248, 236, 0.14);
  color: #fff8ec;
}

.enterprise-agent-step strong,
.enterprise-agent-context-row strong {
  display: block;
  font-size: 14px;
}

.enterprise-agent-step small,
.enterprise-agent-context-row small {
  color: #68766f;
}

.enterprise-agent-step.active small {
  color: rgba(255, 248, 236, 0.72);
}

.enterprise-agent-context-card {
  border: 1px solid rgba(15, 61, 53, 0.1);
  border-radius: 18px;
  background: #fffdf8;
  padding: 12px;
  display: grid;
  gap: 10px;
}

.enterprise-agent-context-row svg {
  width: 30px;
  height: 30px;
  border-radius: 11px;
  padding: 7px;
  background: #dff4ec;
  color: #0f3d35;
}

.enterprise-agent-quick-list button {
  border: 1px solid rgba(15, 61, 53, 0.1);
  border-radius: 16px;
  background: rgba(255, 253, 248, 0.86);
  padding: 10px 11px;
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: 9px;
  text-align: left;
}

.enterprise-agent-quick-list button.active {
  background: #0f3d35;
  color: #fff8ec;
}

.enterprise-agent-quick-list button > span {
  width: 32px;
  height: 32px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: #dff4ec;
  color: #0f3d35;
  grid-row: span 2;
}

.enterprise-agent-quick-list button.active > span {
  background: rgba(255, 248, 236, 0.14);
  color: #fff8ec;
}

.enterprise-agent-quick-list small {
  color: #68766f;
}

.enterprise-agent-quick-list button.active small {
  color: rgba(255, 248, 236, 0.7);
}

.enterprise-agent-feed p {
  margin: 0;
  border-left: 3px solid #c9953d;
  padding-left: 11px;
  display: grid;
  gap: 3px;
}

.enterprise-agent-feed span {
  color: #68766f;
  font-size: 12px;
}
```

- [ ] **Step 3: Add responsive fallback**

Append below the main CSS block:

```css
@media (max-width: 1180px) {
  .enterprise-agent-main {
    grid-template-columns: minmax(0, 1fr);
  }

  .enterprise-agent-side {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .enterprise-agent-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .enterprise-agent-artifact-grid {
    grid-template-columns: 1fr;
  }

  .enterprise-agent-composer {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run structure check and verify GREEN**

Run:

```bash
cd frontend
node tests/employee_agent_command_check.js
```

Expected:

```text
employee agent command check OK
```

- [ ] **Step 5: Commit component and styles**

```bash
git add frontend/src/pages/EmployeeAgentPanel.tsx frontend/src/styles.css frontend/tests/employee_agent_command_check.js
git commit -m "实现企业助手指挥台前端结构"
```

---

## Task 4: Verify Navigation, Permissions, and Build

**Files:**
- Modify only if needed: `frontend/tests/navigation_check.js`
- Read/verify: `frontend/tests/authRules.test.mjs`
- Read/verify: `frontend/package.json`

- [ ] **Step 1: Run navigation check**

Run:

```bash
cd frontend
node tests/navigation_check.js
```

Expected:

```text
navigation check OK
```

- [ ] **Step 2: Run auth rules test**

Run:

```bash
cd frontend
npm.cmd run test:auth
```

Expected:

```text
tests 8
pass 8
fail 0
```

- [ ] **Step 3: Run enterprise agent command check**

Run:

```bash
cd frontend
node tests/employee_agent_command_check.js
```

Expected:

```text
employee agent command check OK
```

- [ ] **Step 4: Run production build**

Run:

```bash
cd frontend
npm.cmd run build
```

Expected:

```text
✓ built
```

- [ ] **Step 5: Commit any verification-only test updates**

If Task 4 required edits to tests, commit only those files:

```bash
git add frontend/tests/navigation_check.js frontend/tests/authRules.test.mjs
git commit -m "补充企业助手验收检查"
```

If no files changed, do not create an empty commit.

---

## Task 5: Manual Browser Acceptance

**Files:**
- No code changes expected.

- [ ] **Step 1: Start or reuse the frontend dev server**

If the user already has a dev server running, do not kill it. Use the existing URL.

If no server is running, start one:

```bash
cd frontend
npm.cmd run dev
```

Expected: Vite prints a local URL such as `http://localhost:5173/`.

- [ ] **Step 2: Open employee agent page**

Open the app, log in with the employee account, and navigate to 企业助手.

Expected visible structure:

- 左侧后台窄导航显示当前 AI/企业助手入口。
- 中央区域显示 “企业助手” 标题和对话区。
- 日报草稿产物显示 “日报草稿已生成”。
- 执行队列贴近 AI 结果，当前步骤高亮。
- 最右侧快捷启动视觉权重低于中央产物。

- [ ] **Step 3: Check browser refresh behavior**

Refresh while on 企业助手.

Expected:

- 仍停留在企业助手页面。
- 不回退到总览页。
- 不出现无权限说明或禁用导航。

- [ ] **Step 4: Check business copy**

Inspect visible text.

Expected absent words:

```text
fallback
真实 API
原型数据
seed
OpenAPI
后续 V2
后续 V3
```

- [ ] **Step 5: Final commit if manual acceptance required minor copy/style fixes**

If manual checks require minor UI copy/style fixes:

```bash
git add frontend/src/pages/EmployeeAgentPanel.tsx frontend/src/styles.css
git commit -m "调整企业助手指挥台视觉细节"
```

If no code changed, do not create an empty commit.

---

## Self-Review

Spec coverage:

- 中央 AI 工作区最大：Task 2 JSX and Task 3 CSS implement `enterprise-agent-main` with `minmax(0, 1fr)` first column.
- 左侧窄导航：already provided by `BackofficeShellPage` shell; Task 4 verifies navigation remains intact.
- 执行队列贴近 AI 结果：Task 2 places `enterprise-agent-execution` inside `enterprise-agent-main`; Task 3 styles it as the middle column next to the conversation.
- 快捷入口降权：Task 2 places `enterprise-agent-side` as the far-right auxiliary column; Task 3 gives it lighter button styling.
- 业务闭环：Task 2 renders structured artifact, confirmation actions, execution steps, context, quick scenes, and recent results.
- 技术实现话术清理：Task 1 static check and Task 5 manual check cover forbidden words.
- 验证：Task 4 covers navigation, auth, enterprise-agent structure, and production build.

Placeholder scan:

- This plan contains no unresolved placeholders or unspecified test steps.

Type consistency:

- `AgentScene`, `ExecutionStep`, `AgentArtifact`, `KnowledgeChatResult`, and class names are defined before use.
- CSS class names in Task 3 match JSX class names in Task 2 and test tokens in Task 1.
