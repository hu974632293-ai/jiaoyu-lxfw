import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";

type Lead = { id: number; customer_name: string; status: string };

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setLeads(await apiRequest<Lead[]>("/api/leads"));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载失败");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="panel">
      <h2>CRM 线索</h2>
      <button onClick={load}>刷新</button>
      <p className="status">{message}</p>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>客户</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td>{lead.id}</td>
              <td>{lead.customer_name}</td>
              <td>{lead.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
