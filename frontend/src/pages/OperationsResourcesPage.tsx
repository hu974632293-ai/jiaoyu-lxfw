import { BookOpenCheck, CalendarDays, ChevronRight, GraduationCap } from "lucide-react";
import { useState } from "react";
import type { PageProps } from "../App";
import { eventPrototypeRows, projectRows } from "../data/prototype";
import EventsPage from "./EventsPage";
import KnowledgePage from "./KnowledgePage";
import ProjectsPage from "./ProjectsPage";

type OperationsView = "overview" | "projects" | "events" | "knowledge";

const resourceEntries: Array<{
  key: Exclude<OperationsView, "overview">;
  title: string;
  desc: string;
  meta: string;
  icon: typeof GraduationCap;
}> = [
  {
    key: "projects",
    title: "项目/课程",
    desc: "维护项目资料、费用周期、标签和推荐规则，支撑客户画像后的项目匹配。",
    meta: `${projectRows.length} 个项目`,
    icon: GraduationCap,
  },
  {
    key: "events",
    title: "活动运营",
    desc: "管理讲座、说明会、报名名单和签到，承接客户与学生两类主体。",
    meta: `${eventPrototypeRows.length} 个近期活动`,
    icon: CalendarDays,
  },
  {
    key: "knowledge",
    title: "知识库",
    desc: "统一 Dify 场景问答、知识来源和同步任务记录。",
    meta: "4 个问答场景",
    icon: BookOpenCheck,
  },
];

export default function OperationsResourcesPage(props: PageProps) {
  const [view, setView] = useState<OperationsView>("overview");

  if (view === "projects") {
    return <ProjectsPage {...props} />;
  }

  if (view === "events") {
    return <EventsPage {...props} />;
  }

  if (view === "knowledge") {
    return <KnowledgePage {...props} />;
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">运营资源</p>
          <h2>项目、活动和知识库运营台</h2>
        </div>
      </section>

      <section className="role-snapshot-grid" aria-label="运营资源概览">
        <article>
          <span>项目资源</span>
          <strong>{projectRows.length}</strong>
          <em>支撑客户匹配</em>
        </article>
        <article>
          <span>活动场次</span>
          <strong>{eventPrototypeRows.length}</strong>
          <em>承接报名转化</em>
        </article>
        <article>
          <span>知识场景</span>
          <strong>4</strong>
          <em>Dify 场景</em>
        </article>
      </section>

      <section className="operations-command-grid">
        <div className="panel-block">
          <div className="section-title">
            <h3>今日运营任务</h3>
            <span className="status-pill success">后台可见</span>
          </div>
          <div className="task-list">
            <article className="task-row">
              <div>
                <strong>校准项目标签</strong>
                <span>检查项目费用、周期和推荐标签，避免顾问匹配失真。</span>
              </div>
              <em>项目</em>
            </article>
            <article className="task-row">
              <div>
                <strong>跟进活动报名</strong>
                <span>核对讲座容量、签到状态和客户转化来源。</span>
              </div>
              <em>活动</em>
            </article>
            <article className="task-row">
              <div>
                <strong>检查知识问答</strong>
                <span>确保公开咨询和内部问答有可用业务说明。</span>
              </div>
              <em>知识</em>
            </article>
          </div>
        </div>

        <div className="operations-resource-grid" aria-label="运营资源入口">
        {resourceEntries.map((entry) => {
          const Icon = entry.icon;
          return (
            <button className="operations-resource-card" key={entry.key} onClick={() => setView(entry.key)}>
              <Icon size={22} aria-hidden="true" />
              <span>{entry.meta}</span>
              <strong>{entry.title}</strong>
              <p>{entry.desc}</p>
              <em>
                进入子视图 <ChevronRight size={14} aria-hidden="true" />
              </em>
            </button>
          );
        })}
        </div>
      </section>

      <section className="split-layout secondary operations-boundary-grid">
        <div className="panel-block">
          <div className="section-title">
            <h3>资源归类边界</h3>
            <span className="status-pill success">登录后可见</span>
          </div>
          <div className="task-list">
            <article className="task-row">
              <div>
                <strong>项目/课程</strong>
                <span>用于顾问匹配和客户 360 推荐，不在公开官网展示内部规则。</span>
              </div>
              <em>运营</em>
            </article>
            <article className="task-row">
              <div>
                <strong>活动运营</strong>
                <span>支持线索和学生报名，活动报告仍进入报告中心。</span>
              </div>
              <em>转化</em>
            </article>
            <article className="task-row">
              <div>
                <strong>知识库</strong>
                <span>Dify、知识来源和同步任务属于后台运营支撑。</span>
              </div>
              <em>支撑</em>
            </article>
          </div>
        </div>

        <div className="panel-block">
          <div className="section-title">
            <h3>当前入口摘要</h3>
            <span>{resourceEntries.length} 个子视图</span>
          </div>
          <div className="count-grid">
            <div>
              <span>项目</span>
              <strong>{projectRows.length}</strong>
            </div>
            <div>
              <span>活动</span>
              <strong>{eventPrototypeRows.length}</strong>
            </div>
            <div>
              <span>知识场景</span>
              <strong>4</strong>
            </div>
            <div>
              <span>公开程度</span>
              <strong>后台</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
