import { ArrowLeft, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import type { RoleKey } from "../data/prototype";

type LoginPageProps = {
  onLogin: (role: RoleKey) => void;
  onBackToPortal: () => void;
};

const demoRoles: Array<{ role: RoleKey; title: string; desc: string }> = [
  { role: "admin", title: "管理员", desc: "系统管理、权限、审计和演示控制" },
  { role: "manager", title: "管理者", desc: "增长总览、报告中心和风险视图" },
  { role: "consultant", title: "顾问", desc: "客户增长、客户 360 和跟进任务" },
  { role: "employee", title: "员工", desc: "企业助手、日报和组织信息" },
  { role: "teacher", title: "老师", desc: "学生助手老师视图" },
  { role: "student", title: "学生", desc: "学生服务自助入口" },
];

export default function LoginPage({ onLogin, onBackToPortal }: LoginPageProps) {
  return (
    <main className="login-shell">
      <section className="login-intro">
        <p className="eyebrow">登录入口</p>
        <h1>从公开官网进入角色后台工作台</h1>
        <p>
          当前阶段采用演示角色跳转，用来验证“官网门户 到 登录入口 到 后台生产力工具”的产品结构。
          真实账号密码、Token、会话管理和后端接口级权限校验属于后续 V2/V3 增强。
        </p>
        <div className="login-note-list">
          <span><CheckCircle2 size={16} aria-hidden="true" /> 顾问默认进入客户增长</span>
          <span><CheckCircle2 size={16} aria-hidden="true" /> 管理者默认进入增长总览</span>
          <span><CheckCircle2 size={16} aria-hidden="true" /> 学生和老师进入二期助手</span>
        </div>
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
        <p className="login-disclaimer">演示登录不会创建真实会话；后续生产化阶段再接入认证、Token 和后端权限校验。</p>
      </section>
    </main>
  );
}
