import { useEffect, useMemo, useState } from "react";
import { CheckSquare, Plus, RefreshCw, Save, UserPlus } from "lucide-react";
import { apiRequest } from "../api/client";
import { OperationFeedback, type OperationFeedbackState } from "../components/OperationFeedback";
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
  target_audience: string;
  speaker: string;
  status: string;
  description: string;
  checked_in_count: number;
};

type Registration = {
  id: number;
  registration_id: number;
  event_id: number;
  lead_id: number | null;
  subject_type: "lead" | "student";
  subject_id: number | null;
  subject_name: string;
  contact_info: string;
  source_channel: string;
  status: string;
  checked_in_at: string | null;
  created_at: string | null;
};

type EventForm = {
  event_name: string;
  event_type: string;
  start_time: string;
  location: string;
  max_participants: number;
  target_audience: string;
  speaker: string;
  status: string;
  description: string;
};

type RegistrationForm = {
  subject_type: "lead" | "student";
  subject_id: number;
  subject_name: string;
  contact_info: string;
  source_channel: string;
};
type EventOperation = "load" | "save" | "register" | "checkIn" | "roster" | null;

const defaultEventForm: EventForm = {
  event_name: "阶段五活动运营测试说明会",
  event_type: "线上讲座",
  start_time: "2026-07-01T19:30",
  location: "腾讯会议",
  max_participants: 30,
  target_audience: "线索客户、在读学生",
  speaker: "升学规划顾问",
  status: "已发布",
  description: "面向客户和学生的升学政策与服务说明。",
};

const defaultRegistrationForm: RegistrationForm = {
  subject_type: "lead",
  subject_id: 1,
  subject_name: "王晨",
  contact_info: "13800000001",
  source_channel: "CRM邀约",
};

function toInputDateTime(value: string) {
  return value ? value.slice(0, 16) : "";
}

function eventPayload(form: EventForm) {
  return {
    ...form,
    start_time: form.start_time.length === 16 ? `${form.start_time}:00` : form.start_time,
    operator_username: "admin",
  };
}

function registrationPayload(form: RegistrationForm) {
  return {
    subject_type: form.subject_type,
    subject_id: Number(form.subject_id),
    lead_id: form.subject_type === "lead" ? Number(form.subject_id) : undefined,
    subject_name: form.subject_name,
    contact_info: form.contact_info,
    source_channel: form.source_channel,
    operator_username: "admin",
  };
}

function formFromEvent(event: EventItem): EventForm {
  return {
    event_name: event.event_name,
    event_type: event.event_type,
    start_time: toInputDateTime(event.start_time),
    location: event.location,
    max_participants: event.max_participants,
    target_audience: event.target_audience,
    speaker: event.speaker,
    status: event.status,
    description: event.description,
  };
}

function formatOperationTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

