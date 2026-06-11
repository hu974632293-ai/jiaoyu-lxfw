import { useMemo, useState } from "react";
import { ArrowRight, ClipboardList, Filter, RefreshCw, Search } from "lucide-react";
import { roleOptions } from "../data/prototype";
import { backofficeNavItems, roleVisiblePages } from "../navigation";
import type { BackofficePageKey } from "../navigation";
import type { PageProps } from "../App";

type WorkspaceRecord = {
  id: string;
  title: string;
  status: string;
  owner: string;
  detail: string;
  next: string;
  group: string;
};

type RoleWorkspaceCopy = {
  title: string;
  subtitle: string;
  metrics: Array<{ label: string; value: string; note: string; tone: "success" | "warning" | "danger" }>;
  todos: string[];
  records: WorkspaceRecord[];
};

const roleCopy: Record<PageProps["role"], RoleWorkspaceCopy> = {
  consultant: {
    title: "客户增长工作台",
    subtitle: "先处理高潜线索、跟进任务和活动邀约。",
    metrics: [
      { label: "高潜客户", value: "8", note: "3 个今日回访", tone: "warning" },
      { label: "待跟进", value: "27", note: "6 个临近超时", tone: "danger" },
      { label: "活动邀约", value: "7", note: "本周讲座", tone: "success" },
    ],
    todos: ["王晴 17:30 回访家长", "刘欣发送德国双元制材料", "陈浩设置长期培育提醒"],
    records: [
      { id: "L-001", title: "王晴", status: "高潜跟进", owner: "李敏", detail: "新加坡国际本科，家长关注费用和升学路径。", next: "补齐预算上限后进入方案沟通", group: "高潜" },
      { id: "L-002", title: "刘欣", status: "咨询中", owner: "赵凯", detail: "德国双元制方向，关注带薪实习和语言要求。", next: "发送德语课程方案", group: "咨询" },
      { id: "L-003", title: "陈浩", status: "暂缓", owner: "李敏", detail: "预算暂不匹配，需要长期培育。", next: "三个月后再次触达", group: "暂缓" },
    ],
  },
  employee: {
    title: "员工工作台",
    subtitle: "低成本完成客户录入、日报、组织查询和新人指引。",
    metrics: [
      { label: "今日日报", value: "4", note: "2 条待补充", tone: "warning" },
      { label: "客户操作", value: "9", note: "录入和状态更新", tone: "success" },
      { label: "组织查询", value: "12", note: "本周访问", tone: "success" },
    ],
    todos: ["补交今日客户跟进日报", "查询双元制事业部联系人", "更新王晴客户状态"],
    records: [
      { id: "E-101", title: "客户快捷录入", status: "待提交", owner: "运营员工", detail: "录入客户姓名、联系方式、意向项目和下一步。", next: "保存后进入客户增长队列", group: "客户" },
      { id: "E-102", title: "日报汇总", status: "草稿", owner: "运营员工", detail: "整理今日进展、风险和明日动作。", next: "提交日报并刷新周汇总", group: "日报" },
      { id: "E-103", title: "新人指南", status: "可查询", owner: "人事支持", detail: "制度、流程和常见操作路径。", next: "按关键词查看指南", group: "指南" },
    ],
  },
  teacher: {
    title: "学生服务工作台",
    subtitle: "集中处理请假、反馈、心理辅助预警和学业进度。",
    metrics: [
      { label: "请假审批", value: "5", note: "待老师处理", tone: "warning" },
      { label: "反馈工单", value: "9", note: "2 个高优先级", tone: "danger" },
      { label: "辅助预警", value: "3", note: "需持续跟进", tone: "danger" },
    ],
    todos: ["审批陈雨 6 月请假", "处理林可宿舍反馈", "跟进赵宁心理辅助记录"],
    records: [
      { id: "T-201", title: "陈雨请假申请", status: "待审批", owner: "周老师", detail: "申请 06-12 至 06-13 请假，原因：家庭事务。", next: "查看详情后同意或退回补充", group: "请假" },
      { id: "T-202", title: "林可反馈工单", status: "处理中", owner: "王老师", detail: "宿舍网络不稳定，已进入生活支持队列。", next: "补充处理结果并通知学生", group: "反馈" },
      { id: "T-203", title: "赵宁辅助预警", status: "待回访", owner: "周老师", detail: "连续表达焦虑和睡眠差，仅用于辅助识别。", next: "记录回访并建议专业支持", group: "预警" },
    ],
  },
  student: {
    title: "学生服务台",
    subtitle: "自助提交请假和反馈，查询成绩、进度、考务与生活支持。",
    metrics: [
      { label: "我的事项", value: "4", note: "进行中", tone: "warning" },
      { label: "申请阶段", value: "3", note: "材料补充", tone: "success" },
      { label: "考务提醒", value: "2", note: "本周节点", tone: "warning" },
    ],
    todos: ["补充推荐信材料", "查看语言测试模拟考", "提交宿舍网络反馈"],
    records: [
      { id: "S-301", title: "请假申请", status: "待老师审批", owner: "陈雨", detail: "可提交请假原因、时间和补充说明。", next: "提交后在我的事项查看状态", group: "请假" },
      { id: "S-302", title: "申请进度", status: "材料补充", owner: "陈雨", detail: "文书初稿完成，推荐信待上传。", next: "补齐材料并等待老师确认", group: "进度" },
      { id: "S-303", title: "生活支持", status: "可咨询", owner: "学生本人", detail: "住宿、交通、医疗和紧急联系人支持。", next: "提交问题后等待服务台回复", group: "支持" },
    ],
  },
  manager: {
    title: "经营管理后台",
    subtitle: "查看增长、日报、心理周报、投诉周报和风险队列。",
    metrics: [
      { label: "新增线索", value: "12", note: "本日", tone: "success" },
      { label: "待决风险", value: "5", note: "需管理者关注", tone: "danger" },
      { label: "周报", value: "4", note: "已生成", tone: "success" },
    ],
    todos: ["查看本周投诉处理周报", "确认心理辅助高风险队列", "复盘活动转化趋势"],
    records: [
      { id: "M-401", title: "增长总览", status: "已更新", owner: "管理者", detail: "新增、成交、流失和高潜客户趋势。", next: "查看异常阶段并分配跟进", group: "增长" },
      { id: "M-402", title: "日报汇总", status: "待确认", owner: "管理者", detail: "团队日报进展、风险和待协调事项。", next: "确认周重点和资源协调", group: "日报" },
      { id: "M-403", title: "风险队列", status: "高优先级", owner: "管理者", detail: "投诉超时、心理辅助和客户流失风险。", next: "分派负责人并跟踪处理", group: "风险" },
    ],
  },
  admin: {
    title: "系统治理",
    subtitle: "维护用户、角色、权限、审计、通知、知识来源和系统状态。",
    metrics: [
      { label: "用户", value: "4", note: "演示账号", tone: "success" },
      { label: "权限点", value: "4", note: "核心模块", tone: "success" },
      { label: "通知", value: "3", note: "待处理", tone: "warning" },
    ],
    todos: ["检查角色权限绑定", "查看今日审计记录", "维护知识来源状态"],
    records: [
      { id: "A-501", title: "系统管理员", status: "启用", owner: "admin", detail: "负责系统治理、权限、审计和知识来源。", next: "按治理项查看详情", group: "用户" },
      { id: "A-502", title: "顾问角色", status: "启用", owner: "管理员", detail: "具备客户增长、客户跟进和活动邀约权限。", next: "核对权限边界", group: "角色" },
      { id: "A-503", title: "知识来源", status: "待维护", owner: "管理员", detail: "公司信息、业务、政策、新人指南和生活支持。", next: "检查来源状态和同步记录", group: "知识" },
    ],
  },
};

