import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import WeightChart from "../components/WeightChart";
import type { PlotPayload, StatsPayload } from "../types";

export default function StatsPage() {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [plot, setPlot] = useState<PlotPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.stats(), api.plot()])
      .then(([s, p]) => {
        setStats(s);
        setPlot(p);
      })
      .catch((e: ApiError) => setError(e.message));
  }, []);

  if (error) return <p className="hint">Ошибка: {error}</p>;
  if (!stats) return <div className="loading">Загрузка…</div>;

  if (!stats.has_data) {
    return (
      <div className="card">
        <h2>Статистика</h2>
        <p className="hint">Взвешиваний пока нет. Запиши утренний вес на вкладке «Сегодня».</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>
          День {stats.day_number} из 270 · {stats.phase_name}
        </h2>
        <div className="row">
          <span className="label">Последний вес</span>
          <span className="value">
            {stats.last_weight} кг ({stats.last_date})
          </span>
        </div>
        <div className="row">
          <span className="label">Среднее за 7 дней</span>
          <span className="value">{stats.avg7 ?? "мало данных"}</span>
        </div>
        <div className="row">
          <span className="label">С начала</span>
          <span className="value">{stats.since_start! > 0 ? "+" : ""}{stats.since_start} кг</span>
        </div>
        <div className="row">
          <span className="label">До цели</span>
          <span className="value">{stats.to_goal! > 0 ? "+" : ""}{stats.to_goal} кг</span>
        </div>
        <div className="row">
          <span className="label">План на сегодня</span>
          <span className="value">
            {stats.planned_weight} кг ({stats.deviation! > 0 ? "+" : ""}
            {stats.deviation})
          </span>
        </div>
        <div className="row">
          <span className="label">Взвешиваний записано</span>
          <span className="value">{stats.weighings_count}</span>
        </div>
        <div className="row">
          <span className="label">Тренировок записано</span>
          <span className="value">{stats.sessions_logged}</span>
        </div>
      </div>

      <div className="card">
        <h3>Подсказка по калориям</h3>
        <p className="hint">{stats.advice}</p>
      </div>

      {plot && (
        <div className="card">
          <h3>График веса</h3>
          <WeightChart data={plot} />
        </div>
      )}
    </div>
  );
}
