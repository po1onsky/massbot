import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { hapticNotify } from "../telegram";
import type { FoodPayload, SuppPayload } from "../types";

export default function FoodPage() {
  const [food, setFood] = useState<FoodPayload | null>(null);
  const [supp, setSupp] = useState<SuppPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kcalBusy, setKcalBusy] = useState(false);

  function load() {
    Promise.all([api.food(), api.supp()])
      .then(([f, s]) => {
        setFood(f);
        setSupp(s);
      })
      .catch((e: ApiError) => setError(e.message));
  }

  useEffect(load, []);

  async function shiftKcal(delta: number) {
    setKcalBusy(true);
    try {
      const f = await api.kcal(delta);
      setFood(f);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setKcalBusy(false);
    }
  }

  async function markSupp() {
    try {
      const s = await api.suppMark();
      setSupp(s);
      hapticNotify("success");
    } catch (e) {
      setError((e as ApiError).message);
    }
  }

  if (error) return <p className="hint">Ошибка: {error}</p>;
  if (!food || !supp) return <div className="loading">Загрузка…</div>;

  return (
    <div className="stack">
      <div className="card">
        <h2>{food.phase_name}</h2>
        <div className="row">
          <span className="label">Цель по калориям</span>
          <span className="value">
            {food.kcal} ккал{food.kcal_offset ? ` (сдвиг ${food.kcal_offset > 0 ? "+" : ""}${food.kcal_offset})` : ""}
          </span>
        </div>
        <div className="row">
          <span className="label">Белок / жиры / углеводы</span>
          <span className="value">
            {food.protein} / {food.fat} / ~{food.carbs} г
          </span>
        </div>
        <div className="btn-row" style={{ marginTop: 10 }}>
          <button className="btn small secondary" disabled={kcalBusy} onClick={() => shiftKcal(-150)}>
            −150 ккал
          </button>
          <button className="btn small secondary" disabled={kcalBusy} onClick={() => shiftKcal(200)}>
            +200 ккал
          </button>
        </div>
        <p className="hint" style={{ marginTop: 8 }}>Новую цель держи минимум 2 недели, прежде чем менять снова.</p>
      </div>

      <div className="card">
        <h3>Шейк и база рациона</h3>
        <p className="hint" style={{ whiteSpace: "pre-line" }}>{food.shake}</p>
        <p className="hint" style={{ marginTop: 8 }}>
          База: рис, макароны, картошка, овсянка, хлеб; яйца, курица, фарш, творог, рыба; молоко 2–3%;
          масло, орехи, авокадо; овощи и фрукты — но не перед основной едой.
        </p>
      </div>

      <div className="card">
        <h3>💊 Добавки</h3>
        {supp.supplements.map((s) => (
          <div className="hint" key={s} style={{ marginBottom: 4 }}>
            • {s}
          </div>
        ))}
        <div className="row" style={{ marginTop: 8 }}>
          <span className="label">Серия без пропусков</span>
          <span className="value">{supp.streak} дн.</span>
        </div>
        <button
          className="btn"
          style={{ marginTop: 10 }}
          disabled={supp.marked_today}
          onClick={markSupp}
        >
          {supp.marked_today ? "Сегодня отмечено ✅" : "Отметить креатин на сегодня"}
        </button>
        <p className="hint" style={{ marginTop: 8 }}>
          Не тратить деньги: BCAA, глютамин, тестобустеры, ZMA. Сон 7–9 часов влияет на набор сильнее всего списка выше.
        </p>
      </div>
    </div>
  );
}