function getNavItem(page: BackofficePageKey) {
  return backofficeNavItems.find((item) => item.key === page) ?? backofficeNavItems[0];
}

function formatOperationTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

export default function RoleWorkspacePage({ role, activePage, onNavigate, onSeedDemo, seedStatus }: PageProps & { activePage: BackofficePageKey }) {
  const copy = roleCopy[role];
  const currentRole = roleOptions.find((item) => item.key === role) ?? roleOptions[0];
  const featurePages = roleVisiblePages[role].filter((page) => page !== "roleOverview");
  const currentFeature = getNavItem(activePage);
  const [keyword, setKeyword] = useState("");
  const [group, setGroup] = useState("全部");
  const [selectedId, setSelectedId] = useState(copy.records[0]?.id ?? "");
  const [feedback, setFeedback] = useState("等待操作");

  const groups = useMemo(() => ["全部", ...Array.from(new Set(copy.records.map((item) => item.group)))], [copy.records]);
  const filteredRecords = useMemo(() => {
    return copy.records.filter((item) => {
      const hitKeyword = [item.title, item.status, item.owner, item.detail, item.next].some((value) => value.includes(keyword));
      const hitGroup = group === "全部" || item.group === group;
      return hitKeyword && hitGroup;
    });
  }, [copy.records, group, keyword]);
  const selected = filteredRecords.find((item) => item.id === selectedId) ?? filteredRecords[0] ?? copy.records[0];

  function handlePrimaryAction(action: string) {
    setFeedback(`${action}已记录，${formatOperationTime()} 更新处理状态`);
  }

  if (activePage === "roleOverview") {
    return (
      <div className="page-stack role-overview-page">
        <section className="page-heading">
          <div>
            <p className="eyebrow">{currentRole.label}</p>
            <h2>{copy.title}</h2>
            <p>{copy.subtitle}</p>
          </div>
        </section>

        <section className="role-snapshot-grid" aria-label="核心指标">
          {copy.metrics.map((metric) => (
            <article className={`metric-card ${metric.tone}`} key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <em>{metric.note}</em>
            </article>
          ))}
        </section>

        <section className="split-layout secondary">
          <div className="panel-block">
            <div className="section-title">
              <h3>功能入口</h3>
              <ClipboardList size={18} aria-hidden="true" />
            </div>
            <div className="role-action-grid workspace-feature-grid">
              {featurePages.map((page) => {
                const item = getNavItem(page);
                const Icon = item.icon;
                return (
                  <button className="role-action-card" key={page} onClick={() => onNavigate(page)}>
                    <Icon size={20} aria-hidden="true" />
                    <strong>{item.label}</strong>
                    <span>{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="side-stack">
            <section className="panel-block">
              <div className="section-title">
                <h3>今日待办</h3>
                <span>{copy.todos.length} 项</span>
              </div>
              <div className="task-list">
                {copy.todos.map((item) => (
                  <article className="task-row" key={item}>
                    <div>
                      <strong>{item}</strong>
                      <span>{copy.title}</span>
                    </div>
                    <em>待处理</em>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel-block">
              <div className="section-title">
                <h3>最近记录</h3>
                <span>{copy.records.length} 条</span>
              </div>
              <div className="guide-list">
                {copy.records.map((item) => (
                  <article key={item.id}>
                    <strong>{item.title}</strong>
                    <span>{item.status} / {item.next}</span>
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack role-function-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">{copy.title}</p>
          <h2>{currentFeature.label}</h2>
          <p>{currentFeature.desc}</p>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={() => handlePrimaryAction("刷新")}>
            <RefreshCw size={16} aria-hidden="true" />
            刷新
          </button>
          <button className="icon-button" onClick={() => handlePrimaryAction(currentFeature.label)}>
            处理当前事项
          </button>
        </div>
      </section>

      <section className="role-snapshot-grid" aria-label="功能指标">
        <article className="metric-card success">
          <span>当前列表</span>
          <strong>{filteredRecords.length}</strong>
          <em>匹配筛选条件</em>
        </article>
        <article className="metric-card warning">
          <span>待处理</span>
          <strong>{Math.max(filteredRecords.length - 1, 0)}</strong>
          <em>需要继续跟进</em>
        </article>
        <article className="metric-card success">
          <span>操作反馈</span>
          <strong>{feedback === "等待操作" ? "待操作" : "已更新"}</strong>
          <em>{feedback}</em>
        </article>
      </section>

      <section className="toolbar">
        <Search size={16} aria-hidden="true" />
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索名称、状态、负责人或下一步" />
        <Filter size={16} aria-hidden="true" />
        <select value={group} onChange={(event) => setGroup(event.target.value)} aria-label="分组筛选">
          {groups.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <span className="status-pill">{feedback}</span>
      </section>

      <section className="split-layout">
        <div className="panel-block">
          <div className="section-title">
            <h3>{currentFeature.label}列表</h3>
            <span>{filteredRecords.length} 条</span>
          </div>
          <div className="select-list">
            {filteredRecords.map((item) => (
              <button className={selected?.id === item.id ? "active" : ""} key={item.id} onClick={() => setSelectedId(item.id)}>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
                <em>{item.status} / {item.owner}</em>
              </button>
            ))}
          </div>
          {!filteredRecords.length ? <div className="empty-state">当前筛选下暂无记录，可调整关键词或分组。</div> : null}
        </div>

        <aside className="side-stack">
          <section className="panel-block">
            <div className="section-title">
              <h3>详情与处理</h3>
              <span className="status-pill">{selected?.status ?? "未选择"}</span>
            </div>
            {selected ? (
              <dl className="detail-list">
                <div>
                  <dt>对象</dt>
                  <dd>{selected.title}</dd>
                </div>
                <div>
                  <dt>负责人</dt>
                  <dd>{selected.owner}</dd>
                </div>
                <div>
                  <dt>说明</dt>
                  <dd>{selected.detail}</dd>
                </div>
                <div>
                  <dt>下一步</dt>
                  <dd>{selected.next}</dd>
                </div>
              </dl>
            ) : (
              <div className="empty-state">选择左侧记录后查看详情。</div>
            )}
            <div className="inline-actions">
              <button className="tiny-button" onClick={() => handlePrimaryAction("处理记录")}>记录处理</button>
              <button className="tiny-button" onClick={() => handlePrimaryAction("状态更新")}>更新状态</button>
              {activePage === "consultantCustomer360" ? (
                <button className="tiny-button" onClick={() => onNavigate("customer360", 1)}>
                  打开客户 360 <ArrowRight size={13} aria-hidden="true" />
                </button>
              ) : null}
              {activePage === "adminSystemStatus" ? (
                <button className="tiny-button" onClick={() => void onSeedDemo()}>初始化基础数据</button>
              ) : null}
            </div>
            {activePage === "adminSystemStatus" ? <p className="muted">{seedStatus}</p> : null}
          </section>

          <section className="panel-block">
            <div className="section-title">
              <h3>处理记录</h3>
              <span>时间线</span>
            </div>
            <div className="guide-list">
              <article>
                <strong>进入{currentFeature.label}</strong>
                <span>已根据当前角色打开对应功能区。</span>
              </article>
              <article>
                <strong>筛选结果</strong>
                <span>关键词和分组会同步影响列表、数量和详情选择。</span>
              </article>
              <article>
                <strong>最近反馈</strong>
                <span>{feedback}</span>
              </article>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
