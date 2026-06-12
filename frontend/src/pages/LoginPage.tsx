import { ArrowLeft, Building2, GraduationCap, KeyRound, LockKeyhole, ShieldCheck, User } from "lucide-react";
import { useState } from "react";
import { authenticateLogin, loginAccounts, loginShortcuts } from "../authRules";
import type { LoginAccountKey, LoginShortcutKey } from "../authRules";

type LoginPageProps = {
  onLogin: (accountKey: LoginAccountKey) => void;
  onBackToPortal: () => void;
};

const shortcutIcons: Record<LoginShortcutKey, typeof Building2> = {
  enterprise: Building2,
  student: GraduationCap,
  test: ShieldCheck,
};

export default function LoginPage({ onLogin, onBackToPortal }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function fillShortcut(shortcutKey: LoginShortcutKey) {
    const account = loginAccounts[loginShortcuts[shortcutKey].accountKey];
    setUsername(account.username);
    setPassword(account.password);
    setError("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const account = authenticateLogin(username, password);
    if (!account) {
      setError("账号或密码不正确，请检查后再登录。");
      return;
    }
    onLogin(account.key);
  }

  return (
    <main className="login-shell">
      <section className="login-intro">
        <p className="eyebrow">澜桥国际教育</p>
        <h1>教育服务业务系统</h1>
        <p>从公开官网进入业务后台，账号决定角色权限，企业人员和学生进入各自工作台。</p>
        <button className="ghost-button" onClick={onBackToPortal}>
          <ArrowLeft size={16} aria-hidden="true" />
          返回官网
        </button>
      </section>

      <section className="login-panel">
        <div className="section-title">
          <div>
            <p className="eyebrow">登录工作台</p>
            <h2>账号密码登录</h2>
          </div>
          <LockKeyhole size={20} aria-hidden="true" />
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-field">
            <User size={17} aria-hidden="true" />
            <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="账号" autoComplete="username" />
          </label>
          <label className="login-field">
            <KeyRound size={17} aria-hidden="true" />
            <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="密码" type="password" autoComplete="current-password" />
          </label>
          {error ? <p className="login-error">{error}</p> : null}
          <button className="login-submit" type="submit">进入系统</button>
        </form>

        <div className="login-shortcut-block">
          <div className="shortcut-divider">
            <span>快捷填充</span>
          </div>
          <div className="role-login-grid">
            {(Object.keys(loginShortcuts) as LoginShortcutKey[]).map((shortcutKey) => {
              const shortcut = loginShortcuts[shortcutKey];
              const ShortcutIcon = shortcutIcons[shortcutKey];
              return (
                <button className="role-login-card" type="button" key={shortcut.key} onClick={() => fillShortcut(shortcut.key)}>
                  <ShortcutIcon size={18} aria-hidden="true" />
                  <span>
                    <strong>{shortcut.label}</strong>
                    <small>{shortcut.desc}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="login-disclaimer">快捷入口只填入账号密码，进入后的权限仍由账号绑定角色决定。</p>
      </section>
    </main>
  );
}
