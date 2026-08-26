import { getInitData } from "./telegram";
import type {
  Equipment,
  Experience,
  FoodItem,
  FoodLogPayload,
  FoodPayload,
  Goal,
  GoalResult,
  LogNote,
  MePayload,
  OnboardingIn,
  OnboardingResult,
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
  onboarding: (body: OnboardingIn) =>
    request<OnboardingResult>("/onboarding", { method: "POST", body: JSON.stringify(body) }),
  setGoal: (goal: Goal, target_weight: number, target_weeks: number | null) =>
    request<GoalResult>("/goal", {
      method: "POST",
      body: JSON.stringify({ goal, target_weight, target_weeks }),
    }),
  setProgram: (
    equipment: Equipment,
    experience: Experience,
    training_days: number[],
    starting_weights: Record<string, number>
  ) =>
    request<MePayload>("/program", {
      method: "POST",
      body: JSON.stringify({ equipment, experience, training_days, starting_weights }),
    }),
  foodSearch: (q: string) => request<FoodItem[]>(`/food/search?q=${encodeURIComponent(q)}`),
  foodLogToday: () => request<FoodLogPayload>("/food/log/today"),
  foodLogItem: (food_id: number, grams: number) =>
    request<FoodLogPayload>("/food/log/item", { method: "POST", body: JSON.stringify({ food_id, grams }) }),
  foodLogManual: (label: string, kcal: number, protein: number, fat: number, carbs: number) =>
    request<FoodLogPayload>("/food/log/manual", {
      method: "POST",
      body: JSON.stringify({ label, kcal, protein, fat, carbs }),
    }),
  foodLogDelete: (id: number) => request<FoodLogPayload>(`/food/log/${id}`, { method: "DELETE" }),
  foodCustom: (name: string, protein: number, fat: number, carbs: number) =>
    request<{ id: number }>("/food/custom", { method: "POST", body: JSON.stringify({ name, protein, fat, carbs }) }),
};

export { ApiError };
