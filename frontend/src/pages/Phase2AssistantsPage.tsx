import { Bot, ChevronRight, GraduationCap, Users } from "lucide-react";
import { useState } from "react";
import type { PageProps } from "../App";
import EnterpriseAssistantPage from "./EnterpriseAssistantPage";
import StudentAssistantPage from "./StudentAssistantPage";

type AssistantView = "overview" | "enterprise" | "student";

const assistantEntries: Array<{
  key: Exclude<AssistantView, "overview">;
  title: string;
  desc: string;
  meta: string;
  icon: typeof Bot;
}> = [
  {
    key: "enterprise",
    title: "企业助手",
    desc: "员工自然语言录入客户、提交日报、查询组织架构和执行受控只读查询。",
    meta: "员工生产力",
    icon: Bot,
  },
  {
    key: "student",
    title: "学生助手",
    desc: "学生服务自助、老师审批、反馈工单、申请进度和心理辅助预警。",
    meta: "学生服务",
    icon: GraduationCap,
  },
];

export default function Phase2AssistantsPage(props: PageProps) {
  const [view, setView] = useState<AssistantView>("overview");

  if (view === "enterprise") {
    return <EnterpriseAssistantPage {...props} />;
  }

  if (view === "student") {
    return <StudentAssistantPage {...props} />;
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">二期助手</p>
          <h2>把企业助手和学生助手收纳为扩展入口</h2>
          <p>二期助手不抢客户增长首屏，只作为登录后的扩展生产力工具；创建客户后回到客户增长主链路。</p>
        </div>
      </section>

      <section className="assistant-entry-grid" aria-label="二期助手入口">
        {assistantEntries.map((entry) => {
          const Icon = entry.icon;
          return (
            <button className="assistant-entry-card" key={entry.key} onClick={() => setView(entry.key)}>
              <Icon size={24} aria-hidden="true" />
              <span>{entry.meta}</span>
              <strong>{entry.title}</strong>
              <p>{entry.desc}</p>
              <em>
                进入助手 <ChevronRight size={14} aria-hidden="true" />
              </em>
            </button>
          );
        })}
      </section>

      <section className="split-layout secondary">
        <div className="panel-block">
          <div className="section-title">
            <h3>与主链路关系</h3>
            <span className="status-pill success">登录后可见</span>
          </div>
          <div className="task-list">
            <article className="task-row">
              <div>
                <strong>企业助手</strong>
                <span>可创建或更新客户，但完成后应回到客户增长或客户 360。</span>
              </div>
              <em>导流</em>
            </article>
            <article className="task-row">
              <div>
                <strong>学生助手</strong>
                <span>服务学生和老师，不进入官网首屏，也不替代专业心理诊断。</span>
              </div>
              <em>服务</em>
            </article>
          </div>
        </div>

        <div className="panel-block">
          <div className="section-title">
            <h3>当前入口摘要</h3>
            <Users size={18} aria-hidden="true" />
          </div>
          <div className="count-grid">
            <div>
              <span>助手</span>
              <strong>2</strong>
            </div>
            <div>
              <span>客户回流</span>
              <strong>增长</strong>
            </div>
            <div>
              <span>知识问答</span>
              <strong>运营</strong>
            </div>
            <div>
              <span>周报</span>
              <strong>报告</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
