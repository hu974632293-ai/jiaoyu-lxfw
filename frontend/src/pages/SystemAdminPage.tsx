import { useEffect, useState } from "react";
import { Bell, History, RefreshCw, Shield, UserCog } from "lucide-react";
import { apiRequest } from "../api/client";
import type { PageProps } from "../App";
import { adminUsers, auditRows, notifications, permissions, roleOptions } from "../data/prototype";

type UserItem = {
  id: number;
  username: string;
  real_name: string;
  user_type: string;
  role: string;
  roles: string[];
  status: string;
};

type RoleItem = {
  id: number;
  role_code: string;
  role_name: string;
  description: string;
  status: string;
  permission_codes: string[];
};

type PermissionItem = {
  id: number;
  permission_code: string;
  permission_name: string;
  module: string;
  description: string;
};

type AuditItem = {
  id: number;
  actor_name: string;
  action: string;
  resource_type: string;
  resource_id: string;
  detail: unknown;
  created_at: string | null;
};

type NotificationItem = {
  id: number;
  receiver_name: string;
  title: string;
  content: string;
  status: string;
};

export default function SystemAdminPage({ role }: PageProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissionItems, setPermissionItems] = useState<PermissionItem[]>([]);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([]);
  const [message, setMessage] = useState("正在加载真实系统管理 API...");

  async function load() {
    setMessage("正在加载真实系统管理 API...");
    try {
      const [userData, roleData, permissionData, auditData, notificationData] = await Promise.all([
        apiRequest<UserItem[]>("/api/users"),
        apiRequest<RoleItem[]>("/api/roles"),
        apiRequest<PermissionItem[]>("/api/roles/permissions"),
        apiRequest<AuditItem[]>("/api/audit/logs"),
        apiRequest<NotificationItem[]>("/api/notifications"),
      ]);
      setUsers(userData);
      setRoles(roleData);
      setPermissionItems(permissionData);
      setAuditItems(auditData);
      setNotificationItems(notificationData);
      setMessage("真实角色权限、审计和通知 API 已连接");
    } catch (error) {
      setUsers([]);
      setRoles([]);
      setPermissionItems([]);
      setAuditItems([]);
      setNotificationItems([]);
      setMessage(error instanceof Error ? `真实系统管理 API 失败：${error.message}` : "真实系统管理 API 失败");
    }
  }

  async function createAuditSample() {
    setMessage("正在写入审计日志...");
    try {
      await apiRequest("/api/audit/logs", {
        method: "POST",
        body: JSON.stringify({
          actor_username: "admin",
          action: "前端演示查看权限",
          resource_type: "system_admin",
          resource_id: role,
          detail: { page: "SystemAdminPage" },
        }),
      });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? `审计写入失败：${error.message}` : "审计写入失败");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const displayUsers = users.length
    ? users.map((item) => ({
        name: item.real_name,
        account: item.username,
        role: item.roles.join("、") || item.role,
        status: item.status,
      }))
    : adminUsers;

  const displayRoles = roles.length
    ? roles.map((item) => ({
        key: item.role_code,
        label: item.role_name,
        focus: item.description,
        count: item.permission_codes.length,
      }))
    : roleOptions.map((item) => ({ ...item, count: 0 }));

  const displayPermissions = permissionItems.length
    ? permissionItems.map((item) => ({
        module: item.module,
        code: item.permission_code,
        desc: `${item.permission_name}：${item.description}`,
      }))
    : permissions;

  const displayNotifications = notificationItems.length
    ? notificationItems.map((item) => ({
        title: item.title,
        receiver: item.receiver_name,
        status: item.status,
        content: item.content,
      }))
    : notifications.map((item) => ({ ...item, content: "前端 mock fallback" }));

  const displayAuditRows = auditItems.length
    ? auditItems.map((item) => ({
        operator: item.actor_name,
        action: item.action,
        resource: `${item.resource_type} #${item.resource_id}`,
        detail: typeof item.detail === "string" ? item.detail : JSON.stringify(item.detail),
        time: item.created_at ? item.created_at.slice(5, 16).replace("T", " ") : "-",
      }))
    : auditRows;

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">系统管理</p>
          <h2>角色权限、审计日志和通知中心</h2>
          <p>本阶段不做真实登录认证；顶部角色切换用于演示入口差异，后端已提供权限模型和审计 API。</p>
        </div>
        <div className="heading-actions">
          <span className="status-pill">当前角色：{role}</span>
          <span className={users.length ? "status-pill success" : "status-pill fallback"}>{message}</span>
          <button className="icon-button secondary" onClick={load}>
            <RefreshCw size={16} aria-hidden="true" />
            刷新
          </button>
        </div>
      </section>

      <section className="admin-grid">
        <div className="panel-block table-panel">
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
              {displayUsers.map((item) => (
                <tr>
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
            {displayRoles.map((item) => (
              <article>
                <strong>{item.label}</strong>
                <span>{item.focus}</span>
                <em>
                  {item.key} / {item.count} 个权限
                </em>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="admin-grid">
        <div className="panel-block">
          <div className="section-title">
            <h3>权限点</h3>
            <span>{displayPermissions.length} 个</span>
          </div>
          <div className="permission-list">
            {displayPermissions.map((item) => (
              <article>
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
            {displayNotifications.map((item) => (
              <article>
                <strong>{item.title}</strong>
                <span>
                  {item.receiver} / {item.content}
                </span>
                <em>{item.status}</em>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="panel-block table-panel">
        <div className="section-title">
          <h3>关键操作审计</h3>
          <div className="heading-actions">
            <button className="tiny-button" onClick={createAuditSample}>写入演示审计</button>
            <History size={18} aria-hidden="true" />
          </div>
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
            {displayAuditRows.map((item) => (
              <tr>
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
