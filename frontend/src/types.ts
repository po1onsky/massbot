export type ExerciseKind = "weight" | "bodyweight" | "time";

export interface ExerciseAlternative {
  name: string;
  kind: ExerciseKind;
  sets: number;
  reps: number;
  step: number;
}

export interface VariantOption {
  idx: number;
  name: string;
}

export interface TodayExercise {
  key: string;
  name: string;
  kind: ExerciseKind;
  sets: number;
  reps: number;
  step: number;
  working_weight: number | null;
  variant_idx: number;
  variant_options: VariantOption[];
  alternatives: ExerciseAlternative[];
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

export type Sex = "male" | "female";
export type Goal = "gain" | "lose";
export type Equipment = "gym" | "dumbbell" | "none";
export type Experience = "beginner" | "experienced";
export type SessionLength = "short" | "medium" | "long";

export interface MePayload {
  chat_id: number;
  first_name: string | null;
  start_date: string;
  start_weight: number;
  goal_weight: number;
  day_number: number;
  total_days: number | null;
  phase_index: number;
  phase_name: string;
  deload: boolean;
  kcal_offset: number;
  training_days: string;
  onboarded: boolean;
  goal: Goal | null;
  target_weeks: number | null;
  sex: Sex | null;
  height_cm: number | null;
  age: number | null;
  equipment: Equipment;
  experience: Experience;
  split_key: string | null;
  session_length: SessionLength;
}

export interface SplitOption {
  key: string;
  label: string;
  description: string;
  days_titles: string[];
  exercise_counts: number[];
}

export interface StatsPayload {
  has_data: boolean;
  day_number: number;
  total_days: number | null;
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

export interface OnboardingIn {
  sex: Sex;
  height_cm: number;
  age: number;
  active_job: boolean;
  goal: Goal;
  current_weight: number;
  target_weight: number;
  target_weeks: number | null;
  equipment: Equipment;
  experience: Experience;
  training_days: number[];
  split_key: string | null;
  starting_weights: Record<string, number>;
  session_length: SessionLength | null;
}

export interface GoalResult {
  me: MePayload;
  rate_per_week: number;
  warning: string | null;
}

export interface OnboardingResult {
  me: MePayload;
  today: TodayPayload;
  rate_per_week: number;
  warning: string | null;
}

export interface FoodItem {
  id: number;
  name: string;
  protein: number;
  fat: number;
  carbs: number;
}

export interface FoodLogEntry {
  id: number;
  label: string;
  grams: number | null;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  is_manual: boolean;
}

export interface FoodLogPayload {
  date: string;
  entries: FoodLogEntry[];
  totals: { kcal: number; protein: number; fat: number; carbs: number };
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
  shake: string | null;
  wants_shake: boolean;
  has_protein_powder: boolean;
}

export interface SupplementItem {
  key: string;
  name: string;
  note: string;
  taken: boolean;
}

export interface SuppPayload {
  supplements: SupplementItem[];
  marked_today: boolean;
  streak: number;
  any_taken: boolean;
  wants_supplements: boolean;
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
  duration_text: string;
  phases: PlanPhase[];
}
