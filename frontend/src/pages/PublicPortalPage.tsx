import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Compass,
  HelpCircle,
  Mail,
  MapPinned,
  NotebookPen,
  Phone,
  Route,
  Sparkles,
} from "lucide-react";
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

const homepagePathSteps = [
  { no: "01", title: "了解目标", desc: "国家、预算、阶段、孩子当前状态" },
  { no: "02", title: "判断路径", desc: "升学、就业、语言或背景提升优先级" },
  { no: "03", title: "匹配项目", desc: "用公开项目摘要形成初步选择" },
  { no: "04", title: "顾问承接", desc: "提交咨询后进入一对一跟进" },
];

const homepageAtlasItems = [
  { title: "新加坡方向", desc: "本科衔接、短周期、家长咨询高频" },
  { title: "德国方向", desc: "双元制、语言准备、就业导向" },
  { title: "多国家支持", desc: "语言培训、背景提升、行前服务" },
];

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
              <button key={item.key} className={activePage === item.key ? "active" : ""} onClick={() => onNavigate(item.key)}>
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
    <div className="homepage-editorial">
      <section className="editorial-hero" aria-label="官网首页首屏">
        <div className="editorial-hero-copy">
          <p className="eyebrow">LXF STUDY PATH JOURNAL</p>
          <h1>把复杂升学选择，整理成一条家长和学生都看得懂的路线。</h1>
          <p>
            澜桥国际教育面向学生、家长和合作方，提供留学规划、国际本科、德国双元制、语言培训、背景提升和学生服务支持。官网只承接公开咨询与项目了解，内部跟进留在登录后的业务后台。
          </p>
          <div className="public-actions editorial-actions">
            <button className="icon-button" onClick={() => onNavigate("contact")}>
              预约一对一咨询
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button className="icon-button secondary" onClick={() => onNavigate("publicProjects")}>
              查看项目方向
            </button>
            <button className="ghost-button" onClick={onLogin}>
              登录后台
            </button>
          </div>
          <div className="editorial-proof-row" aria-label="官网信任提示">
            <span>规划评估</span>
            <span>项目匹配</span>
            <span>活动报名</span>
            <span>学生服务</span>
          </div>
        </div>

        <aside className="editorial-hero-scene" aria-label="升学路径视觉">
          <div className="editorial-photo-frame" />
          <div className="editorial-note-card">
            <NotebookPen size={18} aria-hidden="true" />
            <strong>顾问手记</strong>
            <span>先判断路径是否适合，再讨论项目和材料。</span>
          </div>
          <div className="editorial-agent-bubble">
            <Sparkles size={17} aria-hidden="true" />
            <span>客服 Agent 回答业务、政策、项目、活动和 FAQ。</span>
          </div>
          <div className="editorial-route-card">
            {homepagePathSteps.map((step) => (
              <article key={step.no}>
                <b>{step.no}</b>
                <strong>{step.title}</strong>
                <span>{step.desc}</span>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="editorial-journey" aria-label="咨询路径">
        <div className="editorial-section-copy">
          <p className="eyebrow">咨询不是填表结束</p>
          <h2>我们先把家庭决策拆开，再把下一步交给顾问承接。</h2>
        </div>
        <div className="journey-rail">
          {publicTrustPoints.map((item, index) => (
            <article key={item.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <CheckCircle2 size={18} aria-hidden="true" />
              <strong>{item.title}</strong>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="editorial-services" aria-label="核心服务">
        <div className="editorial-section-copy">
          <p className="eyebrow">核心服务</p>
          <h2>不是把项目摆满，而是帮你判断哪条路值得继续看。</h2>
        </div>
        <div className="service-ledger">
          {publicServices.slice(0, 4).map((item) => (
            <article key={item.title}>
              <span>{item.audience}</span>
              <strong>{item.title}</strong>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
        <button className="ghost-button editorial-link-button" onClick={() => onNavigate("services")}>
          查看全部服务
          <ArrowRight size={13} aria-hidden="true" />
        </button>
      </section>

      <section className="global-atlas" aria-label="全球项目地图">
        <div className="atlas-copy">
          <p className="eyebrow">GLOBAL ATLAS</p>
          <h2>从目标目的地，展开一套升学方案。</h2>
          <p>
            当前官网只展示方向性项目摘要，不伪造院校合作、录取率或真实案例。后续项目库丰富后，这里可以升级成完整的项目探索地图。
          </p>
          <button className="icon-button secondary" onClick={() => onNavigate("publicProjects")}>
            查看公开项目
            <MapPinned size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="atlas-visual" aria-hidden="true">
          <span className="atlas-pin one" />
          <span className="atlas-pin two" />
          <span className="atlas-pin three" />
          <div className="atlas-orbit" />
          <Compass className="atlas-compass" size={74} />
        </div>
        <div className="atlas-items">
          {homepageAtlasItems.map((item) => (
            <article key={item.title}>
              <Route size={17} aria-hidden="true" />
              <strong>{item.title}</strong>
              <span>{item.desc}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="homepage-conversion-board" aria-label="项目活动和咨询转化">
        <div className="homepage-featured-list">
          <SectionHeader eyebrow="项目摘要" title="先看方向，再预约顾问判断" actionLabel="查看项目" onAction={() => onNavigate("publicProjects")} />
          <ProjectPreview />
        </div>
        <div className="homepage-featured-list">
          <SectionHeader eyebrow="近期活动" title="用说明会降低第一次咨询成本" actionLabel="活动报名" onAction={() => onNavigate("publicEvents")} />
          <EventPreview />
        </div>
      </section>

      <section className="homepage-final-row">
        <div>
          <SectionHeader eyebrow="FAQ" title="先回答高频问题，复杂情况再交给顾问" actionLabel="更多 FAQ" onAction={() => onNavigate("faq")} />
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
        <article className="public-card" key={item.title}>
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
        <article key={item.name}>
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
        <article key={item.name}>
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
        <article key={item.question}>
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
