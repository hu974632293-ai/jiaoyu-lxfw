import { useEffect, useState } from "react";
import { ArrowRight, RefreshCw, Tags } from "lucide-react";
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
};

type ProjectRow = (typeof projectRows)[number] & {
  target?: string;
  desc?: string;
};

export default function ProjectsPage({ onNavigate }: PageProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<ProjectRow>(projectRows[0]);
  const [message, setMessage] = useState("正在加载真实项目接口...");

  async function load() {
    try {
      const data = await apiRequest<Project[]>("/api/projects");
      setProjects(data);
      setMessage(data.length ? "真实项目接口已加载，标签和推荐规则使用原型补充" : "真实接口暂无项目，展示原型项目");
    } catch (error) {
      setProjects([]);
      setMessage(error instanceof Error ? `真实项目接口失败：${error.message}` : "真实项目接口失败");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const rows: ProjectRow[] = projects.length
    ? projects.map((item, index) => ({
        ...projectRows[index % projectRows.length],
        name: item.project_name,
        country: item.country,
        category: item.category,
        target: item.target_audience,
        desc: item.description,
      }))
    : projectRows;

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">项目/课程管理</p>
          <h2>结构化项目资料，支撑画像推荐和二次转化</h2>
          <p>本页以真实项目列表为基础，暂用前端原型补足费用、周期、标签和推荐规则说明。</p>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={load}>
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
                <tr className={item.name === selected.name ? "selected-row" : ""} key={item.name} onClick={() => setSelected(item)}>
                  <td>
                    <strong>{item.name}</strong>
                    <span>{item.tags.join(" / ")}</span>
                  </td>
                  <td>{item.country}</td>
                  <td>{item.category}</td>
                  <td>{item.cost}</td>
                  <td>{item.cycle}</td>
                  <td>
                    <span className="badge">{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="panel-block detail-panel">
          <div className="section-title">
            <h3>{selected.name}</h3>
            <span className="status-pill success">推荐规则</span>
          </div>
          <dl className="detail-list">
            <div>
              <dt>适合人群</dt>
              <dd>{selected.target ?? "升学目标明确、家庭支持稳定、希望路径清晰的学生"}</dd>
            </div>
            <div>
              <dt>招生条件</dt>
              <dd>基础成绩达标，材料完整，语言能力可通过衔接课程补强。</dd>
            </div>
            <div>
              <dt>推荐说明</dt>
              <dd>当画像命中 {selected.tags.join("、")} 时，CRM 详情会展示项目命中理由和下一步建议。</dd>
            </div>
          </dl>
          <div className="tag-cloud">
            {selected.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
