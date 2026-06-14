import { useEffect, useState } from "react";
import { Bell, History, RefreshCw, Shield, UserCog } from "lucide-react";
import { apiRequest } from "../api/client";
import { OperationFeedback, type OperationFeedbackState } from "../components/OperationFeedback";
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
  target_type: string;
  target_id: number | null;
  target_url: string;
  title: string;
  content: string;
  status: string;
  read_at?: string | null;
};
type SystemOperation = "load" | "audit" | "notification" | null;
export type AdminGovernanceView = "overview" | "users" | "roles" | "permissions" | "audit" | "notifications";

type SystemAdminPageProps = PageProps & {
  initialView?: AdminGovernanceView;
};

const viewMeta: Record<AdminGovernanceView, { eyebrow: string; title: string; desc: string }> = {
  overview: {
    eyebrow: "系统管理",
    title: "角色权限、审计日志和通知中心",
    desc: "管理员统一查看用户、角色、权限、审计和通知数据。",
  },
  users: {
    eyebrow: "用户管理",
    title: "用户列表、账号状态和角色绑定",
    desc: "查看账号、姓名、角色绑定和当前状态。",
  },
  roles: {
    eyebrow: "角色管理",
    title: "角色定义、权限数量和使用范围",
    desc: "查看系统角色、职责说明和已绑定权限数量。",
  },
  permissions: {
    eyebrow: "权限管理",
    title: "权限点、模块和接口边界",
    desc: "查看权限编码、所属模块和权限说明。",
  },
  audit: {
    eyebrow: "审计日志",
    title: "关键操作筛选和详情",
    desc: "查看治理操作留痕，并可写入一条审计记录验证链路。",
  },
  notifications: {
    eyebrow: "通知管理",
    title: "通知、待办和已读状态",
    desc: "查看系统通知、接收人、内容和处理状态。",
  },
};

function formatOperationTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

