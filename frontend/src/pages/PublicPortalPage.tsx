import { ArrowRight, Building2, CalendarDays, CheckCircle2, HelpCircle, Mail, Phone } from "lucide-react";
import { eventPrototypeRows, projectRows, publicFaqs, publicServices, publicTrustPoints } from "../data/prototype";
import { publicNavItems } from "../navigation";
import type { PublicPageKey } from "../navigation";

type PublicPortalPageProps = {
  activePage: PublicPageKey;
  onNavigate: (page: PublicPageKey) => void;
  onLogin: () => void;
};

const pageTitle: Record<PublicPageKey, string> = {
  home: "首页",
  about: "企业介绍",
  services: "业务服务",
  publicProjects: "项目/课程",
  publicEvents: "活动/讲座",
  faq: "知识/FAQ",
  contact: "联系我们",
};

export default function PublicPortalPage({ activePage, onNavigate, onLogin }: PublicPortalPageProps) {
  return (
    <main className="public-shell">
      <header className="public-topbar">
        <button className="public-brand" onClick={() => onNavigate("home")}>
          <Building2 size={20} aria-hidden="true" />
          教育服务
        </button>
        <nav className="public-nav" aria-label="公开官网导航">
          {publicNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button className={activePage === item.key ? "active" : ""} key={item.key} onClick={() => onNavigate(item.key)}>
                <Icon size={16} aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <button className="icon-button" onClick={onLogin}>
          登录后台
        </button>
      </header>

      <section className="public-content">
        {activePage === "home" ? (
          <HomePage onNavigate={onNavigate} onLogin={onLogin} />
        ) : (
          <PublicSubPage activePage={activePage} onNavigate={onNavigate} onLogin={onLogin} />
        )}
      </section>
    </main>
  );
}

function HomePage({ onNavigate, onLogin }: Pick<PublicPortalPageProps, "onNavigate" | "onLogin">) {
  return (
    <div className="public-page-stack">
      <section className="public-hero">
        <div className="public-hero-copy">
          <p className="eyebrow">教育服务官网门户</p>
          <h1>把升学规划、项目选择和后续服务做成可追踪的教育服务路径</h1>
          <p>
            面向学生、家长和合作方，提供留学规划、国际本科、德国双元制、语言培训、背景提升和学生服务支持。
            官网用于了解企业、判断服务匹配并发起咨询；后台工作台仅供登录后的内部角色使用。
          </p>
          <div className="public-actions">
            <button className="icon-button" onClick={() => onNavigate("contact")}>
              立即咨询
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button className="icon-button secondary" onClick={() => onNavigate("publicProjects")}>
              查看项目
            </button>
            <button className="ghost-button" onClick={onLogin}>
              登录后台
            </button>
          </div>
        </div>
        <aside className="public-hero-panel">
          <strong>服务路径</strong>
          <ol>
            <li>了解企业和服务范围</li>
            <li>选择项目或活动方向</li>
            <li>提交咨询或报名信息</li>
            <li>由顾问进入后台跟进</li>
          </ol>
          <span>公开官网只展示服务路径和咨询入口；内部运营信息仅在登录后可见。</span>
        </aside>
      </section>

      <SectionHeader eyebrow="核心服务" title="先解释服务，再引导咨询" actionLabel="全部服务" onAction={() => onNavigate("services")} />
      <ServiceGrid />

      <SectionHeader eyebrow="信任建立" title="用清晰流程降低陌生访客决策成本" />
      <div className="public-trust-grid">
        {publicTrustPoints.map((item) => (
          <article key={item.title}>
            <CheckCircle2 size={18} aria-hidden="true" />
            <strong>{item.title}</strong>
            <p>{item.desc}</p>
          </article>
        ))}
      </div>

      <section className="public-two-column">
        <div>
          <SectionHeader eyebrow="热门项目" title="公开可见的项目/课程摘要" actionLabel="查看项目" onAction={() => onNavigate("publicProjects")} />
          <ProjectPreview />
        </div>
        <div>
          <SectionHeader eyebrow="近期活动" title="讲座和说明会承接报名需求" actionLabel="活动报名" onAction={() => onNavigate("publicEvents")} />
          <EventPreview />
        </div>
      </section>

      <section className="public-two-column">
        <div>
          <SectionHeader eyebrow="FAQ" title="回答高频问题，保留 fallback 说明" actionLabel="更多 FAQ" onAction={() => onNavigate("faq")} />
          <FaqPreview />
        </div>
        <ContactCard onNavigate={onNavigate} />
      </section>
    </div>
  );
}

function PublicSubPage({ activePage, onNavigate, onLogin }: PublicPortalPageProps) {
  return (
    <div className="public-page-stack">
      <section className="public-subpage-heading">
        <p className="eyebrow">{pageTitle[activePage]}</p>
        <h1>{subpageHeading(activePage)}</h1>
        <p>{subpageSummary(activePage)}</p>
        <div className="public-actions">
          <button className="icon-button" onClick={() => onNavigate("contact")}>
            咨询服务
          </button>
          <button className="ghost-button" onClick={onLogin}>
            登录后台
          </button>
        </div>
      </section>

      {activePage === "about" && (
        <section className="public-two-column">
          <div className="public-info-block">
            <h2>企业背景</h2>
            <p>
              我们面向升学家庭和在读学生，围绕规划评估、项目匹配、活动咨询和后续服务建立可追踪流程。
              公开官网负责让访客理解服务价值，内部后台负责顾问跟进和运营管理。
            </p>
          </div>
          <div className="public-info-block">
            <h2>服务理念</h2>
            <p>先判断路径是否适合，再推荐项目和活动。AI 能力只做辅助说明和效率增强，不替代顾问判断。</p>
          </div>
        </section>
      )}

      {activePage === "services" && <ServiceGrid />}
      {activePage === "publicProjects" && <ProjectPreview expanded />}
      {activePage === "publicEvents" && <EventPreview expanded />}
      {activePage === "faq" && <FaqPreview expanded />}
      {activePage === "contact" && <ContactCard onNavigate={onNavigate} expanded />}
    </div>
  );
}

function SectionHeader({ eyebrow, title, actionLabel, onAction }: { eyebrow: string; title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="public-section-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {actionLabel && onAction && (
        <button className="ghost-button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function ServiceGrid() {
  return (
    <section className="public-card-grid">
      {publicServices.map((item) => (
        <article className="public-card" key={item.title}>
          <strong>{item.title}</strong>
          <p>{item.desc}</p>
          <span>{item.audience}</span>
        </article>
      ))}
    </section>
  );
}

function ProjectPreview({ expanded = false }: { expanded?: boolean }) {
  const rows = expanded ? projectRows : projectRows.slice(0, 3);
  return (
    <div className="public-list">
      {rows.map((item) => (
        <article key={item.name}>
          <div>
            <strong>{item.name}</strong>
            <span>{item.country} / {item.category} / {item.cycle}</span>
          </div>
          <em>{item.cost}</em>
          <p>{item.tags.join("、")}</p>
        </article>
      ))}
    </div>
  );
}

function EventPreview({ expanded = false }: { expanded?: boolean }) {
  const rows = expanded ? eventPrototypeRows : eventPrototypeRows.slice(0, 2);
  return (
    <div className="public-list">
      {rows.map((item) => (
        <article key={item.name}>
          <div>
            <strong>{item.name}</strong>
            <span>{item.type} / {item.time} / {item.target}</span>
          </div>
          <em>{item.status}</em>
          <p>公开报名名额：{item.signed}/{item.capacity}</p>
        </article>
      ))}
    </div>
  );
}

function FaqPreview({ expanded = false }: { expanded?: boolean }) {
  const rows = expanded ? publicFaqs : publicFaqs.slice(0, 3);
  return (
    <div className="public-faq-list">
      {rows.map((item) => (
        <article key={item.question}>
          <HelpCircle size={18} aria-hidden="true" />
          <div>
            <strong>{item.question}</strong>
            <p>{item.answer}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function ContactCard({ onNavigate, expanded = false }: { onNavigate: (page: PublicPageKey) => void; expanded?: boolean }) {
  return (
    <section className="public-contact-card">
      <p className="eyebrow">联系我们</p>
      <h2>留下需求，由顾问承接后续服务</h2>
      <div className="public-contact-grid">
        <span><Phone size={16} aria-hidden="true" /> 电话：400-000-2026</span>
        <span><Mail size={16} aria-hidden="true" /> 咨询邮箱：service@example.com</span>
        <span><CalendarDays size={16} aria-hidden="true" /> 工作时间：周一至周六 09:00-18:00</span>
      </div>
      {expanded && (
        <div className="public-form-preview">
          <label>
            <span>姓名</span>
            <input value="访客姓名" readOnly />
          </label>
          <label>
            <span>关注方向</span>
            <input value="留学规划 / 国际本科 / 活动报名" readOnly />
          </label>
          <label>
            <span>咨询内容</span>
            <textarea value="请描述学生背景、目标国家、预算和希望了解的问题。" readOnly />
          </label>
        </div>
      )}
      <button className="icon-button" onClick={() => onNavigate("contact")}>
        提交咨询意向
      </button>
    </section>
  );
}

function subpageHeading(page: PublicPageKey) {
  const map: Record<PublicPageKey, string> = {
    home: "教育服务官网门户",
    about: "先理解企业，再判断服务是否匹配",
    services: "围绕升学、语言、就业和学生服务的公开业务说明",
    publicProjects: "公开展示项目路径和适合人群",
    publicEvents: "通过讲座和说明会承接咨询与报名",
    faq: "用高频问题降低初次咨询门槛",
    contact: "把咨询意向沉淀为可跟进线索",
  };
  return map[page];
}

function subpageSummary(page: PublicPageKey) {
  const map: Record<PublicPageKey, string> = {
    home: "官网首页负责建立信任、解释服务和引导下一步动作。",
    about: "这里展示企业背景、服务理念和流程，不展示内部运营数据。",
    services: "服务介绍以访客视角表达，不暴露后台字段、评分或客户列表。",
    publicProjects: "项目页只展示公开摘要、适合人群、费用区间和咨询入口。",
    publicEvents: "活动页展示公开讲座信息和报名入口，内部名单管理在后台完成。",
    faq: "FAQ 可使用 Dify 或 fallback 答案，但不暴露内部调试信息。",
    contact: "联系页承接咨询、项目意向和活动报名，不直接开放 CRM 工作台。",
  };
  return map[page];
}
