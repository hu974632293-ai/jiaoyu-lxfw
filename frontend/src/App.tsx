import { useState } from "react";
import { apiRequest } from "./api/client";
import BackofficeShellPage from "./pages/BackofficeShellPage";
import LoginPage from "./pages/LoginPage";
import PublicPortalPage from "./pages/PublicPortalPage";
import type { RoleKey } from "./data/prototype";
import { roleDefaultPage } from "./navigation";
import type { AppMode, BackofficePageKey, PublicPageKey } from "./navigation";

export type PageProps = {
  role: RoleKey;
  onNavigate: (page: BackofficePageKey, leadId?: number) => void;
  onSeedDemo: () => Promise<void>;
  seedStatus: string;
};

export default function App() {
  const [mode, setMode] = useState<AppMode>("public");
  const [publicPage, setPublicPage] = useState<PublicPageKey>("home");
  const [backofficePage, setBackofficePage] = useState<BackofficePageKey>("growthOverview");
  const [role, setRole] = useState<RoleKey>("admin");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(1);
  const [seedStatus, setSeedStatus] = useState("演示数据未初始化");

  function openLogin() {
    setMode("login");
  }

  function enterBackoffice(nextRole: RoleKey) {
    setRole(nextRole);
    setBackofficePage(roleDefaultPage[nextRole]);
    setMode("backoffice");
  }

  function logoutToPortal() {
    setMode("public");
    setPublicPage("home");
  }

  function navigateBackoffice(page: BackofficePageKey, leadId?: number) {
    if (typeof leadId === "number") {
      setSelectedLeadId(leadId);
    }
    setBackofficePage(page);
  }

  async function seedDemo() {
    setSeedStatus("正在初始化演示数据...");
    try {
      await apiRequest("/api/demo/seed", { method: "POST" });
      setSeedStatus("演示数据初始化成功");
    } catch (error) {
      setSeedStatus(error instanceof Error ? error.message : "演示数据初始化失败");
    }
  }

  if (mode === "public") {
    return <PublicPortalPage activePage={publicPage} onNavigate={setPublicPage} onLogin={openLogin} />;
  }

  if (mode === "login") {
    return <LoginPage onLogin={enterBackoffice} onBackToPortal={logoutToPortal} />;
  }

  return (
    <BackofficeShellPage
      role={role}
      activePage={backofficePage}
      selectedLeadId={selectedLeadId}
      onNavigate={navigateBackoffice}
      onRoleChange={enterBackoffice}
      onLogout={logoutToPortal}
      onSeedDemo={seedDemo}
      seedStatus={seedStatus}
    />
  );
}
