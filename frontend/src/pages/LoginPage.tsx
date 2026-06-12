import { ArrowLeft, LockKeyhole } from "lucide-react";
import { roleOptions } from "../data/prototype";
import type { RoleKey } from "../data/prototype";
import { backofficeNavItems, roleVisiblePages } from "../navigation";

type LoginPageProps = {
  onLogin: (role: RoleKey) => void;
  onBackToPortal: () => void;
};

const demoRoles = roleOptions.map((option) => {
  const entryPage = roleVisiblePages[option.key][0];
  const entry = backofficeNavItems.find((item) => item.key === entryPage);
  return {
    ...option,
    entryLabel: entry?.label ?? "业务后台",
    entryDesc: entry?.desc ?? option.focus,
    EntryIcon: entry?.icon ?? LockKeyhole,
  };
});

export default function LoginPage({ onLogin, onBackToPortal }: LoginPageProps) {
  return (
    <main className="login-shell">
      <section className="login-intro">
        <p className="eyebrow">登录入口</p>
        <h1>从公开官网进入对应业务后台</h1>
        <p>请选择身份进入对应业务后台。</p>
        <button className="ghost-button" onClick={onBackToPortal}>
          <ArrowLeft size={16} aria-hidden="true" />
          返回官网
        </button>
      </section>

      <section className="login-panel">
        <div className="section-title">
          <div>
            <p className="eyebrow">演示角色</p>
            <h2>选择入口</h2>
          </div>
          <LockKeyhole size={20} aria-hidden="true" />
        </div>
        <div className="role-login-grid">
          {demoRoles.map((item) => (
            <button className="role-login-card" onClick={() => onLogin(item.key)}>
              <item.EntryIcon size={18} aria-hidden="true" />
              <span>
                <strong>{item.label}</strong>
                <small>{item.entryLabel} · {item.entryDesc}</small>
              </span>
            </button>
          ))}
        </div>
        <p className="login-disclaimer">学生入口会使用更轻量的自助服务界面，内部人员入口使用高效业务后台界面。</p>
      </section>
    </main>
  );
}