export default function SystemAdminPage({ role, initialView = "overview", onNavigate }: SystemAdminPageProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissionItems, setPermissionItems] = useState<PermissionItem[]>([]);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([]);
  const [message, setMessage] = useState("正在加载系统治理数据...");
  const [operationFeedback, setOperationFeedback] = useState<OperationFeedbackState>({
    phase: "pending",
    title: "正在加载系统治理数据",
    detail: "读取用户、角色、权限、审计和通知。",
    target: "系统管理",
  });
  const [pendingOperation, setPendingOperation] = useState<SystemOperation>("load");
  const [highlightAudit, setHighlightAudit] = useState(false);

  async function load() {
    setMessage("正在加载系统治理数据...");
    setPendingOperation("load");
    setOperationFeedback({
      phase: "pending",
      title: "正在刷新系统治理数据",
      detail: "读取用户、角色、权限、审计和通知。",
      target: "系统管理",
    });
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
      setMessage("系统治理数据已连接");
      setOperationFeedback({
        phase: "success",
        title: "系统治理数据已刷新",
        detail: `已同步 ${userData.length} 个用户、${roleData.length} 个角色和 ${auditData.length} 条审计记录。`,
        target: "系统管理",
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setUsers([]);
      setRoles([]);
      setPermissionItems([]);
      setAuditItems([]);
      setNotificationItems([]);
      setMessage(error instanceof Error ? `系统治理数据加载失败：${error.message}` : "系统治理数据加载失败");
      setOperationFeedback({
        phase: "error",
        title: "系统治理数据刷新失败",
        detail: error instanceof Error ? `${error.message}。已保留页面备用数据，可重试。` : "当前未获取到最新数据，已保留页面备用数据，可重试。",
        target: "系统管理",
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function createAuditSample() {
    setMessage("正在写入审计日志...");
    setPendingOperation("audit");
    setOperationFeedback({
      phase: "pending",
      title: "正在写入治理审计",
      detail: "这是治理类写操作，会刷新审计列表。",
      target: role,
    });
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
      setHighlightAudit(true);
      setOperationFeedback({
        phase: "success",
        title: "治理审计已写入",
        detail: "审计列表已刷新，最新记录会高亮提示。",
        target: role,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setMessage(error instanceof Error ? `审计写入失败：${error.message}` : "审计写入失败");
      setOperationFeedback({
        phase: "error",
        title: "审计写入失败",
        detail: error instanceof Error ? `${error.message}。未写入审计记录，可重试。` : "当前未写入审计记录，可重试。",
        target: role,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function markNotificationRead(item: { id?: number; title: string }) {
    if (!item.id) return;
    setPendingOperation("notification");
    try {
      const updated = await apiRequest<NotificationItem>(`/api/notifications/${item.id}/read`, { method: "POST" });
      setNotificationItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      setOperationFeedback({
        phase: "success",
        title: "通知已标记为已读",
        detail: item.title,
        target: "通知中心",
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "通知已读更新失败",
        detail: error instanceof Error ? `${error.message}。可稍后重试。` : "暂时无法更新通知状态。",
        target: "通知中心",
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function handleNotification(item: { id?: number; title: string }) {
    if (!item.id) return;
    setPendingOperation("notification");
    try {
      const updated = await apiRequest<NotificationItem>(`/api/notifications/${item.id}/handle`, { method: "POST" });
      setNotificationItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      setOperationFeedback({
        phase: "success",
        title: "通知已处理完成",
        detail: item.title,
        target: "通知中心",
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setOperationFeedback({
        phase: "error",
        title: "通知处理失败",
        detail: error instanceof Error ? `${error.message}。可稍后重试。` : "暂时无法处理通知。",
        target: "通知中心",
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  function openNotificationTarget(item: { targetUrl?: string }) {
    if (!item.targetUrl) return;
    if (item.targetUrl.includes("customer-growth")) {
      onNavigate("customerGrowth");
      return;
    }
    if (item.targetUrl.includes("teacher-student-service")) {
      onNavigate("teacherStudentService");
      return;
    }
    if (item.targetUrl.includes("reports")) {
      onNavigate("reports");
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
        id: item.id,
        title: item.title,
        receiver: item.receiver_name,
        status: item.status,
        content: item.content,
        targetUrl: item.target_url,
      }))
    : notifications.map((item) => ({ ...item, id: undefined, content: "待确认通知内容", targetUrl: "" }));

  const displayAuditRows = auditItems.length
    ? auditItems.map((item) => ({
        operator: item.actor_name,
        action: item.action,
        resource: `${item.resource_type} #${item.resource_id}`,
        detail: typeof item.detail === "string" ? item.detail : JSON.stringify(item.detail),
        time: item.created_at ? item.created_at.slice(5, 16).replace("T", " ") : "-",
      }))
    : auditRows;
  const hasPendingOperation = pendingOperation !== null;
  const isLoading = pendingOperation === "load";
  const isWritingAudit = pendingOperation === "audit";
  const meta = viewMeta[initialView];
  const showOverview = initialView === "overview";
  const showUsers = showOverview || initialView === "users";
  const showRoles = showOverview || initialView === "roles";
  const showPermissions = showOverview || initialView === "permissions";
  const showAudit = showOverview || initialView === "audit";
  const showNotifications = showOverview || initialView === "notifications";
  const userRoleGridClass = showUsers && showRoles ? "admin-grid" : "admin-grid admin-grid-single";
  const permissionNotificationGridClass = showPermissions && showNotifications ? "admin-grid" : "admin-grid admin-grid-single";

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">{meta.eyebrow}</p>
          <h2>{meta.title}</h2>
          <p>{meta.desc}</p>
        </div>
        <div className="heading-actions">
          <span className="status-pill">当前角色：{role}</span>
          <span className={users.length ? "status-pill success" : "status-pill fallback"}>{message}</span>
          <button className="icon-button secondary" onClick={load} disabled={hasPendingOperation}>
            <RefreshCw className={isLoading ? "spin-icon" : ""} size={16} aria-hidden="true" />
            {isLoading ? "正在刷新" : "刷新治理数据"}
          </button>
        </div>
      </section>

      <OperationFeedback feedback={operationFeedback} />

      {(showUsers || showRoles) && (
        <section className={userRoleGridClass}>
          {showUsers && (
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
          )}

          {showRoles && (
            <div className="panel-block">
              <div className="section-title">
                <h3>角色管理</h3>
                <Shield size={18} aria-hidden="true" />
              </div>
              <div className="role-grid">
                {displayRoles.map((item) => (
                  <article key={item.key}>
                    <strong>{item.label}</strong>
                    <span>{item.focus}</span>
                    <em>
                      {item.key} / {item.count} 个权限
                    </em>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {(showPermissions || showNotifications) && (
        <section className={permissionNotificationGridClass}>
          {showPermissions && (
            <div className="panel-block">
              <div className="section-title">
                <h3>权限点</h3>
                <span>{displayPermissions.length} 个</span>
              </div>
              <div className="permission-list">
                {displayPermissions.map((item) => (
                  <article key={item.code}>
                    <strong>{item.module}</strong>
                    <code>{item.code}</code>
                    <span>{item.desc}</span>
                  </article>
                ))}
              </div>
            </div>
          )}

          {showNotifications && (
            <div className="panel-block">
              <div className="section-title">
                <h3>通知中心</h3>
                <Bell size={18} aria-hidden="true" />
              </div>
              <div className="log-list">
                {displayNotifications.map((item) => (
                  <article key={`${item.receiver}-${item.title}`}>
                    <strong>{item.title}</strong>
                    <span>
                      {item.receiver} / {item.content}
                    </span>
                    <em>{item.status}</em>
                    <div className="inline-actions">
                      <button className="tiny-button" onClick={() => markNotificationRead(item)} disabled={hasPendingOperation || !item.id}>
                        标记已读
                      </button>
                      <button className="tiny-button" onClick={() => handleNotification(item)} disabled={hasPendingOperation || !item.id}>
                        处理完成
                      </button>
                      <button className="ghost-button" onClick={() => openNotificationTarget(item)} disabled={!item.targetUrl}>
                        打开对象
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {showAudit && (
        <section className="panel-block table-panel">
          <div className="section-title">
            <h3>关键操作审计</h3>
            <div className="heading-actions">
              <button className="tiny-button" onClick={createAuditSample} disabled={hasPendingOperation}>{isWritingAudit ? "写入中" : "写入治理审计"}</button>
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
              {displayAuditRows.map((item, index) => (
                <tr className={highlightAudit && index === 0 ? "is-highlighted" : ""} key={`${item.operator}-${item.action}-${item.time}-${index}`}>
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
      )}
    </div>
  );
}
