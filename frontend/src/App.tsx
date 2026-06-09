import { useState } from "react";
import AssessmentPage from "./pages/AssessmentPage";
import ChatPage from "./pages/ChatPage";
import DashboardPage from "./pages/DashboardPage";
import EventsPage from "./pages/EventsPage";
import LeadsPage from "./pages/LeadsPage";
import ReportsPage from "./pages/ReportsPage";

const pages = [
  { key: "dashboard", label: "总览", component: <DashboardPage /> },
  { key: "assessment", label: "画像研判", component: <AssessmentPage /> },
  { key: "chat", label: "知识咨询", component: <ChatPage /> },
  { key: "leads", label: "CRM", component: <LeadsPage /> },
  { key: "events", label: "活动", component: <EventsPage /> },
  { key: "reports", label: "报告", component: <ReportsPage /> },
];

export default function App() {
  const [active, setActive] = useState("dashboard");
  const current = pages.find((page) => page.key === active) ?? pages[0];

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>教育服务客户增长闭环 Demo</h1>
          <p>稳定底座优先：规则引擎 + Dify + CRM + 报告。</p>
        </div>
        <a className="api-link" href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer">
          OpenAPI
        </a>
      </header>
      <nav className="tabs">
        {pages.map((page) => (
          <button className={active === page.key ? "active" : ""} key={page.key} onClick={() => setActive(page.key)}>
            {page.label}
          </button>
        ))}
      </nav>
      {current.component}
    </main>
  );
}
