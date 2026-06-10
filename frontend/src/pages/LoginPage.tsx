import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import type { RoleKey } from "../data/prototype";

type LoginPageProps = {
  onLogin: (role: RoleKey) => void;
  onBackToPortal: () => void;
};

const demoRoles: Array<{ role: RoleKey; title: string; desc: string }> = [
  { role: "admin", title: "管理员", desc: "系统管理、权限、审计和演示控制" },
  { role: "manager", title: "管理者", desc: "经营管理后台、报告中心和风险视图" },
  { role: "consultant", title: "顾问", desc: "客户增长、客户 360 和跟进任务" },
  { role: "employee", title: "员工", desc: "员工工作台、日报和组织信息" },
  { role: "teacher", title: "老师", desc: "学生服务工作台" },
  { role: "student", title: "学生", desc: "学生服务自助入口" },
];

export default function LoginPage({ onLogin, onBackToPortal }: LoginPageProps) {
  return (
    <main className="login-shell">
      <section className="login-intro">
        <p className="eyebrow">登录入口</p>
        <h1>从公开官网进入角色后台</h1>
        <p>当前为演示登录，真实认证后续接入。</p>
        <button className="ghost-button" onClick={onBackToPortal}>
          <ArrowLeft size={16} aria-hidden="true" />
          返回官网
        </button>
      </section>

      <section className="login-panel">
        <div className="section-title">
          <div>
            <p className="eyebrow">演示角色</p>
            <h2>选择进入后台</h2>
          </div>
          <LockKeyhole size={20} aria-hidden="true" />
        </div>
        <div className="role-login-grid">
          {demoRoles.map((item) => (
            <button className="role-login-card" key={item.role} onClick={() => onLogin(item.role)}>
              <ShieldCheck size={18} aria-hidden="true" />
              <span>
                <strong>{item.title}</strong>
                <small>{item.desc}</small>
              </span>
            </button>
          ))}
        </div>
        <p className="login-disclaimer">选择角色进入对应后台。</p>
      </section>
    </main>
  );
}
