import { useState } from "react";
import { apiRequest } from "../api/client";

const sample =
  "姓名 张三 性别 男 年龄 19岁 高中毕业 家庭经济条件较好 希望出国升学 电话 1348907728";

type AssessmentResult = {
  assessment_id: number;
  extracted_profile: Record<string, unknown>;
  singapore_score: number;
  germany_score: number;
  matched_project: string;
  reasons: string[];
  missing_fields: string[];
  suggested_actions: string[];
};

export default function AssessmentPage() {
  const [rawInput, setRawInput] = useState(sample);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [message, setMessage] = useState("");

  async function assess() {
    setMessage("研判中...");
    try {
      const data = await apiRequest<AssessmentResult>("/api/profile/assess", {
        method: "POST",
        body: JSON.stringify({ raw_input: rawInput, source_type: "text", lead_id: null }),
      });
      setResult(data);
      setMessage("研判完成");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "研判失败");
    }
  }

  return (
    <section className="panel">
      <h2>客户画像研判</h2>
      <textarea
        id="assessment-raw-input"
        name="assessment-raw-input"
        value={rawInput}
        onChange={(event) => setRawInput(event.target.value)}
        rows={5}
      />
      <div className="actions">
        <button onClick={() => setRawInput(sample)}>加载样例客户</button>
        <button onClick={assess}>开始研判</button>
      </div>
      <p className="status">{message}</p>
      {result && (
        <div className="result-grid">
          <div>
            <strong>推荐项目</strong>
            <p>{result.matched_project}</p>
          </div>
          <div>
            <strong>新加坡分数</strong>
            <p>{result.singapore_score}</p>
          </div>
          <div>
            <strong>德国分数</strong>
            <p>{result.germany_score}</p>
          </div>
          <div>
            <strong>命中理由</strong>
            <ul>
              {result.reasons.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>缺失字段</strong>
            <p>{result.missing_fields.join("、") || "无"}</p>
          </div>
          <div>
            <strong>建议动作</strong>
            <ul>
              {result.suggested_actions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
