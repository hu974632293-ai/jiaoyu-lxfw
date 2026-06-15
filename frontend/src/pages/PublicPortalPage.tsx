import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
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
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { apiRequest } from "../api/client";
import { eventPrototypeRows, projectRows, publicFaqs, publicServices, publicTrustPoints } from "../data/prototype";
import { publicNavItems } from "../navigation";
import type { PublicPageKey } from "../navigation";

type PublicPortalPageProps = {
  activePage: PublicPageKey;
  onNavigate: (page: PublicPageKey) => void;
  onLogin: () => void;
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

type PublicAgentScene = "customer_service" | "policy";

type PublicChatResult = {
  answer: string;
  scene_label: string;
  status: string;
  fallback_reason: string;
};

type PublicEventItem = {
  id: number;
  event_name: string;
  event_type: string;
  start_time: string;
  location: string;
  current_participants: number;
  max_participants: number;
  target_audience: string;
  speaker: string;
  status: string;
  description: string;
  checked_in_count: number;
};

type PublicEventRegistration = {
  id: number;
  lead_id: number | null;
  subject_name: string;
  contact_info: string;
  source_channel: string;
  status: string;
};
const publicAgentScenes: Array<{ key: PublicAgentScene; label: string; sample: string }> = [
  { key: "customer_service", label: "业务咨询", sample: "我想了解新加坡本科和德国双元制分别适合什么学生？" },
  { key: "policy", label: "政策问答", sample: "德国双元制通常需要提前准备哪些材料？" },
];

const aboutStoryPoints = [
  { title: "公开门户", desc: "面向家长、学生和合作方，解释公司、服务、项目、活动和 FAQ。" },
  { title: "顾问承接", desc: "官网咨询沉淀为可跟进线索，由顾问继续判断路径和项目匹配。" },
  { title: "学生服务", desc: "咨询之后继续覆盖申请进度、学业节点、反馈和生活支持。" },
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
          <button className="editorial-agent-bubble" onClick={() => onNavigate("faq")}>
            <Sparkles size={17} aria-hidden="true" />
            <span>客服 Agent 回答业务、政策、项目、活动和 FAQ。</span>
          </button>
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
            官网只展示方向性项目摘要，不伪造院校合作、录取率或真实案例。具体适配由顾问结合学生情况继续判断。
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

      <HomepageDecisionBoard onNavigate={onNavigate} />
    </div>
  );
}

function PublicSubPage({ activePage, onNavigate, onLogin }: PublicPortalPageProps) {
  if (activePage === "about") {
    return <AboutSubPage onNavigate={onNavigate} />;
  }

  if (activePage === "services") {
    return <ServicesSubPage onNavigate={onNavigate} />;
  }

  if (activePage === "publicProjects") {
    return <ProjectsSubPage onNavigate={onNavigate} />;
  }

  if (activePage === "publicEvents") {
    return <EventsSubPage onNavigate={onNavigate} />;
  }

  if (activePage === "faq") {
    return <FaqSubPage onNavigate={onNavigate} />;
  }

  return <ContactSubPage onNavigate={onNavigate} onLogin={onLogin} />;
}

function HomepageDecisionBoard({ onNavigate }: Pick<PublicPortalPageProps, "onNavigate">) {
  return (
    <section className="homepage-decision-board" aria-label="官网咨询转化路径">
      <div className="decision-board-heading">
        <div>
          <p className="eyebrow">下一步怎么选</p>
          <h2>先看方向和活动，再决定是否提交咨询。</h2>
        </div>
        <div className="decision-board-actions">
          <button className="ghost-button" onClick={() => onNavigate("faq")}>
            问客服 Agent
            <ArrowRight size={13} aria-hidden="true" />
          </button>
          <button className="icon-button" onClick={() => onNavigate("contact")}>
            预约顾问
            <ArrowRight size={13} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="decision-board-layout">
        <div className="decision-project-column">
          <span className="decision-column-label">PROJECT NOTES</span>
          {projectRows.slice(0, 3).map((item, index) => (
            <button key={item.name} className="decision-project-row" onClick={() => onNavigate("publicProjects")}>
              <b>{String(index + 1).padStart(2, "0")}</b>
              <span>
                <strong>{item.name}</strong>
                <em>{item.country} / {item.category} / {item.cycle}</em>
              </span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          ))}
        </div>

        <div className="decision-event-invite">
          <p className="eyebrow">近期活动</p>
          <h3>{eventPrototypeRows[0].name}</h3>
          <p>{eventPrototypeRows[0].time} · {eventPrototypeRows[0].target} · 已报名 {eventPrototypeRows[0].signed}/{eventPrototypeRows[0].capacity}</p>
          <div className="public-actions">
            <button className="icon-button secondary" onClick={() => onNavigate("publicEvents")}>查看活动</button>
            <button className="ghost-button" onClick={() => onNavigate("contact")}>联系报名</button>
          </div>
        </div>

        <div className="decision-agent-strip">
          <Sparkles size={19} aria-hidden="true" />
          <strong>还不确定方向？</strong>
          <p>先在 FAQ 里问客服 Agent。它只回答公开业务、政策、项目、活动和 FAQ，不展示内部 CRM 数据。</p>
          <button className="tiny-button" onClick={() => onNavigate("faq")}>进入知识/FAQ</button>
        </div>
      </div>
    </section>
  );
}

