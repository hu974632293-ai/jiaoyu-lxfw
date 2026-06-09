import { useEffect, useMemo, useState } from "react";
import { CheckSquare, RefreshCw, UserPlus } from "lucide-react";
import { apiRequest } from "../api/client";
import type { PageProps } from "../App";
import { eventPrototypeRows } from "../data/prototype";

type EventItem = {
  id: number;
  event_name: string;
  event_type: string;
  start_time: string;
  location: string;
  current_participants: number;
  max_participants: number;
};

export default function EventsPage({ onNavigate }: PageProps) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedId, setSelectedId] = useState(0);
  const [message, setMessage] = useState("正在加载真实活动...");
  const [checkedNames, setCheckedNames] = useState<string[]>(["王晨"]);

  async function load() {
    setMessage("正在刷新真实活动...");
    try {
      const data = await apiRequest<EventItem[]>("/api/events");
      setEvents(data);
      setSelectedId(data[0]?.id ?? 0);
      setMessage(data.length ? "真实活动接口已加载" : "真实接口暂无活动，展示原型活动");
    } catch (error) {
      setEvents([]);
      setMessage(error instanceof Error ? `真实活动接口失败：${error.message}` : "真实活动接口失败");
    }
  }

  async function register(eventId: number) {
    setMessage("正在调用真实活动报名接口...");
    try {
      await apiRequest(`/api/events/${eventId}/registrations`, {
        method: "POST",
        body: JSON.stringify({ lead_id: 1 }),
      });
      setMessage("已通过真实 API 为 1 号客户报名");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? `报名失败：${error.message}` : "报名失败");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(
    () =>
      events.length
        ? events.map((item, index) => ({
            id: item.id,
            name: item.event_name,
            type: item.event_type,
            time: item.start_time.slice(5, 16).replace("T", " "),
            target: eventPrototypeRows[index % eventPrototypeRows.length].target,
            signed: item.current_participants,
            capacity: item.max_participants,
            status: eventPrototypeRows[index % eventPrototypeRows.length].status,
            location: item.location,
          }))
        : eventPrototypeRows.map((item, index) => ({ ...item, id: index + 1, location: "线上/校区" })),
    [events],
  );

  const selected = rows.find((item) => item.id === selectedId) ?? rows[0];
  const roster = [
    { name: "王晨", type: "线索", status: checkedNames.includes("王晨") ? "已签到" : "已报名" },
    { name: "陈雨", type: "学生", status: checkedNames.includes("陈雨") ? "已签到" : "已报名" },
    { name: "刘欣", type: "线索", status: checkedNames.includes("刘欣") ? "已签到" : "待确认" },
  ];

  function checkIn(name: string) {
    setCheckedNames((items) => (items.includes(name) ? items : [...items, name]));
    setMessage(`${name} 已在前端原型名单中签到，真实签到 API 后续阶段实现`);
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">活动运营</p>
          <h2>活动创建、报名名单和签到闭环</h2>
          <p>活动列表和线索报名继续调用真实 API；学生报名、签到和名单详情先用原型数据表达。</p>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={load}>
            <RefreshCw size={16} aria-hidden="true" />
            刷新活动
          </button>
          <button className="icon-button" onClick={() => onNavigate("reports")}>
            生成活动报告
          </button>
        </div>
      </section>

      <section className="toolbar">
        <span className="status-pill">{message}</span>
        <span className="status-pill success">支持线索和学生两类主体</span>
      </section>

      <section className="crm-layout">
        <div className="panel-block table-panel">
          <table>
            <thead>
              <tr>
                <th>活动</th>
                <th>类型</th>
                <th>时间</th>
                <th>适合对象</th>
                <th>人数</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr className={item.id === selected?.id ? "selected-row" : ""} key={item.id} onClick={() => setSelectedId(item.id)}>
                  <td>
                    <strong>{item.name}</strong>
                    <span>{item.location}</span>
                  </td>
                  <td>{item.type}</td>
                  <td>{item.time}</td>
                  <td>{item.target}</td>
                  <td>
                    {item.signed}/{item.capacity}
                  </td>
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
            <h3>{selected?.name ?? "暂无活动"}</h3>
            <span className="status-pill success">名单与签到</span>
          </div>
          <div className="inline-actions">
            <button onClick={() => selected && register(selected.id)}>
              <UserPlus size={15} aria-hidden="true" />
              为 1 号线索报名
            </button>
            <button className="ghost-button" onClick={() => setMessage("已添加学生陈雨到前端原型报名名单")}>添加学生报名</button>
          </div>
          <div className="roster-list">
            {roster.map((item) => (
              <article key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {item.type} / {item.status}
                  </span>
                </div>
                <button className="tiny-button" onClick={() => checkIn(item.name)}>
                  <CheckSquare size={14} aria-hidden="true" />
                  签到
                </button>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
