export type ExerciseKind = "weight" | "bodyweight" | "time";

export interface TodayExercise {
  key: string;
  name: string;
  kind: ExerciseKind;
  sets: number;
  reps: number;
  step: number;
  working_weight: number | null;
}

export interface TodayPayload {
  day_title: string;
  day_code: string;
  phase_index: number;
  phase_name: string;
  day_number: number;
  deload: boolean;
  logged_today: boolean;
  exercises: TodayExercise[];
}

export interface LogNote {
  key: string;
  name: string;
  note: string;
  working_weight: number | null;
}

export interface MePayload {
  chat_id: number;
  first_name: string | null;
  start_date: string;
  start_weight: number;
  goal_weight: number;
  day_number: number;
  phase_index: number;
  phase_name: string;
  deload: boolean;
  kcal_offset: number;
  training_days: string;
}

export interface StatsPayload {
  has_data: boolean;
  day_number: number;
  phase_name: string;
  sessions_logged: number;
  last_weight?: number;
  last_date?: string;
  avg7?: number | null;
  since_start?: number;
  to_goal?: number;
  planned_weight?: number;
  deviation?: number;
  weighings_count?: number;
  advice?: string;
}

export interface PlotPayload {
  dates: string[];
  weights: number[];
  rolling_avg: number[];
  plan_dates: string[];
  plan_weights: number[];
  goal_weight: number;
  start_weight: number;
}

export interface FoodPayload {
  phase_name: string;
  kcal: number;
  kcal_offset: number;
  protein: number;
  fat: number;
  carbs: number;
  shake: string;
}

export interface SuppPayload {
  supplements: string[];
  marked_today: boolean;
  streak: number;
}

export interface PlanExercise {
  key: string;
  name: string;
  sets: number;
  reps: number;
  kind: ExerciseKind;
}

export interface PlanDay {
  code: string;
  title: string;
  exercises: PlanExercise[];
}

export interface PlanPhase {
  index: number;
  current: boolean;
  name: string;
  months: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  note: string;
  days: PlanDay[];
}

export interface PlanPayload {
  start_weight: number;
  goal_weight: number;
  phases: PlanPhase[];
}
