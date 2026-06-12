import { useEffect, useRef, useState } from "react";
import { apiRequest } from "./api/client";
import BackofficeShellPage from "./pages/BackofficeShellPage";
import LoginPage from "./pages/LoginPage";
import PublicPortalPage from "./pages/PublicPortalPage";
import type { RoleKey } from "./data/prototype";
import {
  canAccessAccountPage,
  getAccountDefaultPage,
  isLoginAccountKey,
  loginAccounts,
} from "./authRules";
import type { LoginAccountKey } from "./authRules";
import { isAppMode, isBackofficePageKey, isPublicPageKey, roleDefaultPage } from "./navigation";
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
  accountKey: LoginAccountKey | null;
  role: RoleKey;
  selectedLeadId: number | null;
  accessNotice: string;
};

const defaultViewState: PersistedViewState = {
  mode: "public",
  publicPage: "home",
  backofficePage: "roleOverview",
  accountKey: null,
  role: "admin",
  selectedLeadId: 1,
  accessNotice: "",
};

const accountStorageKey = "jiaoyu-login-account";

function parseLeadId(value: string | null) {
  if (!value) {
    return defaultViewState.selectedLeadId;
  }
  const nextValue = Number(value);
  return Number.isInteger(nextValue) && nextValue > 0 ? nextValue : defaultViewState.selectedLeadId;
}

function readStoredAccount() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(accountStorageKey);
  return isLoginAccountKey(value) ? value : null;
}

function readViewStateFromUrl(): PersistedViewState {
  if (typeof window === "undefined") {
    return defaultViewState;
  }

  const params = new URLSearchParams(window.location.search);
  const accountParam = params.get("account");
  const modeParam = params.get("mode");
  const publicParam = params.get("public");
  const pageParam = params.get("page");
  const accountKey = isLoginAccountKey(accountParam) ? accountParam : readStoredAccount();
  const role = accountKey ? loginAccounts[accountKey].role : defaultViewState.role;
  const inferredMode: AppMode = params.has("page") || params.has("account") || params.has("role") || params.has("leadId") ? "backoffice" : defaultViewState.mode;
  const mode = isAppMode(modeParam) ? modeParam : inferredMode;
  const publicPage = isPublicPageKey(publicParam) ? publicParam : defaultViewState.publicPage;
  const defaultBackofficePage = accountKey ? getAccountDefaultPage(accountKey) : roleDefaultPage[role];
  const parsedBackofficePage = isBackofficePageKey(pageParam) ? pageParam : defaultBackofficePage;
  const canEnterBackoffice = Boolean(accountKey);
  const canRestorePage = accountKey ? canAccessAccountPage(accountKey, parsedBackofficePage) : false;
  const backofficePage = canRestorePage ? parsedBackofficePage : defaultBackofficePage;
  const accessNotice =
    canEnterBackoffice && isBackofficePageKey(pageParam) && !canRestorePage
      ? "当前账号无权访问该后台模块，已返回允许进入的工作台。"
      : "";

  return {
    mode: mode === "backoffice" && !canEnterBackoffice ? "login" : mode,
    publicPage,
    backofficePage,
    accountKey,
    role,
    selectedLeadId: parseLeadId(params.get("leadId")),
    accessNotice,
  };
}

function buildUrlFromViewState(state: PersistedViewState) {
  const params = new URLSearchParams();
  params.set("mode", state.mode);

  if (state.mode === "public") {
    params.set("public", state.publicPage);
  }

  if (state.mode === "backoffice") {
    if (state.accountKey) {
      params.set("account", state.accountKey);
    }
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
  const [accountKey, setAccountKey] = useState<LoginAccountKey | null>(() => readViewStateFromUrl().accountKey);
  const [role, setRole] = useState<RoleKey>(() => readViewStateFromUrl().role);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(() => readViewStateFromUrl().selectedLeadId);
  const [accessNotice, setAccessNotice] = useState(() => readViewStateFromUrl().accessNotice);
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
      setAccountKey(nextState.accountKey);
      setRole(nextState.role);
      setSelectedLeadId(nextState.selectedLeadId);
      setAccessNotice(nextState.accessNotice);
    }

    window.addEventListener("popstate", applyUrlState);
    return () => window.removeEventListener("popstate", applyUrlState);
  }, []);

  useEffect(() => {
    const nextUrl = buildUrlFromViewState({ mode, publicPage, backofficePage, accountKey, role, selectedLeadId, accessNotice });
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
  }, [mode, publicPage, backofficePage, accountKey, role, selectedLeadId, accessNotice]);

  function openLogin() {
    setMode("login");
  }

  function enterBackoffice(nextAccountKey: LoginAccountKey) {
    const nextAccount = loginAccounts[nextAccountKey];
    window.localStorage.setItem(accountStorageKey, nextAccountKey);
    setAccountKey(nextAccountKey);
    setRole(nextAccount.role);
    setBackofficePage(getAccountDefaultPage(nextAccountKey));
    setAccessNotice("");
    setMode("backoffice");
  }

  function logoutToPortal() {
    window.localStorage.removeItem(accountStorageKey);
    setAccountKey(null);
    setMode("public");
    setPublicPage("home");
    setAccessNotice("");
  }

  function navigatePublic(page: PublicPageKey) {
    setPublicPage(page);
    setMode("public");
  }

  function navigateBackoffice(page: BackofficePageKey, leadId?: number) {
    if (!accountKey) {
      setMode("login");
      return;
    }

    if (typeof leadId === "number") {
      setSelectedLeadId(leadId);
    }

    if (!canAccessAccountPage(accountKey, page)) {
      setBackofficePage(getAccountDefaultPage(accountKey));
      setAccessNotice("当前账号无权访问该后台模块，已返回允许进入的工作台。");
    } else {
      setBackofficePage(page);
      setAccessNotice("");
    }
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

  if (!accountKey) {
    return <LoginPage onLogin={enterBackoffice} onBackToPortal={logoutToPortal} />;
  }

  const accountProfile = loginAccounts[accountKey];

  return (
    <BackofficeShellPage
      accountProfile={accountProfile}
      role={role}
      activePage={backofficePage}
      selectedLeadId={selectedLeadId}
      onNavigate={navigateBackoffice}
      onLogout={logoutToPortal}
      onSeedDemo={seedDemo}
      seedStatus={seedStatus}
      accessNotice={accessNotice}
    />
  );
}
