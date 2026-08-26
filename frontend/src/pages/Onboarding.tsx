import { useState } from "react";
import { api, ApiError } from "../api";
import { hapticNotify } from "../telegram";
import type { Equipment, Experience, Goal, OnboardingIn, Sex } from "../types";

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const STARTING_PATTERNS: { key: string; label: string }[] = [
  { key: "squat", label: "Присед (или его замена)" },
  { key: "hinge", label: "Тяга на прямых ногах / румынская" },
  { key: "push_h", label: "Жим лёжа (или отжимания с весом)" },
  { key: "push_v", label: "Жим стоя/сидя над головой" },
  { key: "pull_h", label: "Тяга в наклоне" },
];

function estimateRate(goal: Goal, current: number, target: number, weeks: number | null) {
  const delta = Math.abs(target - current);
  if (!weeks || weeks <= 0 || delta === 0 || !current) return { rate: 0, warning: null as string | null };
  const rate = delta / weeks;
  const pct = (rate / current) * 100;
  const safeMaxPct = goal === "gain" ? 0.5 : 0.8;
  let warning: string | null = null;
  if (pct > safeMaxPct) {
    const minWeeks = Math.max(1, Math.round(delta / ((current * safeMaxPct) / 100)));
    warning = `Это ≈${rate.toFixed(2)} кг/нед (${pct.toFixed(1)}% веса в неделю). Обычно безопасно до ${safeMaxPct.toFixed(
      1
    )}%/нед — комфортнее растянуть срок примерно до ${minWeeks} нед.`;
  }
  return { rate: Math.round(rate * 100) / 100, warning };
}

