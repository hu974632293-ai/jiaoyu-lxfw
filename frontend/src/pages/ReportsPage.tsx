import { useState } from "react";
import { apiRequest } from "../api/client";

type ReportCreated = { id: number; title: string; generation_mode: string };
type ReportDetail = { id: number; title: string; content: Record<string, unknown>; generation_mode: string };

export default function ReportsPage() {
  const [created, setCreated] = useState<ReportCreated | null>(null);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [message, setMessage] = useState("");

  async function generate() {
    try {
      const data = await apiRequest<ReportCreated>("/api/reports/customer-operation", {
        method: "POST",
        body: JSON.stringify({ generated_by: "demo", use_llm_polish: false }),
      });
      setCreated(data);
      setDetail(await apiRequest<ReportDetail>(`/api/reports/${data.id}`));
      setMessage("报告已生成");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成失败");
    }
  }

  return (
    <section className="panel">
      <h2>智能报告</h2>
      <button onClick={generate}>生成客户经营分析报告</button>
      <p className="status">{message}</p>
      {created && (
        <p>
          报告：{created.title}，生成方式：{created.generation_mode}
        </p>
      )}
      {detail && <pre>{JSON.stringify(detail.content, null, 2)}</pre>}
    </section>
  );
}
