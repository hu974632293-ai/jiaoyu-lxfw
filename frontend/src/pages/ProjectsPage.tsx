import { useEffect, useMemo, useState } from "react";
import { ArrowRight, RefreshCw, Save, Tags } from "lucide-react";
import { apiRequest } from "../api/client";
import type { PageProps } from "../App";
import { projectRows } from "../data/prototype";

type Project = {
  id: number;
  project_name: string;
  country: string;
  category: string;
  target_audience: string;
  description: string;
  selling_points: string[];
  cost_range: string;
  duration: string;
  admission_requirements: string;
  tags: string[];
  recommendation_rule: string;
  knowledge_source: string;
  status: string;
};

type Recommendation = {
  project_id: number;
  project_name: string;
  matched_tags: string[];
  match_score: number;
  recommendation_rule: string;
};

type ProjectForm = {
  project_name: string;
  country: string;
  category: string;
  target_audience: string;
  description: string;
  cost_range: string;
  duration: string;
  admission_requirements: string;
  tagsText: string;
  sellingPointsText: string;
  recommendation_rule: string;
  knowledge_source: string;
  status: string;
};

const defaultForm: ProjectForm = {
  project_name: "阶段四项目管理测试计划",
  country: "新加坡",
  category: "升学规划",
  target_audience: "高中毕业生、专科升学人群",
  description: "用于演示项目/课程真实 API 维护闭环。",
  cost_range: "12-18 万/年",
  duration: "2-4 年",
  admission_requirements: "基础成绩达标，材料完整，可参加语言衔接。",
  tagsText: "升学、低风险、短学制",
  sellingPointsText: "低风险、短学制、学历可认证",
  recommendation_rule: "当客户关注升学、短学制和低风险时优先推荐。",
  knowledge_source: "项目课程手册",
  status: "招生中",
};