export default function EventsPage({ onNavigate }: PageProps) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [eventForm, setEventForm] = useState<EventForm>(defaultEventForm);
  const [registrationForm, setRegistrationForm] = useState<RegistrationForm>(defaultRegistrationForm);
  const [message, setMessage] = useState("正在加载活动...");
  const [operationFeedback, setOperationFeedback] = useState<OperationFeedbackState>({
    phase: "pending",
    title: "正在加载活动",
    detail: "读取活动列表、报名名单和签到状态。",
    target: "活动运营",
  });
  const [pendingOperation, setPendingOperation] = useState<EventOperation>("load");
  const [highlightEventId, setHighlightEventId] = useState<number | null>(null);
  const [highlightRegistrationId, setHighlightRegistrationId] = useState<number | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);

  async function load(nextSelectedId = selectedId) {
    setMessage("正在刷新活动...");
    setPendingOperation("load");
    setOperationFeedback({
      phase: "pending",
      title: "正在刷新活动列表",
      detail: "读取活动列表，并刷新选中活动的报名名单。",
      target: "活动列表",
    });
    try {
      const data = await apiRequest<EventItem[]>("/api/events");
      setEvents(data);
      setIsFallback(false);
      const nextSelected = data.find((item) => item.id === nextSelectedId) ?? data[0];
      if (nextSelected) {
        setSelectedId(nextSelected.id);
        setEventForm(formFromEvent(nextSelected));
        await loadRegistrations(nextSelected.id);
      } else {
        setSelectedId(null);
        setRegistrations([]);
      }
      setMessage(data.length ? "活动列表已加载" : "当前暂无活动，可用表单创建");
      setOperationFeedback({
        phase: data.length ? "success" : "pending",
        title: data.length ? "活动列表已刷新" : "当前暂无活动，可用表单创建",
        detail: `当前列表显示 ${data.length || eventPrototypeRows.length} 个活动。`,
        target: "活动列表",
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setEvents([]);
      setRegistrations([]);
      setSelectedId(null);
      setIsFallback(true);
      setMessage(error instanceof Error ? `活动列表刷新失败：${error.message}` : "活动列表刷新失败");
      setOperationFeedback({
        phase: "error",
        title: "活动列表刷新失败",
        detail: error instanceof Error ? `${error.message}。请稍后重试。` : "接口不可用。请稍后重试。",
        target: "活动列表",
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function loadRegistrations(eventId = selectedId) {
    if (!eventId) {
      setRegistrations([]);
      return;
    }
    setPendingOperation("roster");
    setOperationFeedback({
      phase: "pending",
      title: "正在刷新报名名单",
      detail: `读取活动 #${eventId} 的报名和签到状态。`,
      target: `活动 #${eventId}`,
    });
    setIsLoadingRoster(true);
    try {
      const data = await apiRequest<Registration[]>(`/api/events/${eventId}/registrations`);
      setRegistrations(data);
      setOperationFeedback({
        phase: "success",
        title: "报名名单已刷新",
        detail: `当前活动共有 ${data.length} 条报名记录。`,
        target: `活动 #${eventId}`,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setRegistrations([]);
      setMessage(error instanceof Error ? `报名名单加载失败：${error.message}` : "报名名单加载失败");
      setOperationFeedback({
        phase: "error",
        title: "报名名单加载失败",
        detail: error instanceof Error ? `${error.message}。可稍后重试。` : "请稍后重试。",
        target: `活动 #${eventId}`,
        timestamp: formatOperationTime(),
      });
    } finally {
      setIsLoadingRoster(false);
      setPendingOperation(null);
    }
  }

  async function saveEvent() {
    if (!eventForm.event_name.trim()) {
      setMessage("请先填写活动名称");
      setOperationFeedback({
        phase: "error",
        title: "活动未保存",
        detail: "请先填写活动名称。表单内容已保留，可补充后重试。",
        target: "活动维护表单",
        timestamp: formatOperationTime(),
      });
      return;
    }
    setMessage(selectedId && events.some((item) => item.id === selectedId) ? "正在更新活动..." : "正在创建活动...");
    setPendingOperation("save");
    setOperationFeedback({
      phase: "pending",
      title: selectedId && events.some((item) => item.id === selectedId) ? "正在更新活动" : "正在创建活动",
      detail: `活动名称：${eventForm.event_name.trim()}。`,
      target: eventForm.event_name.trim(),
    });
    try {
      const saved = selectedId && events.some((item) => item.id === selectedId)
        ? await apiRequest<EventItem>(`/api/events/${selectedId}`, { method: "PATCH", body: JSON.stringify(eventPayload(eventForm)) })
        : await apiRequest<EventItem>("/api/events", { method: "POST", body: JSON.stringify(eventPayload(eventForm)) });
      setSelectedId(saved.id);
      setHighlightEventId(saved.id);
      setMessage("活动已保存，并写入审计日志");
      await load(saved.id);
      setOperationFeedback({
        phase: "success",
        title: "活动已保存",
        detail: "已写入审计日志，并在活动列表中选中高亮。",
        target: `${saved.event_name} / #${saved.id}`,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setMessage(error instanceof Error ? `活动保存失败：${error.message}` : "活动保存失败");
      setOperationFeedback({
        phase: "error",
        title: "活动保存失败",
        detail: error instanceof Error ? `${error.message}。表单内容已保留，可重试。` : "表单内容已保留，可重试。",
        target: eventForm.event_name.trim(),
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function register() {
    if (!selectedId) {
      setMessage("请先选择或创建活动");
      setOperationFeedback({
        phase: "error",
        title: "报名未提交",
        detail: "请先选择或创建活动。报名表单内容已保留。",
        target: registrationForm.subject_name,
        timestamp: formatOperationTime(),
      });
      return;
    }
    if (!registrationForm.subject_name.trim()) {
      setMessage("请先填写报名人姓名");
      setOperationFeedback({
        phase: "error",
        title: "报名未提交",
        detail: "请先填写报名人姓名。报名表单内容已保留。",
        target: `活动 #${selectedId}`,
        timestamp: formatOperationTime(),
      });
      return;
    }
    setMessage("正在提交活动报名...");
    setPendingOperation("register");
    setOperationFeedback({
      phase: "pending",
      title: "正在提交活动报名",
      detail: `报名人：${registrationForm.subject_name.trim()}。成功后会刷新名单。`,
      target: `活动 #${selectedId}`,
    });
    try {
      const created = await apiRequest<Registration>(`/api/events/${selectedId}/registrations`, {
        method: "POST",
        body: JSON.stringify(registrationPayload(registrationForm)),
      });
      setHighlightRegistrationId(created.id);
      setMessage(`${registrationForm.subject_name} 已报名，并写入审计日志`);
      await load(selectedId);
      setOperationFeedback({
        phase: "success",
        title: "活动报名已提交",
        detail: "报名记录已写入审计日志，并在名单中高亮。",
        target: `${registrationForm.subject_name} / #${created.id}`,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setMessage(error instanceof Error ? `报名失败：${error.message}` : "报名失败");
      setOperationFeedback({
        phase: "error",
        title: "活动报名失败",
        detail: error instanceof Error ? `${error.message}。报名表单内容已保留，可重试。` : "报名表单内容已保留，可重试。",
        target: registrationForm.subject_name,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  async function checkIn(registrationId: number) {
    if (!selectedId) {
      return;
    }
    setMessage("正在提交签到...");
    setPendingOperation("checkIn");
    setOperationFeedback({
      phase: "pending",
      title: "正在提交活动签到",
      detail: `正在更新报名记录 #${registrationId}。`,
      target: `报名 #${registrationId}`,
    });
    try {
      await apiRequest<Registration>(`/api/events/${selectedId}/check-ins`, {
        method: "POST",
        body: JSON.stringify({ registration_id: registrationId, operator_username: "admin" }),
      });
      setHighlightRegistrationId(registrationId);
      setMessage("签到完成，并写入审计日志");
      await load(selectedId);
      setOperationFeedback({
        phase: "success",
        title: "签到完成",
        detail: "签到记录已写入审计日志，并在名单中高亮。",
        target: `报名 #${registrationId}`,
        timestamp: formatOperationTime(),
      });
    } catch (error) {
      setMessage(error instanceof Error ? `签到失败：${error.message}` : "签到失败");
      setOperationFeedback({
        phase: "error",
        title: "签到失败",
        detail: error instanceof Error ? `${error.message}。报名状态未改动，可重试。` : "报名状态未改动，可重试。",
        target: `报名 #${registrationId}`,
        timestamp: formatOperationTime(),
      });
    } finally {
      setPendingOperation(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const selected = useMemo(() => events.find((item) => item.id === selectedId) ?? events[0], [events, selectedId]);
  const hasPendingOperation = pendingOperation !== null;
  const isLoading = pendingOperation === "load";
  const isSaving = pendingOperation === "save";
  const isRegistering = pendingOperation === "register";
  const isCheckingIn = pendingOperation === "checkIn";
  const rows = events.length
    ? events.map((item) => ({
        id: item.id,
        name: item.event_name,
        type: item.event_type,
        time: item.start_time.slice(5, 16).replace("T", " "),
        target: item.target_audience || "线索/学生",
        signed: item.current_participants,
        capacity: item.max_participants,
        status: item.status,
        location: item.location,
        checked: item.checked_in_count,
      }))
    : eventPrototypeRows.map((item, index) => ({ ...item, id: index + 1, location: "线上/校区", checked: index }));

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">活动运营</p>
          <h2>活动创建、报名名单和签到闭环</h2>
          <p>统一维护活动、报名名单、签到状态和顾问承接。</p>
        </div>
        <div className="heading-actions">
          <button className="icon-button secondary" onClick={() => load()} disabled={hasPendingOperation}>
            <RefreshCw className={isLoading ? "spin-icon" : ""} size={16} aria-hidden="true" />
            {isLoading ? "正在刷新" : "刷新活动列表"}
          </button>
          <button className="icon-button" onClick={() => onNavigate("reports")}>
            生成活动报告
          </button>
        </div>
      </section>

      <section className="toolbar">
        <OperationFeedback feedback={operationFeedback} />
        <span className="status-pill success">支持线索和学生两类主体</span>
        {!events.length && !isFallback && <span className="status-pill warning">当前暂无活动</span>}
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
                <th>报名/签到</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr
                  className={`${item.id === selected?.id ? "selected-row" : ""} ${highlightEventId === item.id ? "is-highlighted" : ""}`}
                  key={item.id}
                  onClick={() => {
                    setSelectedId(item.id);
                    const event = events.find((candidate) => candidate.id === item.id);
                    if (event) {
                      setEventForm(formFromEvent(event));
                      loadRegistrations(event.id);
                    }
                  }}
                >
                  <td>
                    <strong>{item.name}</strong>
                    <span>{item.location}</span>
                  </td>
                  <td>{item.type}</td>
                  <td>{item.time}</td>
                  <td>{item.target}</td>
                  <td>
                    {item.signed}/{item.capacity}
                    <span>签到 {item.checked}</span>
                  </td>
                  <td>
                    <span className="badge">{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="empty-state">暂无活动，可用右侧表单创建。</div>}
        </div>

        <aside className="panel-block detail-panel">
          <div className="section-title">
            <h3>{selected?.event_name ?? "新活动"}</h3>
            <span className="status-pill success">名单与签到</span>
          </div>
          <div className="inline-actions">
            <button onClick={register} disabled={hasPendingOperation}>
              <UserPlus size={15} aria-hidden="true" />
              {isRegistering ? "正在报名" : "提交活动报名"}
            </button>
            <button className="ghost-button" onClick={() => loadRegistrations()} disabled={hasPendingOperation}>
              <RefreshCw className={pendingOperation === "roster" ? "spin-icon" : ""} size={15} aria-hidden="true" />
              {pendingOperation === "roster" ? "刷新中" : "刷新报名名单"}
            </button>
          </div>
          <label className="stacked-input">
            <span>报名主体</span>
            <select
              value={registrationForm.subject_type}
              onChange={(event) =>
                setRegistrationForm({
                  ...registrationForm,
                  subject_type: event.target.value as "lead" | "student",
                  subject_id: event.target.value === "lead" ? 1 : 1,
                  source_channel: event.target.value === "lead" ? "CRM邀约" : "学生助手",
                })
              }
            >
              <option value="lead">线索</option>
              <option value="student">学生</option>
            </select>
          </label>
          <label className="stacked-input">
            <span>主体 ID / 姓名</span>
            <input
              value={`${registrationForm.subject_id} / ${registrationForm.subject_name}`}
              onChange={(event) => {
                const [id = "1", name = ""] = event.target.value.split("/");
                setRegistrationForm({ ...registrationForm, subject_id: Number(id.trim()) || 1, subject_name: name.trim() });
              }}
            />
          </label>
          <label className="stacked-input">
            <span>联系方式 / 来源</span>
            <input
              value={`${registrationForm.contact_info} / ${registrationForm.source_channel}`}
              onChange={(event) => {
                const [contactInfo = "", sourceChannel = ""] = event.target.value.split("/");
                setRegistrationForm({ ...registrationForm, contact_info: contactInfo.trim(), source_channel: sourceChannel.trim() });
              }}
            />
          </label>
          <div className="roster-list">
            {isLoadingRoster && <div className="empty-state">正在加载报名名单...</div>}
            {!isLoadingRoster && registrations.map((item) => (
              <article className={highlightRegistrationId === item.id ? "is-highlighted" : ""} key={item.id}>
                <div>
                  <strong>{item.subject_name || `${item.subject_type} #${item.subject_id}`}</strong>
                  <span>
                    {item.subject_type === "lead" ? "线索" : "学生"} / {item.source_channel || "未标注来源"} / {item.status}
                  </span>
                </div>
                <button className="tiny-button" disabled={hasPendingOperation || item.status === "已签到"} onClick={() => checkIn(item.id)}>
                  <CheckSquare size={14} aria-hidden="true" />
                  {isCheckingIn ? "签到中" : item.status === "已签到" ? "已签到" : "签到"}
                </button>
              </article>
            ))}
            {!isLoadingRoster && selected && !registrations.length && <div className="empty-state">当前活动暂无报名名单。</div>}
            {!selected && <div className="empty-state">选择或创建活动后显示报名名单。</div>}
          </div>
        </aside>
      </section>

      <section className="split-layout secondary">
        <div className="panel-block">
          <div className="section-title">
            <h3>活动维护</h3>
            <button className="tiny-button" onClick={() => { setSelectedId(null); setEventForm(defaultEventForm); setRegistrations([]); }}>
              <Plus size={14} aria-hidden="true" />
              新建活动
            </button>
          </div>
          <label className="stacked-input">
            <span>活动名称</span>
            <input value={eventForm.event_name} onChange={(event) => setEventForm({ ...eventForm, event_name: event.target.value })} />
          </label>
          <label className="stacked-input">
            <span>类型 / 状态</span>
            <input
              value={`${eventForm.event_type} / ${eventForm.status}`}
              onChange={(event) => {
                const [eventType = "", status = ""] = event.target.value.split("/");
                setEventForm({ ...eventForm, event_type: eventType.trim(), status: status.trim() });
              }}
            />
          </label>
          <label className="stacked-input">
            <span>时间</span>
            <input type="datetime-local" value={eventForm.start_time} onChange={(event) => setEventForm({ ...eventForm, start_time: event.target.value })} />
          </label>
          <label className="stacked-input">
            <span>地点 / 人数上限</span>
            <input
              value={`${eventForm.location} / ${eventForm.max_participants}`}
              onChange={(event) => {
                const [location = "", maxParticipants = "100"] = event.target.value.split("/");
                setEventForm({ ...eventForm, location: location.trim(), max_participants: Number(maxParticipants.trim()) || 100 });
              }}
            />
          </label>
          <label className="stacked-input">
            <span>适合对象</span>
            <input value={eventForm.target_audience} onChange={(event) => setEventForm({ ...eventForm, target_audience: event.target.value })} />
          </label>
          <label className="stacked-input">
            <span>讲师</span>
            <input value={eventForm.speaker} onChange={(event) => setEventForm({ ...eventForm, speaker: event.target.value })} />
          </label>
          <label className="stacked-input">
            <span>活动说明</span>
            <textarea value={eventForm.description} onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })} rows={2} />
          </label>
          <button className="icon-button" onClick={saveEvent} disabled={hasPendingOperation}>
            <Save size={16} aria-hidden="true" />
            {isSaving ? "正在保存活动" : "保存活动并刷新名单"}
          </button>
        </div>

        <div className="panel-block">
          <div className="section-title">
            <h3>活动详情</h3>
            <span className="status-pill">{selected?.status ?? "待创建"}</span>
          </div>
          <dl className="detail-list">
            <div>
              <dt>适合对象</dt>
              <dd>{selected?.target_audience || "创建活动后展示"}</dd>
            </div>
            <div>
              <dt>讲师与地点</dt>
              <dd>{selected ? `${selected.speaker || "未设置讲师"} / ${selected.location || "未设置地点"}` : "暂无"}</dd>
            </div>
            <div>
              <dt>报名人数</dt>
              <dd>{selected ? `${selected.current_participants}/${selected.max_participants}，已签到 ${selected.checked_in_count}` : "暂无"}</dd>
            </div>
            <div>
              <dt>说明</dt>
              <dd>{selected?.description || "暂无活动说明"}</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
