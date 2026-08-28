import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { hapticNotify } from "../telegram";
import type { Equipment, Experience, Goal, MePayload, SplitOption } from "../types";

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function ChoiceRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
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

export default function SettingsPage({ onProfileChanged }: { onProfileChanged: () => void }) {
  const [me, setMe] = useState<MePayload | null>(null);
  const [days, setDays] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [goalOpen, setGoalOpen] = useState(false);
  const [goal, setGoal] = useState<Goal>("gain");
  const [targetWeight, setTargetWeight] = useState("");
  const [targetWeeks, setTargetWeeks] = useState("");
  const [goalMsg, setGoalMsg] = useState<string | null>(null);
  const [goalBusy, setGoalBusy] = useState(false);

  const [programOpen, setProgramOpen] = useState(false);
  const [equipment, setEquipment] = useState<Equipment>("gym");
  const [experience, setExperience] = useState<Experience>("experienced");
  const [splitOptions, setSplitOptions] = useState<SplitOption[]>([]);
  const [splitKey, setSplitKey] = useState<string | null>(null);
  const [splitsLoading, setSplitsLoading] = useState(false);
  const [programMsg, setProgramMsg] = useState<string | null>(null);
  const [programBusy, setProgramBusy] = useState(false);

  function load() {
    api
      .me()
      .then((m) => {
        setMe(m);
        setDays(new Set(m.training_days.split(",").map(Number)));
        setGoal(m.goal || "gain");
        setTargetWeight(String(m.goal_weight || ""));
        setTargetWeeks(m.target_weeks ? String(m.target_weeks) : "");
        setEquipment(m.equipment);
        setExperience(m.experience);
        setSplitKey(m.split_key);
      })
      .catch((e: ApiError) => setError(e.message));
  }

  useEffect(load, []);

  useEffect(() => {
    if (!programOpen || days.size === 0) return;
    setSplitsLoading(true);
    api
      .splits(days.size)
      .then((opts) => {
        setSplitOptions(opts);
        setSplitKey((prev) => (opts.some((o) => o.key === prev) ? prev : opts[0]?.key ?? null));
      })
      .catch(() => setSplitOptions([]))
      .finally(() => setSplitsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programOpen, days.size]);

  function toggle(idx: number) {
    setSaved(false);
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  async function save() {
    try {
      await api.days(Array.from(days));
      setSaved(true);
      hapticNotify("success");
    } catch (e) {
      setError((e as ApiError).message);
    }
  }

  async function saveGoal() {
    const tw = parseFloat(targetWeight.replace(",", "."));
    if (isNaN(tw)) return;
    const weeks = targetWeeks ? parseInt(targetWeeks, 10) : null;
    setGoalBusy(true);
    setGoalMsg(null);
    try {
      const res = await api.setGoal(goal, tw, weeks);
      setGoalMsg(res.warning ? `⚠️ ${res.warning}` : "Цель обновлена ✅");
      hapticNotify("success");
      onProfileChanged();
      load();
    } catch (e) {
      setGoalMsg((e as ApiError).message);
      hapticNotify("error");
    } finally {
      setGoalBusy(false);
    }
  }

  async function saveProgram() {
    setProgramBusy(true);
    setProgramMsg(null);
    try {
      await api.setProgram(equipment, experience, Array.from(days), splitKey, {});
      setProgramMsg("Программа пересобрана ✅");
      hapticNotify("success");
      onProfileChanged();
      load();
    } catch (e) {
      setProgramMsg((e as ApiError).message);
      hapticNotify("error");
    } finally {
      setProgramBusy(false);
    }
  }

  if (error) return <p className="hint">Ошибка: {error}</p>;
  if (!me) return <div className="loading">Загрузка…</div>;

  return (
    <div className="stack">
      <div className="card">
        <h2>Программа</h2>
        <div className="row">
          <span className="label">Старт</span>
          <span className="value">{me.start_date}</span>
        </div>
        <div className="row">
          <span className="label">Вес старт → цель</span>
          <span className="value">
            {me.start_weight} → {me.goal_weight} кг
          </span>
        </div>
        <div className="row">
          <span className="label">День программы</span>
          <span className="value">
            {me.day_number + 1}
            {me.total_days ? ` из ${me.total_days}` : ""}
          </span>
        </div>
        <div className="row">
          <span className="label">Этап</span>
          <span className="value">{me.phase_name}</span>
        </div>
      </div>

      <div className="card">
        <h3>Дни тренировок</h3>
        <p className="hint" style={{ marginBottom: 10 }}>
          В эти дни вечером придёт напоминание, если тренировка ещё не записана.
        </p>
        <div className="days-grid">
          {DAY_LABELS.map((label, idx) => (
            <button
              key={idx}
              className={`day-toggle ${days.has(idx) ? "selected" : ""}`}
              onClick={() => toggle(idx)}
            >
              {label}
            </button>
          ))}
        </div>
        <button className="btn" style={{ marginTop: 12 }} onClick={save}>
          {saved ? "Сохранено ✅" : "Сохранить"}
        </button>
      </div>

      <div className="card">
        <h3>Изменить цель</h3>
        {!goalOpen ? (
          <button className="btn secondary" onClick={() => setGoalOpen(true)}>
            Открыть
          </button>
        ) : (
          <div className="stack">
            <ChoiceRow
              options={[
                { value: "gain" as Goal, label: "Набрать вес" },
                { value: "lose" as Goal, label: "Сбросить вес" },
              ]}
              value={goal}
              onChange={setGoal}
            />
            <div className="btn-row">
              <input
                type="number"
                inputMode="decimal"
                placeholder="Целевой вес, кг"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
              />
              <input
                type="number"
                inputMode="numeric"
                placeholder="Срок, недель"
                value={targetWeeks}
                onChange={(e) => setTargetWeeks(e.target.value)}
              />
            </div>
            <p className="hint">
              Калории пересчитаются от твоего последнего веса, отсчёт срока начнётся заново — история
              взвешиваний и тренировок не трогается.
            </p>
            {goalMsg && <p className="hint">{goalMsg}</p>}
            <button className="btn" disabled={goalBusy} onClick={saveGoal}>
              {goalBusy ? "Считаю…" : "Пересчитать"}
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Изменить программу</h3>
        {!programOpen ? (
          <button className="btn secondary" onClick={() => setProgramOpen(true)}>
            Открыть
          </button>
        ) : (
          <div className="stack">
            <div className="hint">Тип программы (доступные варианты зависят от числа дней тренировок выше)</div>
            {splitsLoading && <div className="hint">Загрузка вариантов…</div>}
            {splitOptions.map((o) => (
              <button
                key={o.key}
                className={`choice-toggle ${splitKey === o.key ? "selected" : ""}`}
                style={{ textAlign: "left" }}
                onClick={() => setSplitKey(o.key)}
              >
                <div style={{ fontWeight: 600 }}>{o.label}</div>
                <div className="hint" style={{ marginTop: 2 }}>
                  {o.description}
                </div>
                <div className="hint" style={{ marginTop: 2 }}>
                  {o.days_titles.join(" · ")}
                </div>
              </button>
            ))}
            <div className="hint">Оборудование</div>
            <ChoiceRow
              options={[
                { value: "gym" as Equipment, label: "Зал" },
                { value: "dumbbell" as Equipment, label: "Гантели дома" },
                { value: "none" as Equipment, label: "Без оборудования" },
              ]}
              value={equipment}
              onChange={setEquipment}
            />
            <div className="hint">Опыт</div>
            <ChoiceRow
              options={[
                { value: "beginner" as Experience, label: "Новичок" },
                { value: "experienced" as Experience, label: "Есть опыт" },
              ]}
              value={experience}
              onChange={setExperience}
            />
            <p className="hint">
              Сплит пересоберётся под выбранные дни тренировок (вкладка выше) и оборудование. Прогресс в
              упражнениях, которые останутся в программе, сохранится.
            </p>
            {programMsg && <p className="hint">{programMsg}</p>}
            <button className="btn" disabled={programBusy} onClick={saveProgram}>
              {programBusy ? "Собираю…" : "Пересобрать программу"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
