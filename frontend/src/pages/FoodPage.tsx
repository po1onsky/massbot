import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { hapticNotify } from "../telegram";
import Loading from "../components/Loading";
import type { FoodItem, FoodLogPayload, FoodPayload, SuppPayload } from "../types";

export default function FoodPage() {
  const [food, setFood] = useState<FoodPayload | null>(null);
  const [supp, setSupp] = useState<SuppPayload | null>(null);
  const [log, setLog] = useState<FoodLogPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kcalBusy, setKcalBusy] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [picked, setPicked] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState("100");

  const [manualOpen, setManualOpen] = useState(false);
  const [manualLabel, setManualLabel] = useState("");
  const [manualKcal, setManualKcal] = useState("");

  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customP, setCustomP] = useState("");
  const [customF, setCustomF] = useState("");
  const [customC, setCustomC] = useState("");

  function load() {
    Promise.all([api.food(), api.supp(), api.foodLogToday()])
      .then(([f, s, l]) => {
        setFood(f);
        setSupp(s);
        setLog(l);
      })
      .catch((e: ApiError) => setError(e.message));
  }

  useEffect(load, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.foodSearch(query).then(setResults).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

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

  async function addItem() {
    if (!picked) return;
    const g = parseFloat(grams.replace(",", "."));
    if (isNaN(g) || g <= 0) return;
    try {
      const l = await api.foodLogItem(picked.id, g);
      setLog(l);
      setPicked(null);
      setQuery("");
      setResults([]);
      hapticNotify("success");
    } catch (e) {
      setError((e as ApiError).message);
    }
  }

  async function addManual() {
    const kcal = parseFloat(manualKcal.replace(",", "."));
    if (isNaN(kcal) || kcal <= 0) return;
    try {
      const l = await api.foodLogManual(manualLabel || "Приём пищи", kcal, 0, 0, 0);
      setLog(l);
      setManualLabel("");
      setManualKcal("");
      setManualOpen(false);
      hapticNotify("success");
    } catch (e) {
      setError((e as ApiError).message);
    }
  }

  async function addCustomFood() {
    const p = parseFloat(customP.replace(",", ".")) || 0;
    const f = parseFloat(customF.replace(",", ".")) || 0;
    const c = parseFloat(customC.replace(",", ".")) || 0;
    if (!customName.trim()) return;
    try {
      await api.foodCustom(customName.trim(), p, f, c);
      setCustomName("");
      setCustomP("");
      setCustomF("");
      setCustomC("");
      setCustomOpen(false);
      hapticNotify("success");
    } catch (e) {
      setError((e as ApiError).message);
    }
  }

  async function removeEntry(id: number) {
    try {
      const l = await api.foodLogDelete(id);
      setLog(l);
    } catch (e) {
      setError((e as ApiError).message);
    }
  }

  if (error) return <p className="hint">Ошибка: {error}</p>;
  if (!food || !supp || !log) return <Loading cards={2} />;

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
        <h3>🍽 Дневник питания — сегодня</h3>
        <div className="row">
          <span className="label">Съедено</span>
          <span className="value">
            {log.totals.kcal} / {food.kcal} ккал
          </span>
        </div>
        <div className="row">
          <span className="label">Б / Ж / У</span>
          <span className="value">
            {log.totals.protein} / {log.totals.fat} / {log.totals.carbs} г
          </span>
        </div>

        {log.entries.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {log.entries.map((e) => (
              <div className="row" key={e.id}>
                <span className="label">
                  {e.label}
                  {e.grams ? ` (${e.grams} г)` : ""}
                </span>
                <span className="value">
                  {e.kcal} ккал{" "}
                  <button className="btn small secondary" style={{ marginLeft: 6, padding: "4px 8px" }} onClick={() => removeEntry(e.id)}>
                    ✕
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <input
            type="text"
            placeholder="Найти продукт (например «творог»)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPicked(null);
            }}
          />
          {results.length > 0 && !picked && (
            <div style={{ marginTop: 6 }}>
              {results.map((f) => (
                <div
                  className="row"
                  key={f.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setPicked(f);
                    setQuery(f.name);
                    setResults([]);
                  }}
                >
                  <span className="label">{f.name}</span>
                  <span className="value">Б{f.protein}/Ж{f.fat}/У{f.carbs} на 100г</span>
                </div>
              ))}
            </div>
          )}
          {picked && (
            <div className="btn-row" style={{ marginTop: 8 }}>
              <input type="number" inputMode="decimal" placeholder="граммы" value={grams} onChange={(e) => setGrams(e.target.value)} style={{ width: 90 }} />
              <button className="btn small" onClick={addItem}>
                Добавить
              </button>
            </div>
          )}
        </div>

        <div className="btn-row" style={{ marginTop: 10 }}>
          <button className="btn small secondary" onClick={() => setManualOpen((v) => !v)}>
            {manualOpen ? "Отмена" : "+ Вручную (ккал)"}
          </button>
          <button className="btn small secondary" onClick={() => setCustomOpen((v) => !v)}>
            {customOpen ? "Отмена" : "+ Свой продукт"}
          </button>
        </div>

        {manualOpen && (
          <div className="stack" style={{ marginTop: 8 }}>
            <input type="text" placeholder="Что съел (необязательно)" value={manualLabel} onChange={(e) => setManualLabel(e.target.value)} />
            <div className="btn-row">
              <input type="number" inputMode="decimal" placeholder="ккал" value={manualKcal} onChange={(e) => setManualKcal(e.target.value)} />
              <button className="btn small" onClick={addManual}>
                Добавить
              </button>
            </div>
          </div>
        )}

        {customOpen && (
          <div className="stack" style={{ marginTop: 8 }}>
            <input type="text" placeholder="Название продукта" value={customName} onChange={(e) => setCustomName(e.target.value)} />
            <div className="btn-row">
              <input type="number" inputMode="decimal" placeholder="Б/100г" value={customP} onChange={(e) => setCustomP(e.target.value)} />
              <input type="number" inputMode="decimal" placeholder="Ж/100г" value={customF} onChange={(e) => setCustomF(e.target.value)} />
              <input type="number" inputMode="decimal" placeholder="У/100г" value={customC} onChange={(e) => setCustomC(e.target.value)} />
            </div>
            <button className="btn small" onClick={addCustomFood}>
              Сохранить в свой каталог
            </button>
          </div>
        )}
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
