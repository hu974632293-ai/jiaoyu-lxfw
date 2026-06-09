import { Bell, History, Shield, UserCog } from "lucide-react";
import type { PageProps } from "../App";
import { adminUsers, auditRows, notifications, permissions, roleOptions } from "../data/prototype";

export default function SystemAdminPage({ role }: PageProps) {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">系统管理</p>
          <h2>演示角色切换、权限点、审计日志和通知中心</h2>
          <p>本阶段不做真实登录认证；顶部角色切换用于演示入口差异，后端权限校验入口后续阶段补齐。</p>
        </div>
        <div className="heading-actions">
          <span className="status-pill">当前角色：{role}</span>
          <span className="status-pill fallback">前端权限展示</span>
        </div>
      </section>

      <section className="admin-grid">
        <div className="panel-block">
          <div className="section-title">
            <h3>用户管理</h3>
            <UserCog size={18} aria-hidden="true" />
          </div>
          <table>
            <thead>
              <tr>
                <th>姓名</th>
                <th>账号</th>
                <th>角色</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map((item) => (
                <tr key={item.account}>
                  <td>{item.name}</td>
                  <td>{item.account}</td>
                  <td>{item.role}</td>
                  <td>
                    <span className="badge">{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel-block">
          <div className="section-title">
            <h3>角色管理</h3>
            <Shield size={18} aria-hidden="true" />
          </div>
          <div className="role-grid">
            {roleOptions.map((item) => (
              <article key={item.key}>
                <strong>{item.label}</strong>
                <span>{item.focus}</span>
                <em>{item.key}</em>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="admin-grid">
        <div className="panel-block">
          <div className="section-title">
            <h3>权限点</h3>
            <span>{permissions.length} 个样例</span>
          </div>
          <div className="permission-list">
            {permissions.map((item) => (
              <article key={item.code}>
                <strong>{item.module}</strong>
                <code>{item.code}</code>
                <span>{item.desc}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="panel-block">
          <div className="section-title">
            <h3>通知中心</h3>
            <Bell size={18} aria-hidden="true" />
          </div>
          <div className="log-list">
            {notifications.map((item) => (
              <article key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.receiver}</span>
                <em>{item.status}</em>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="panel-block">
        <div className="section-title">
          <h3>关键操作审计</h3>
          <History size={18} aria-hidden="true" />
        </div>
        <table>
          <thead>
            <tr>
              <th>操作人</th>
              <th>动作</th>
              <th>资源</th>
              <th>详情</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {auditRows.map((item) => (
              <tr key={`${item.operator}-${item.time}`}>
                <td>{item.operator}</td>
                <td>{item.action}</td>
                <td>{item.resource}</td>
                <td>{item.detail}</td>
                <td>{item.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
