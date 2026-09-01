import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import CardStack from "../components/CardStack";
import Loading from "../components/Loading";
import type { PlanPayload } from "../types";

export default function PlanPage() {
  const [plan, setPlan] = useState<PlanPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    api
      .plan()
      .then((p) => {
        setPlan(p);
        // Открываем стопку сразу на текущем блоке, а не на первом — обычно
        // интересен именно он, прошлые/будущие блоки листаются свайпом.
        const cur = p.phases.findIndex((ph) => ph.current);
        setIndex(cur >= 0 ? cur : 0);
      })
      .catch((e: ApiError) => setError(e.message));
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
      <CardStack
        count={plan.phases.length}
        index={index}
        onIndexChange={setIndex}
        renderCard={(i) => {
          const p = plan.phases[i];
          return (
            <div className="card">
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
                  <div className="hint">{d.exercises.map((e) => e.name).join(", ")}</div>
                </div>
              ))}
            </div>
          );
        }}
      />
    </div>
  );
}