function AboutSubPage({ onNavigate }: Pick<PublicPortalPageProps, "onNavigate">) {
  return (
    <div className="public-subpage-editorial">
      <section className="subpage-hero about-hero">
        <div>
          <p className="eyebrow">企业介绍</p>
          <h1>我们做的不是把项目卖给家庭，而是把升学决策解释清楚。</h1>
          <p>官网只展示公开业务信息和咨询入口；客户资料、跟进记录、权限审计等内部信息仅在登录后台可见。</p>
          <div className="public-actions">
            <button className="icon-button" onClick={() => onNavigate("services")}>查看服务路径</button>
            <button className="ghost-button" onClick={() => onNavigate("faq")}>咨询客服 Agent</button>
          </div>
        </div>
        <aside className="subpage-kicker-panel">
          <NotebookPen size={20} aria-hidden="true" />
          <strong>服务边界</strong>
          <span>公开官网负责建立信任、解释服务和发起咨询；内部研判、CRM 跟进和系统治理必须登录后处理。</span>
        </aside>
      </section>

      <section className="story-lane" aria-label="官网服务结构">
        {aboutStoryPoints.map((item, index) => (
          <article key={item.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item.title}</strong>
            <p>{item.desc}</p>
          </article>
        ))}
      </section>

      <section className="subpage-split">
        <div className="editorial-section-copy">
          <p className="eyebrow">为什么先做官网</p>
          <h2>潜在客户先需要信任感，再需要功能入口。</h2>
        </div>
        <div className="clickable-feature-grid">
          <button onClick={() => onNavigate("publicProjects")}>
            <MapPinned size={18} aria-hidden="true" />
            <strong>项目方向</strong>
            <span>查看公开项目摘要</span>
          </button>
          <button onClick={() => onNavigate("publicEvents")}>
            <CalendarDays size={18} aria-hidden="true" />
            <strong>活动讲座</strong>
            <span>用说明会降低首次咨询成本</span>
          </button>
          <button onClick={() => onNavigate("contact")}>
            <Phone size={18} aria-hidden="true" />
            <strong>预约咨询</strong>
            <span>把意向转成可跟进线索</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function ServicesSubPage({ onNavigate }: Pick<PublicPortalPageProps, "onNavigate">) {
  return (
    <div className="public-subpage-editorial">
      <section className="subpage-hero services-hero">
        <div>
          <p className="eyebrow">业务服务</p>
          <h1>先判断家庭当前卡在哪里，再选择服务入口。</h1>
          <p>服务页不做功能堆叠，而是把升学规划、项目匹配、语言准备、背景提升和学生支持组织成可点击路径。</p>
        </div>
        <aside className="subpage-kicker-panel">
          <Search size={20} aria-hidden="true" />
          <strong>下一步建议</strong>
          <span>不确定选哪项时，先问客服 Agent 或预约一对一咨询。</span>
          <button className="ghost-button" onClick={() => onNavigate("faq")}>问客服 Agent</button>
        </aside>
      </section>

      <section className="service-route-grid" aria-label="服务入口">
        {publicServices.map((item) => (
          <article key={item.title}>
            <span>{item.audience}</span>
            <strong>{item.title}</strong>
            <p>{item.desc}</p>
            <div className="inline-actions">
              <button className="tiny-button" onClick={() => onNavigate("publicProjects")}>相关项目</button>
              <button className="tiny-button" onClick={() => onNavigate("contact")}>预约咨询</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function ProjectsSubPage({ onNavigate }: Pick<PublicPortalPageProps, "onNavigate">) {
  return (
    <div className="public-subpage-editorial">
      <section className="subpage-hero projects-hero">
        <div>
          <p className="eyebrow">项目/课程</p>
          <h1>项目先作为方向展示，真正适配需要顾问判断。</h1>
          <p>项目页只展示公开摘要，不伪造院校合作、录取率或真实案例。详细方案以顾问沟通和学生实际情况为准。</p>
        </div>
        <aside className="subpage-kicker-panel dark">
          <MapPinned size={20} aria-hidden="true" />
          <strong>全球项目地图</strong>
          <span>从国家、周期、预算和目标切入，帮助访客找到值得继续咨询的方向。</span>
        </aside>
      </section>

      <section className="project-passport-grid" aria-label="公开项目摘要">
        {projectRows.map((item) => (
          <article key={item.name}>
            <div>
              <span>{item.country} / {item.category}</span>
              <strong>{item.name}</strong>
            </div>
            <p>{item.cost} · {item.cycle}</p>
            <div className="tag-row">
              {item.tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
            <div className="inline-actions">
              <button className="tiny-button" onClick={() => onNavigate("contact")}>预约判断</button>
              <button className="tiny-button" onClick={() => onNavigate("publicEvents")}>相关活动</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function EventsSubPage({ onNavigate }: Pick<PublicPortalPageProps, "onNavigate">) {
  const [events, setEvents] = useState<PublicEventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [message, setMessage] = useState("正在加载活动");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastRegistration, setLastRegistration] = useState<PublicEventRegistration | null>(null);

  async function loadEvents() {
    try {
      const data = await apiRequest<PublicEventItem[]>("/api/events");
      setEvents(data);
      setSelectedEventId((current) => data.some((item) => item.id === current) ? current : data[0]?.id ?? null);
      setMessage(data.length ? "选择活动后可直接报名" : "暂无可报名活动");
    } catch (error) {
      setEvents([]);
      setSelectedEventId(null);
      setMessage(error instanceof Error ? `活动加载失败：${error.message}` : "活动加载失败");
    }
  }

  async function submitRegistration() {
    if (!selectedEventId) {
      setMessage("请先选择活动");
      return;
    }
    if (!subjectName.trim() || !contactInfo.trim()) {
      setMessage("请填写姓名和联系方式");
      return;
    }

    setIsSubmitting(true);
    setMessage("正在提交报名");
    try {
      const registration = await apiRequest<PublicEventRegistration>(`/api/events/${selectedEventId}/registrations`, {
        method: "POST",
        body: JSON.stringify({
          subject_type: "lead",
          subject_name: subjectName.trim(),
          contact_info: contactInfo.trim(),
          source_channel: "官网活动报名",
          operator_username: "public_portal",
        }),
      });
      setLastRegistration(registration);
      setMessage(`${registration.subject_name} 已报名，顾问会继续跟进`);
      setSubjectName("");
      setContactInfo("");
      await loadEvents();
    } catch (error) {
      setMessage(error instanceof Error ? `报名失败：${error.message}` : "报名失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <div className="public-subpage-editorial">
      <section className="subpage-hero events-hero">
        <div>
          <p className="eyebrow">活动/讲座</p>
          <h1>把第一次咨询前的疑问，放到说明会里先讲清楚。</h1>
          <p>活动用于承接潜在客户的低压力了解需求，报名后再由顾问继续跟进。</p>
        </div>
        <aside className="subpage-kicker-panel">
          <CalendarDays size={20} aria-hidden="true" />
          <strong>报名路径</strong>
          <span>看主题、确认适合人群、提交报名或预约顾问。</span>
          <button className="ghost-button" onClick={() => onNavigate("contact")}>预约顾问</button>
        </aside>
      </section>

      <section className="event-invitation-list" aria-label="活动列表">
        {events.map((item) => (
          <article key={item.id} className={selectedEventId === item.id ? "selected-row" : ""}>
            <span>{item.start_time.slice(5, 16).replace("T", " ")}</span>
            <div>
              <strong>{item.event_name}</strong>
              <p>{item.event_type} / {item.target_audience || "学生和家长"} / 已报名 {item.current_participants}/{item.max_participants}</p>
            </div>
            <button className="tiny-button" onClick={() => setSelectedEventId(item.id)}>{selectedEventId === item.id ? "已选择" : item.status}</button>
          </article>
        ))}
        {!events.length ? <div className="empty-state">{message}</div> : null}
      </section>

      <section className="public-contact-card">
        <p className="eyebrow">活动报名</p>
        <h2>留下联系方式，顾问继续承接</h2>
        <p>{message}</p>
        <div className="public-form-preview">
          <label>
            <span>姓名</span>
            <input value={subjectName} onChange={(event) => setSubjectName(event.target.value)} placeholder="请输入姓名" />
          </label>
          <label>
            <span>联系方式</span>
            <input value={contactInfo} onChange={(event) => setContactInfo(event.target.value)} placeholder="手机 / 微信 / 邮箱" />
          </label>
        </div>
        <button className="icon-button" onClick={submitRegistration} disabled={isSubmitting || !selectedEventId}>
          {isSubmitting ? "正在报名" : "提交活动报名"}
        </button>
        {lastRegistration?.lead_id ? (
          <div className="public-registration-result">
            线索 #{lastRegistration.lead_id} 已进入顾问队列
          </div>
        ) : null}
      </section>
    </div>
  );
}

function FaqSubPage({ onNavigate }: Pick<PublicPortalPageProps, "onNavigate">) {
  return (
    <div className="public-subpage-editorial">
      <section className="subpage-hero faq-hero">
        <div>
          <p className="eyebrow">知识/FAQ</p>
          <h1>高频问题先自助解决，复杂情况再交给顾问。</h1>
          <p>客服 Agent 面向公开官网和潜在客户，不暴露内部 CRM、审计、权限或内部技术信息。</p>
        </div>
        <PublicAgentPanel compact />
      </section>

      <section className="faq-answer-grid" aria-label="常见问题">
        {publicFaqs.map((item) => (
          <article key={item.question}>
            <HelpCircle size={18} aria-hidden="true" />
            <strong>{item.question}</strong>
            <p>{item.answer}</p>
            <button className="tiny-button" onClick={() => onNavigate("contact")}>继续咨询</button>
          </article>
        ))}
      </section>
    </div>
  );
}

function ContactSubPage({ onNavigate, onLogin }: Pick<PublicPortalPageProps, "onNavigate" | "onLogin">) {
  return (
    <div className="public-subpage-editorial">
      <section className="contact-consult-layout">
        <ContactCard onNavigate={onNavigate} onLogin={onLogin} />
        <PublicAgentPanel />
      </section>
    </div>
  );
}

function PublicAgentPanel({ compact = false }: { compact?: boolean }) {
  const [scene, setScene] = useState<PublicAgentScene>("customer_service");
  const [question, setQuestion] = useState(publicAgentScenes[0].sample);
  const [result, setResult] = useState<PublicChatResult | null>(null);
  const [message, setMessage] = useState("等待提问");

  function selectScene(nextScene: PublicAgentScene) {
    setScene(nextScene);
    const option = publicAgentScenes.find((item) => item.key === nextScene);
    if (option) {
      setQuestion(option.sample);
    }
  }

  async function askAgent() {
    if (!question.trim()) {
      setMessage("请先输入问题");
      return;
    }
    setMessage("正在调用客服 Agent...");
    try {
      const data = await apiRequest<PublicChatResult>("/api/knowledge/chat", {
        method: "POST",
        body: JSON.stringify({ scene, question, lead_id: null, conversation_id: null }),
      });
      setResult(data);
      setMessage(data.status === "success" ? "已返回回答" : "已提供参考回答");
    } catch (error) {
      setResult(null);
      setMessage(error instanceof Error ? `知识库调用失败：${error.message}` : "知识库调用失败");
    }
  }

  function handleAgentKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void askAgent();
    }
  }

  return (
    <section className={compact ? "public-agent-panel compact" : "public-agent-panel"}>
      <div className="agent-panel-heading">
        <span><Sparkles size={17} aria-hidden="true" /> 客服 Agent</span>
        <em>{message}</em>
      </div>
      <h2>先问清楚，再决定是否预约顾问。</h2>
      <div className="agent-scene-tabs">
        {publicAgentScenes.map((item) => (
          <button key={item.key} className={scene === item.key ? "active" : ""} onClick={() => selectScene(item.key)}>
            {item.label}
          </button>
        ))}
      </div>
      <textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={handleAgentKeyDown} rows={compact ? 3 : 4} />
      <button className="icon-button" onClick={askAgent}>
        <Send size={16} aria-hidden="true" />
        提问
      </button>
      {result ? (
        <article className="agent-answer">
          <strong>{result.scene_label || "客服咨询"}</strong>
          <p>{result.answer}</p>

        </article>
      ) : (
        <p className="agent-helper">可询问公司业务、留学政策、项目方向、活动报名和 FAQ。公开 Agent 不展示内部 CRM 数据。</p>
      )}
    </section>
  );
}

function ContactCard({ onLogin }: { onNavigate: (page: PublicPageKey) => void; onLogin?: () => void }) {
  const [customerName, setCustomerName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [consultationDirection, setConsultationDirection] = useState("新加坡本科 / 德国双元制 / 语言提升");
  const [consultationBackground, setConsultationBackground] = useState("");
  const [message, setMessage] = useState("留下姓名和联系方式，顾问会继续承接。");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastLead, setLastLead] = useState<{ id: number; customer_name: string; source_channel: string; owner_id: number | null } | null>(null);

  async function submitConsultation() {
    if (!customerName.trim() || !contactInfo.trim()) {
      setMessage("请填写姓名和联系方式");
      return;
    }

    setIsSubmitting(true);
    setMessage("正在提交咨询");
    try {
      const lead = await apiRequest<{ id: number; customer_name: string; source_channel: string; owner_id: number | null }>("/api/leads/public-consultations", {
        method: "POST",
        body: JSON.stringify({
          customer_name: customerName.trim(),
          contact_info: contactInfo.trim(),
          consultation_direction: consultationDirection.trim(),
          background_info: consultationBackground.trim(),
        }),
      });
      setLastLead(lead);
      setMessage(`${lead.customer_name} 已进入顾问队列`);
      setCustomerName("");
      setContactInfo("");
      setConsultationBackground("");
    } catch (error) {
      setMessage(error instanceof Error ? `咨询提交失败：${error.message}` : "咨询提交失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="public-contact-card">
      <p className="eyebrow">联系咨询</p>
      <h2>把意向转成可跟进的客户线索</h2>
      <p>{message}</p>
      <div className="public-contact-grid">
        <span><Phone size={16} aria-hidden="true" /> 400-100-2026</span>
        <span><Mail size={16} aria-hidden="true" /> consult@example.com</span>
        <span><CalendarDays size={16} aria-hidden="true" /> 工作日 09:30-18:30</span>
      </div>
      <div className="public-form-preview">
        <label>
          <span>姓名</span>
          <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="请输入姓名" />
        </label>
        <label>
          <span>联系方式</span>
          <input value={contactInfo} onChange={(event) => setContactInfo(event.target.value)} placeholder="手机 / 微信 / 邮箱" />
        </label>
        <label>
          <span>咨询方向</span>
          <input value={consultationDirection} onChange={(event) => setConsultationDirection(event.target.value)} placeholder="新加坡本科 / 德国双元制 / 语言提升" />
        </label>
        <label>
          <span>补充背景</span>
          <input value={consultationBackground} onChange={(event) => setConsultationBackground(event.target.value)} placeholder="当前年级 / 预算 / 想解决的问题" />
        </label>
      </div>
      <div className="public-actions">
        <button className="icon-button" onClick={submitConsultation} disabled={isSubmitting}>
          {isSubmitting ? "正在提交" : "提交咨询"}
        </button>
        {onLogin ? <button className="ghost-button" onClick={onLogin}>登录后台</button> : null}
      </div>
      {lastLead ? (
        <div className="public-registration-result">
          线索 #{lastLead.id} 已进入顾问队列
          <span>{lastLead.source_channel}</span>
        </div>
      ) : null}
    </section>
  );
}
