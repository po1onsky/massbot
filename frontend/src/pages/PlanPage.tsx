import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import Loading from "../components/Loading";
import { exerciseIcon } from "../exerciseIcons";
import type { PlanPayload } from "../types";

export default function PlanPage() {
  const [plan, setPlan] = useState<PlanPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.plan().then(setPlan).catch((e: ApiError) => setError(e.message));
  }, []);

  if (error) return <p className="hint">Ошибка: {error}</p>;
  if (!plan) return <Loading cards={3} />;

  return (
    <div className="stack">
      <div className="card">
        <h2>
          {plan.duration_text}, {plan.start_weight} → {plan.goal_weight} кг
        </h2>
      </div>
      {plan.phases.map((p) => (
        <div className="card" key={p.index}>
          <h2>
            {p.name}
            {p.current && <span className="badge" style={{ marginLeft: 8 }}>ты здесь</span>}
          </h2>
          <div className="hint" style={{ marginBottom: 8 }}>
            {p.months} · {p.kcal} ккал · Б {p.protein} · Ж {p.fat} · У {p.carbs}
          </div>
          <p className="hint" style={{ marginBottom: 10 }}>{p.note}</p>
          {p.days.map((d) => (
            <div key={d.code} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{d.title}</div>
              <div className="hint">
                {d.exercises.map((e) => (
                  <span key={e.key} style={{ marginRight: 10, whiteSpace: "nowrap" }}>
                    <span className="ex-icon">{exerciseIcon(e.key)}</span>
                    {e.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
