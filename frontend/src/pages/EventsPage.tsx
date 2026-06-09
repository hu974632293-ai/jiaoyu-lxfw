import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";

type EventItem = {
  id: number;
  event_name: string;
  event_type: string;
  start_time: string;
  location: string;
  current_participants: number;
  max_participants: number;
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setEvents(await apiRequest<EventItem[]>("/api/events"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载失败");
    }
  }

  async function register(eventId: number) {
    try {
      await apiRequest(`/api/events/${eventId}/registrations`, {
        method: "POST",
        body: JSON.stringify({ lead_id: 1 }),
      });
      setMessage("已为演示客户报名");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "报名失败");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="panel">
      <h2>活动与报名</h2>
      <p className="status">{message}</p>
      <div className="cards">
        {events.map((item) => (
          <article className="card" key={item.id}>
            <h3>{item.event_name}</h3>
            <p>
              {item.event_type} / {item.location}
            </p>
            <p>
              {item.current_participants} / {item.max_participants}
            </p>
            <button onClick={() => register(item.id)}>为 1 号客户报名</button>
          </article>
        ))}
      </div>
    </section>
  );
}
