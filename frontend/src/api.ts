import { getInitData } from "./telegram";
import type {
  FoodPayload,
  LogNote,
  MePayload,
  PlanPayload,
  PlotPayload,
  StatsPayload,
  SuppPayload,
  TodayPayload,
} from "./types";

class ApiError extends Error {}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const initData = getInitData();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(initData ? { Authorization: `tma ${initData}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  me: () => request<MePayload>("/me"),
  today: () => request<TodayPayload>("/today"),
  log: (entries: { key: string; weight: number; reps: number[] }[], skipped: string[]) =>
    request<{ session_id: number; notes: LogNote[] }>("/log", {
      method: "POST",
      body: JSON.stringify({ entries, skipped }),
    }),
  weight: (kg: number) =>
    request<StatsPayload>("/weight", { method: "POST", body: JSON.stringify({ kg }) }),
  stats: () => request<StatsPayload>("/stats"),
  plot: () => request<PlotPayload>("/plot"),
  food: () => request<FoodPayload>("/food"),
  kcal: (delta: number) =>
    request<FoodPayload>("/kcal", { method: "POST", body: JSON.stringify({ delta }) }),
  supp: () => request<SuppPayload>("/supp"),
  suppMark: () => request<SuppPayload>("/supp/mark", { method: "POST" }),
  plan: () => request<PlanPayload>("/plan"),
  days: (days: number[]) =>
    request<{ training_days: string }>("/days", {
      method: "POST",
      body: JSON.stringify({ days }),
    }),
};

export { ApiError };
