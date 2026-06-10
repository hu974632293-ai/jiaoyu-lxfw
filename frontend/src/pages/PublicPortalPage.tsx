import { ArrowRight, Building2, CalendarDays, CheckCircle2, HelpCircle, Mail, Phone, Sparkles } from "lucide-react";
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
    <main className="public-shell brand-portal">
      <header className="public-topbar">
        <button className="public-brand" onClick={() => onNavigate("home")}>
          <Building2 size={20} aria-hidden="true" />
          澜桥国际教育
        </button>
        <nav className="public-nav" aria-label="公开官网导航">
          {publicNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button className={activePage === item.key ? "active" : ""} onClick={() => onNavigate(item.key)}>
                <Icon size={16} aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <button className="icon-button secondary" onClick={onLogin}>
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
      <section className="public-hero premium-hero">
        <div className="public-hero-copy">
          <p className="eyebrow">教育咨询品牌门户</p>
          <h1>把升学规划、项目选择和后续服务做成一条清晰路径</h1>
          <p>
            面向学生、家长和合作方，提供留学规划、国际本科、德国双元制、语言培训、背景提升和学生服务支持。公开官网用于建立信任、解释服务并发起咨询。
          </p>
          <div className="public-actions">
            <button className="icon-button" onClick={() => onNavigate("contact")}>
              预约一对一咨询
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button className="icon-button secondary" onClick={() => onNavigate("publicProjects")}>
              查看适合项目
            </button>
            <button className="ghost-button" onClick={onLogin}>
              登录后台
            </button>
          </div>
        </div>
        <aside className="public-hero-visual">
          <div className="hero-photo" />
          <div className="agent-card">
            <Sparkles size={18} aria-hidden="true" />
            <strong>客服 Agent 在线</strong>
            <span>回答业务、政策、项目、活动和 FAQ；未配置 Dify 时保留 fallback。</span>
          </div>
        </aside>
      </section>

      <section className="public-conversion-strip" aria-label="咨询路径">
        <article>
          <strong>1. 说明服务</strong>
          <span>先了解公司、业务、项目和活动。</span>
        </article>
        <article>
          <strong>2. 提交咨询</strong>
          <span>留下目标国家、预算、阶段和联系方式。</span>
        </article>
        <article>
          <strong>3. 顾问承接</strong>
          <span>进入客户增长后台完成研判和跟进。</span>
        </article>
      </section>

      <SectionHeader eyebrow="核心服务" title="以家庭决策为中心组织服务入口" actionLabel="全部服务" onAction={() => onNavigate("services")} />
      <ServiceGrid />

      <SectionHeader eyebrow="信任建立" title="用清晰流程降低陌生访客决策成本" />
      <div className="public-trust-grid">
        {publicTrustPoints.map((item) => (
          <article>
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
  if (activePage === "about") {
    return (
      <div className="public-page-stack">
        <section className="public-subpage-heading">
          <p className="eyebrow">{pageTitle[activePage]}</p>
          <h1>围绕国际教育、智慧教育和学生服务建立长期服务能力</h1>
          <p>官网只展示公开业务信息和咨询入口；客户资料、跟进记录、权限审计等内部信息仅在登录后台可见。</p>
        </section>
        <div className="public-card-grid">
          <article className="public-card"><strong>国际教育</strong><p>升学规划、国际本科、德国双元制和语言培训。</p></article>
          <article className="public-card"><strong>智慧服务</strong><p>通过客服 Agent、知识库和规则研判提升咨询效率。</p></article>
          <article className="public-card"><strong>学生支持</strong><p>申请进度、学业节点、反馈工单和生活支持。</p></article>
        </div>
      </div>
    );
  }

  if (activePage === "services") {
    return (
      <div className="public-page-stack">
        <section className="public-subpage-heading">
          <p className="eyebrow">{pageTitle[activePage]}</p>
          <h1>先解释服务，再引导到咨询、项目和活动</h1>
        </section>
        <ServiceGrid expanded />
      </div>
    );
  }

  if (activePage === "publicProjects") {
    return (
      <div className="public-page-stack">
        <section className="public-subpage-heading">
          <p className="eyebrow">{pageTitle[activePage]}</p>
          <h1>按国家、目标和周期查看公开项目</h1>
        </section>
        <ProjectPreview expanded />
      </div>
    );
  }

  if (activePage === "publicEvents") {
    return (
      <div className="public-page-stack">
        <section className="public-subpage-heading">
          <p className="eyebrow">{pageTitle[activePage]}</p>
          <h1>说明会和讲座直接承接报名需求</h1>
        </section>
        <EventPreview expanded />
      </div>
    );
  }

  if (activePage === "faq") {
    return (
      <div className="public-page-stack">
        <section className="public-subpage-heading">
          <p className="eyebrow">{pageTitle[activePage]}</p>
          <h1>常见问题与客服 Agent</h1>
          <p>客服 Agent 面向公开官网和潜在客户，不暴露内部 CRM、审计、权限或接口调试信息。</p>
        </section>
        <FaqPreview expanded />
      </div>
    );
  }

  return (
    <div className="public-page-stack">
      <section className="public-subpage-heading">
        <p className="eyebrow">{pageTitle[activePage]}</p>
        <h1>提交咨询需求，进入顾问跟进流程</h1>
      </section>
      <ContactCard onNavigate={onNavigate} onLogin={onLogin} />
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
      {actionLabel && onAction ? (
        <button className="ghost-button" onClick={onAction}>
          {actionLabel}
          <ArrowRight size={13} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

function ServiceGrid({ expanded = false }: { expanded?: boolean }) {
  const rows = expanded ? publicServices : publicServices.slice(0, 3);
  return (
    <div className="public-card-grid">
      {rows.map((item) => (
        <article className="public-card">
          <strong>{item.title}</strong>
          <p>{item.desc}</p>
          <span>{item.audience}</span>
        </article>
      ))}
    </div>
  );
}

function ProjectPreview({ expanded = false }: { expanded?: boolean }) {
  const rows = expanded ? projectRows : projectRows.slice(0, 3);
  return (
    <div className="public-list">
      {rows.map((item) => (
        <article>
          <div>
            <strong>{item.name}</strong>
            <span>{item.country} / {item.category}</span>
          </div>
          <em>{item.status}</em>
          <p>{item.cost} · {item.cycle} · {item.tags.join(" / ")}</p>
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
        <article>
          <div>
            <strong>{item.name}</strong>
            <span>{item.type} / {item.target}</span>
          </div>
          <em>{item.status}</em>
          <p>{item.time} · 已报名 {item.signed}/{item.capacity}</p>
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
        <article>
          <HelpCircle size={17} aria-hidden="true" />
          <div>
            <strong>{item.question}</strong>
            <p>{item.answer}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function ContactCard({ onNavigate, onLogin }: { onNavigate: (page: PublicPageKey) => void; onLogin?: () => void }) {
  return (
    <section className="public-contact-card">
      <p className="eyebrow">联系咨询</p>
      <h2>把意向转成可跟进的客户线索</h2>
      <p>留下目标国家、当前阶段、预算和联系方式，由顾问在后台继续研判和跟进。</p>
      <div className="public-contact-grid">
        <span><Phone size={16} aria-hidden="true" /> 400-100-2026</span>
        <span><Mail size={16} aria-hidden="true" /> consult@example.com</span>
        <span><CalendarDays size={16} aria-hidden="true" /> 工作日 09:30-18:30</span>
      </div>
      <div className="public-form-preview">
        <label>
          <span>咨询方向</span>
          <input value="新加坡本科 / 德国双元制 / 语言提升" readOnly />
        </label>
        <label>
          <span>联系方式</span>
          <input value="手机 / 微信 / 邮箱" readOnly />
        </label>
      </div>
      <div className="public-actions">
        <button className="icon-button" onClick={() => onNavigate("contact")}>提交咨询</button>
        {onLogin ? <button className="ghost-button" onClick={onLogin}>登录后台</button> : null}
      </div>
    </section>
  );
}