function Choice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="choice-grid">
      {options.map((o) => (
        <button
          key={o.value}
          className={`choice-toggle ${value === o.value ? "selected" : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ warning: string | null; dayTitle: string } | null>(null);

  const [sex, setSex] = useState<Sex | null>(null);
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [activeJob, setActiveJob] = useState<boolean | null>(null);

  const [goal, setGoal] = useState<Goal | null>(null);
  const [currentWeight, setCurrentWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [targetWeeks, setTargetWeeks] = useState("");

  const [days, setDays] = useState<Set<number>>(new Set([0, 2, 4]));
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [startingWeights, setStartingWeights] = useState<Record<string, string>>({});

  function toggleDay(idx: number) {
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const cw = parseFloat(currentWeight.replace(",", "."));
  const tw = parseFloat(targetWeight.replace(",", "."));
  const weeks = targetWeeks ? parseInt(targetWeeks, 10) : null;
  const preview = goal && !isNaN(cw) && !isNaN(tw) && weeks ? estimateRate(goal, cw, tw, weeks) : null;

  const steps = [
    {
      title: "О тебе",
      valid: sex !== null && height !== "" && age !== "" && activeJob !== null,
      body: (
        <div className="stack">
          <div>
            <div className="hint" style={{ marginBottom: 6 }}>Пол (нужен только для формулы калорий)</div>
            <Choice
              options={[
                { value: "male" as Sex, label: "Мужской" },
                { value: "female" as Sex, label: "Женский" },
              ]}
              value={sex}
              onChange={setSex}
            />
          </div>
          <div className="btn-row">
            <input type="number" inputMode="decimal" placeholder="Рост, см" value={height} onChange={(e) => setHeight(e.target.value)} />
            <input type="number" inputMode="numeric" placeholder="Возраст" value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div>
            <div className="hint" style={{ marginBottom: 6 }}>Вне тренировок ты в основном…</div>
            <div className="choice-grid">
              <button
                className={`choice-toggle ${activeJob === false ? "selected" : ""}`}
                onClick={() => setActiveJob(false)}
              >
                Сидячая работа
              </button>
              <button
                className={`choice-toggle ${activeJob === true ? "selected" : ""}`}
                onClick={() => setActiveJob(true)}
              >
                На ногах весь день
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Цель",
      valid: goal !== null,
      body: (
        <Choice
          options={[
            { value: "gain" as Goal, label: "Набрать вес" },
            { value: "lose" as Goal, label: "Сбросить вес" },
          ]}
          value={goal}
          onChange={setGoal}
        />
      ),
    },
    {
      title: "Вес",
      valid: currentWeight !== "" && targetWeight !== "" && !isNaN(cw) && !isNaN(tw),
      body: (
        <div className="stack">
          <div className="btn-row">
            <input type="number" inputMode="decimal" placeholder="Текущий вес, кг" value={currentWeight} onChange={(e) => setCurrentWeight(e.target.value)} />
            <input type="number" inputMode="decimal" placeholder="Целевой вес, кг" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} />
          </div>
        </div>
      ),
    },
    {
      title: "Срок",
      valid: targetWeeks !== "" && weeks !== null && weeks > 0,
      body: (
        <div className="stack">
          <input type="number" inputMode="numeric" placeholder="Срок, недель" value={targetWeeks} onChange={(e) => setTargetWeeks(e.target.value)} />
          {preview && (
            <p className="hint">
              {preview.warning ? `⚠️ ${preview.warning}` : `≈${preview.rate} кг/нед — в безопасном диапазоне.`}
            </p>
          )}
        </div>
      ),
    },
    {
      title: "Дни тренировок",
      valid: days.size > 0,
      body: (
        <div className="days-grid">
          {DAY_LABELS.map((label, idx) => (
            <button key={idx} className={`day-toggle ${days.has(idx) ? "selected" : ""}`} onClick={() => toggleDay(idx)}>
              {label}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Оборудование",
      valid: equipment !== null,
      body: (
        <Choice
          options={[
            { value: "gym" as Equipment, label: "Зал (штанга/тренажёры)" },
            { value: "dumbbell" as Equipment, label: "Дома с гантелями" },
            { value: "none" as Equipment, label: "Без оборудования" },
          ]}
          value={equipment}
          onChange={setEquipment}
        />
      ),
    },
    {
      title: "Опыт",
      valid: experience !== null,
      body: (
        <div className="stack">
          <Choice
            options={[
              { value: "beginner" as Experience, label: "Новичок" },
              { value: "experienced" as Experience, label: "Есть опыт" },
            ]}
            value={experience}
            onChange={setExperience}
          />
          {experience === "experienced" && (
            <div className="card" style={{ marginTop: 4 }}>
              <p className="hint" style={{ marginBottom: 8 }}>
                Необязательно: с каким весом уверенно делаешь 3 подхода по 8? Оставь пустым, если не знаешь.
              </p>
              {STARTING_PATTERNS.map((p) => (
                <div className="row" key={p.key} style={{ border: "none" }}>
                  <span className="label">{p.label}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="кг"
                    style={{ width: 90 }}
                    value={startingWeights[p.key] || ""}
                    onChange={(e) => setStartingWeights((prev) => ({ ...prev, [p.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
  ];

  const cur = steps[step];
  const isLast = step === steps.length - 1;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const body: OnboardingIn = {
        sex: sex as Sex,
        height_cm: parseFloat(height),
        age: parseInt(age, 10),
        active_job: Boolean(activeJob),
        goal: goal as Goal,
        current_weight: cw,
        target_weight: tw,
        target_weeks: weeks,
        equipment: equipment as Equipment,
        experience: experience as Experience,
        training_days: Array.from(days),
        starting_weights: Object.fromEntries(
          Object.entries(startingWeights)
            .map(([k, v]) => [k, parseFloat(v)])
            .filter(([, v]) => !isNaN(v as number))
        ),
      };
      const res = await api.onboarding(body);
      setResult({ warning: res.warning, dayTitle: res.today.day_title });
      hapticNotify("success");
    } catch (e) {
      setError((e as ApiError).message);
      hapticNotify("error");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="stack">
        <div className="card">
          <h2>Программа готова 🎉</h2>
          <p className="hint">Первая тренировка: {result.dayTitle}. Калории и БЖУ уже посчитаны на вкладке «Питание».</p>
          {result.warning && <p className="hint" style={{ marginTop: 8 }}>⚠️ {result.warning}</p>}
        </div>
        <button className="btn" onClick={onDone}>
          Погнали
        </button>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="hint">
        Шаг {step + 1} из {steps.length}
      </div>
      <div className="card">
        <h2>{cur.title}</h2>
        {cur.body}
      </div>
      {error && <p className="hint">Ошибка: {error}</p>}
      <div className="btn-row">
        {step > 0 && (
          <button className="btn secondary" onClick={() => setStep((s) => s - 1)}>
            Назад
          </button>
        )}
        {!isLast && (
          <button className="btn" disabled={!cur.valid} onClick={() => setStep((s) => s + 1)}>
            Далее
          </button>
        )}
        {isLast && (
          <button className="btn" disabled={!cur.valid || submitting} onClick={submit}>
            {submitting ? "Считаю…" : "Начать"}
          </button>
        )}
      </div>
    </div>
  );
}