function splitTextList(raw: string) {
  return raw
    .split(/[、,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formFromProject(project: Project): ProjectForm {
  return {
    project_name: project.project_name,
    country: project.country,
    category: project.category,
    target_audience: project.target_audience,
    description: project.description,
    cost_range: project.cost_range,
    duration: project.duration,
    admission_requirements: project.admission_requirements,
    tagsText: project.tags.join("、"),
    sellingPointsText: project.selling_points.join("、"),
    recommendation_rule: project.recommendation_rule,
    knowledge_source: project.knowledge_source,
    status: project.status,
  };
}

function projectPayload(form: ProjectForm) {
  return {
    project_name: form.project_name,
    country: form.country,
    category: form.category,
    target_audience: form.target_audience,
    description: form.description,
    cost_range: form.cost_range,
    duration: form.duration,
    admission_requirements: form.admission_requirements,
    tags: splitTextList(form.tagsText),
    selling_points: splitTextList(form.sellingPointsText),
    recommendation_rule: form.recommendation_rule,
    knowledge_source: form.knowledge_source,
    status: form.status,
    operator_username: "admin",
  };
}

export default function ProjectsPage({ onNavigate }: PageProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<ProjectForm>(defaultForm);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [message, setMessage] = useState("正在加载真实项目接口...");

  async function load(nextSelectedId = selectedId) {
    try {
      const data = await apiRequest<Project[]>("/api/projects");
      setProjects(data);
      const nextSelected = data.find((item) => item.id === nextSelectedId) ?? data[0];
      if (nextSelected) {
        setSelectedId(nextSelected.id);
        setForm(formFromProject(nextSelected));
      }
      setMessage(data.length ? "真实项目接口已加载" : "真实接口暂无项目，可用右侧表单创建");
    } catch (error) {
      setProjects([]);
      setMessage(error instanceof Error ? `真实项目接口失败：${error.message}` : "真实项目接口失败");
    }
  }

  async function loadRecommendations(tagsText = form.tagsText) {
    const query = splitTextList(tagsText).map((tag) => `tags=${encodeURIComponent(tag)}`).join("&");
    try {
      const data = await apiRequest<Recommendation[]>(`/api/projects/recommendations${query ? `?${query}` : ""}`);
      setRecommendations(data);
    } catch {
      setRecommendations([]);
    }
  }

  async function saveProject() {
    if (!form.project_name.trim()) {
      setMessage("请先填写项目名称");
      return;
    }
    setMessage(selectedId ? "正在更新真实项目..." : "正在创建真实项目...");
    try {
      const payload = projectPayload(form);
      const saved = selectedId
        ? await apiRequest<Project>(`/api/projects/${selectedId}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await apiRequest<Project>("/api/projects", { method: "POST", body: JSON.stringify(payload) });
      setSelectedId(saved.id);
      setMessage(selectedId ? "项目已更新，并写入审计日志" : "项目已创建，并写入审计日志");
      await load(saved.id);
      await loadRecommendations(form.tagsText);
    } catch (error) {
      setMessage(error instanceof Error ? `项目保存失败：${error.message}` : "项目保存失败");
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadRecommendations(form.tagsText);
  }, [form.tagsText]);

  const selected = useMemo(() => projects.find((item) => item.id === selectedId) ?? projects[0], [projects, selectedId]);
  const rows = projects.length
    ? projects
    : projectRows.map((item, index) => ({
        id: index + 1,
        project_name: item.name,
        country: item.country,
        category: item.category,
        target_audience: "升学目标明确、家庭支持稳定、希望路径清晰的学生",
        description: item.name,
        selling_points: item.tags,
        cost_range: item.cost,
        duration: item.cycle,
        admission_requirements: "基础成绩达标，材料完整，语言能力可通过衔接课程补强。",
        tags: item.tags,
        recommendation_rule: `当画像命中 ${item.tags.join("、")} 时优先推荐。`,
        knowledge_source: "前端原型数据",
        status: item.status,
      }));

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">项目/课程管理</p>
          <h2>结构化项目资料，支撑画像推荐和二次转化</h2>
          <p>项目列表、详情、费用周期、招生条件、标签和推荐规则已接入真实后端。</p>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={() => load()}>
            <RefreshCw size={16} aria-hidden="true" />
            刷新项目
          </button>
          <button className="icon-button" onClick={() => onNavigate("crm")}>
            <ArrowRight size={16} aria-hidden="true" />
            查看相关客户
          </button>
        </div>
      </section>

      <section className="toolbar">
        <Tags size={16} aria-hidden="true" />
        <span className="status-pill">{message}</span>
        <span className="status-pill success">画像推荐可引用标签</span>
      </section>

      <section className="crm-layout">
        <div className="panel-block table-panel">
          <table>
            <thead>
              <tr>
                <th>项目名称</th>
                <th>国家</th>
                <th>类别</th>
                <th>费用区间</th>
                <th>周期</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr
                  className={item.id === selected?.id ? "selected-row" : ""}
                  key={item.id}
                  onClick={() => {
                    setSelectedId(item.id);
                    setForm(formFromProject(item));
                  }}
                >
                  <td>
                    <strong>{item.project_name}</strong>
                    <span>{item.tags.join(" / ")}</span>
                  </td>
                  <td>{item.country}</td>
                  <td>{item.category}</td>
                  <td>{item.cost_range || "-"}</td>
                  <td>{item.duration || "-"}</td>
                  <td>
                    <span className="badge">{item.status || "招生中"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="panel-block detail-panel">
          <div className="section-title">
            <h3>{selected?.project_name ?? "新项目"}</h3>
            <span className="status-pill success">推荐规则</span>
          </div>
          <dl className="detail-list">
            <div>
              <dt>适合人群</dt>
              <dd>{selected?.target_audience || "创建或选择项目后展示"}</dd>
            </div>
            <div>
              <dt>招生条件</dt>
              <dd>{selected?.admission_requirements || "暂无招生条件"}</dd>
            </div>
            <div>
              <dt>推荐说明</dt>
              <dd>{selected?.recommendation_rule || "根据项目标签和客户画像标签匹配推荐。"}</dd>
            </div>
            <div>
              <dt>知识来源</dt>
              <dd>{selected?.knowledge_source || "暂无关联知识来源"}</dd>
            </div>
          </dl>
          <div className="tag-cloud">
            {(selected?.tags.length ? selected.tags : splitTextList(form.tagsText)).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </aside>
      </section>

      <section className="split-layout secondary">
        <div className="panel-block">
          <div className="section-title">
            <h3>项目维护</h3>
            <button className="tiny-button" onClick={() => { setSelectedId(null); setForm(defaultForm); }}>
              新建项目
            </button>
          </div>
          <label className="stacked-input">
            <span>项目名称</span>
            <input value={form.project_name} onChange={(event) => setForm({ ...form, project_name: event.target.value })} />
          </label>
          <label className="stacked-input">
            <span>国家 / 类别</span>
            <input value={`${form.country} / ${form.category}`} onChange={(event) => {
              const [country = "", category = ""] = event.target.value.split("/");
              setForm({ ...form, country: country.trim(), category: category.trim() });
            }} />
          </label>
          <label className="stacked-input">
            <span>费用区间 / 周期</span>
            <input value={`${form.cost_range} / ${form.duration}`} onChange={(event) => {
              const [costRange = "", duration = ""] = event.target.value.split("/");
              setForm({ ...form, cost_range: costRange.trim(), duration: duration.trim() });
            }} />
          </label>
          <label className="stacked-input">
            <span>标签</span>
            <input value={form.tagsText} onChange={(event) => setForm({ ...form, tagsText: event.target.value })} />
          </label>
          <label className="stacked-input">
            <span>适合人群</span>
            <textarea value={form.target_audience} onChange={(event) => setForm({ ...form, target_audience: event.target.value })} rows={2} />
          </label>
          <label className="stacked-input">
            <span>招生条件</span>
            <textarea value={form.admission_requirements} onChange={(event) => setForm({ ...form, admission_requirements: event.target.value })} rows={2} />
          </label>
          <label className="stacked-input">
            <span>推荐规则</span>
            <textarea value={form.recommendation_rule} onChange={(event) => setForm({ ...form, recommendation_rule: event.target.value })} rows={2} />
          </label>
          <button className="icon-button" onClick={saveProject}>
            <Save size={16} aria-hidden="true" />
            保存项目
          </button>
        </div>

        <div className="panel-block">
          <div className="section-title">
            <h3>标签推荐结果</h3>
            <span>{recommendations.length} 个匹配</span>
          </div>
          <div className="task-list">
            {recommendations.map((item) => (
              <article className="task-row" key={item.project_id}>
                <div>
                  <strong>{item.project_name}</strong>
                  <span>{item.recommendation_rule}</span>
                </div>
                <em>{item.matched_tags.join("、") || "全部"}</em>
              </article>
            ))}
            {!recommendations.length && <div className="empty-state">当前标签暂无推荐结果。</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
