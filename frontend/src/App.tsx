import { useEffect, useRef, useState } from "react";
import { apiRequest } from "./api/client";
import BackofficeShellPage from "./pages/BackofficeShellPage";
import LoginPage from "./pages/LoginPage";
import PublicPortalPage from "./pages/PublicPortalPage";
import { roleOptions } from "./data/prototype";
import type { RoleKey } from "./data/prototype";
import { isAppMode, isBackofficePageKey, isPublicPageKey, roleDefaultPage, roleVisiblePages } from "./navigation";
import type { AppMode, BackofficePageKey, PublicPageKey } from "./navigation";

export type PageProps = {
  role: RoleKey;
  onNavigate: (page: BackofficePageKey, leadId?: number) => void;
  onSeedDemo: () => Promise<void>;
  seedStatus: string;
};

type PersistedViewState = {
  mode: AppMode;
  publicPage: PublicPageKey;
  backofficePage: BackofficePageKey;
  role: RoleKey;
  selectedLeadId: number | null;
};

const defaultViewState: PersistedViewState = {
  mode: "public",
  publicPage: "home",
  backofficePage: "roleOverview",
  role: "admin",
  selectedLeadId: 1,
};

function isRoleKey(value: string | null): value is RoleKey {
  return Boolean(value && roleOptions.some((item) => item.key === value));
}

function parseLeadId(value: string | null) {
  if (!value) {
    return defaultViewState.selectedLeadId;
  }
  const nextValue = Number(value);
  return Number.isInteger(nextValue) && nextValue > 0 ? nextValue : defaultViewState.selectedLeadId;
}

function canRestoreBackofficePage(role: RoleKey, page: BackofficePageKey) {
  if (roleVisiblePages[role].includes(page)) {
    return true;
  }

  return role === "consultant" && ["growthOverview", "customerGrowth", "customer360"].includes(page);
}

function readViewStateFromUrl(): PersistedViewState {
  if (typeof window === "undefined") {
    return defaultViewState;
  }

  const params = new URLSearchParams(window.location.search);
  const roleParam = params.get("role");
  const modeParam = params.get("mode");
  const publicParam = params.get("public");
  const pageParam = params.get("page");
  const role = isRoleKey(roleParam) ? roleParam : defaultViewState.role;
  const inferredMode: AppMode = params.has("page") || params.has("role") || params.has("leadId") ? "backoffice" : defaultViewState.mode;
  const mode = isAppMode(modeParam) ? modeParam : inferredMode;
  const publicPage = isPublicPageKey(publicParam) ? publicParam : defaultViewState.publicPage;
  const parsedBackofficePage = isBackofficePageKey(pageParam) ? pageParam : roleDefaultPage[role];
  const backofficePage = canRestoreBackofficePage(role, parsedBackofficePage) ? parsedBackofficePage : roleDefaultPage[role];

  return {
    mode,
    publicPage,
    backofficePage,
    role,
    selectedLeadId: parseLeadId(params.get("leadId")),
  };
}

function buildUrlFromViewState(state: PersistedViewState) {
  const params = new URLSearchParams();
  params.set("mode", state.mode);

  if (state.mode === "public") {
    params.set("public", state.publicPage);
  }

  if (state.mode === "backoffice") {
    params.set("role", state.role);
    params.set("page", state.backofficePage);
    if (state.selectedLeadId) {
      params.set("leadId", String(state.selectedLeadId));
    }
  }

  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}`;
}

export default function App() {
  const [mode, setMode] = useState<AppMode>(() => readViewStateFromUrl().mode);
  const [publicPage, setPublicPage] = useState<PublicPageKey>(() => readViewStateFromUrl().publicPage);
  const [backofficePage, setBackofficePage] = useState<BackofficePageKey>(() => readViewStateFromUrl().backofficePage);
  const [role, setRole] = useState<RoleKey>(() => readViewStateFromUrl().role);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(() => readViewStateFromUrl().selectedLeadId);
  const [seedStatus, setSeedStatus] = useState("演示数据未初始化");
  const hasSyncedInitialUrl = useRef(false);
  const suppressNextUrlWrite = useRef(false);

  useEffect(() => {
    function applyUrlState() {
      const nextState = readViewStateFromUrl();
      suppressNextUrlWrite.current = true;
      window.setTimeout(() => {
        suppressNextUrlWrite.current = false;
      }, 0);
      setMode(nextState.mode);
      setPublicPage(nextState.publicPage);
      setBackofficePage(nextState.backofficePage);
      setRole(nextState.role);
      setSelectedLeadId(nextState.selectedLeadId);
    }

    window.addEventListener("popstate", applyUrlState);
    return () => window.removeEventListener("popstate", applyUrlState);
  }, []);

  useEffect(() => {
    const nextUrl = buildUrlFromViewState({ mode, publicPage, backofficePage, role, selectedLeadId });
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (suppressNextUrlWrite.current) {
      suppressNextUrlWrite.current = false;
      return;
    }

    if (!hasSyncedInitialUrl.current) {
      hasSyncedInitialUrl.current = true;
      if (nextUrl !== currentUrl) {
        window.history.replaceState(null, "", nextUrl);
      }
      return;
    }

    if (nextUrl !== currentUrl) {
      window.history.pushState(null, "", nextUrl);
    }
  }, [mode, publicPage, backofficePage, role, selectedLeadId]);

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

  function navigatePublic(page: PublicPageKey) {
    setPublicPage(page);
    setMode("public");
  }

  function navigateBackoffice(page: BackofficePageKey, leadId?: number) {
    if (typeof leadId === "number") {
      setSelectedLeadId(leadId);
    }
    setBackofficePage(page);
    setMode("backoffice");
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
    return <PublicPortalPage activePage={publicPage} onNavigate={navigatePublic} onLogin={openLogin} />;
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
