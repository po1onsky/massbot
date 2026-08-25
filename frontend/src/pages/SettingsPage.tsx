import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { hapticNotify } from "../telegram";
import type { MePayload } from "../types";

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function SettingsPage() {
  const [me, setMe] = useState<MePayload | null>(null);
  const [days, setDays] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .me()
      .then((m) => {
        setMe(m);
        setDays(new Set(m.training_days.split(",").map(Number)));
      })
      .catch((e: ApiError) => setError(e.message));
  }, []);

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
          <span className="value">{me.day_number + 1} из 270</span>
        </div>
        <div className="row">
          <span className="label">Фаза</span>
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
    </div>
  );
}
