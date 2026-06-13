const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";
const TOKEN_KEY = "jiaoyu_lxfw_access_token";

export function getAccessToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }
  if (options.headers) {
    Object.assign(headers, options.headers);
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  const payload = await response.json();
  if (response.status === 401) {
    clearAccessToken();
  }
  if (payload.code !== 0) {
    throw new Error(payload.msg || "请求失败");
  }
  return payload.data as T;
}