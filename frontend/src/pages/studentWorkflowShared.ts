export type StudentItem = {
  id: number;
  student_name: string;
  enrollment_project: string;
  status: string;
  risk_level: string;
};

export type StudentOption = {
  id: number;
  name: string;
  project: string;
  status: string;
  risk: string;
};

export type LeaveRequest = {
  id: number;
  student_id: number;
  reason: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  approved_at: string | null;
};

export type FeedbackTicket = {
  id: number;
  student_id: number;
  category: string;
  content: string;
  summary: string;
  status: string;
  resolution: string;
};

export type TimelineItem = {
  id: number;
  action: string;
  created_at: string | null;
  detail: Record<string, unknown>;
};

export type LeaveDetail = {
  leave: LeaveRequest;
  approvals: Array<Record<string, unknown>>;
  timeline: TimelineItem[];
};

export type FeedbackDetail = {
  ticket: FeedbackTicket;
  timeline: TimelineItem[];
};

export type StudentGrade = {
  id: number;
  student_id: number;
  course_name: string;
  score: number | null;
  exam_time: string | null;
  teacher_feedback: string;
  created_at: string | null;
  updated_at: string | null;
};

export function formatWorkflowDate(value: string | null) {
  if (!value) return "未设置";
  return value.replace("T", " ").slice(0, 16);
}

export function formatOperationTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

export function timelineText(item: TimelineItem) {
  return String(item.detail.reason ?? item.detail.resolution ?? item.detail.content ?? item.detail.status ?? "已记录");
}

export function readPositiveQuery(name: string) {
  if (typeof window === "undefined") return null;
  const value = Number(new URLSearchParams(window.location.search).get(name));
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function writeWorkflowQuery(values: Record<string, number | null | undefined>) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  Object.entries(values).forEach(([key, value]) => {
    if (typeof value === "number" && value > 0) {
      params.set(key, String(value));
    } else {
      params.delete(key);
    }
  });
  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  const currentUrl = `${window.location.pathname}${window.location.search}`;
  if (nextUrl !== currentUrl) {
    window.history.replaceState(null, "", nextUrl);
  }
}
