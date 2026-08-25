import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { haptic, hapticNotify } from "../telegram";
import type { LogNote, TodayExercise, TodayPayload } from "../types";

type SetsState = Record<string, { weight: string; reps: string[] }>;

function targetText(e: TodayExercise): string {
  if (e.kind === "time") return `${e.sets}×${e.reps} сек`;
  if (e.kind === "bodyweight") return `${e.sets}×${e.reps} (свой вес)`;
  if (e.working_weight != null) return `${e.sets}×${e.reps} → ${e.working_weight} кг`;
  return `${e.sets}×${e.reps} → подбери вес, 3–4 повтора в запасе`;
}

function unitLabel(kind: TodayExercise["kind"]): string {
  return kind === "time" ? "сек" : "повт.";
}

function buildInitialSets(exercises: TodayExercise[]): SetsState {
  const state: SetsState = {};
  for (const e of exercises) {
    state[e.key] = {
      weight: e.working_weight != null ? String(e.working_weight) : "",
      reps: Array.from({ length: e.sets }, () => String(e.reps)),
    };
  }
  return state;
}

export default function TodayPage({ onLogged }: { onLogged: () => void }) {
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "log" | "result">("view");
  const [sets, setSets] = useState<SetsState>({});
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState<LogNote[]>([]);
  const [weightInput, setWeightInput] = useState("");
  const [weightMsg, setWeightMsg] = useState<string | null>(null);

  function load() {
    setError(null);
    api
      .today()
      .then((t) => {
        setToday(t);
        setSets(buildInitialSets(t.exercises));
      })
      .catch((e: ApiError) => setError(e.message));
  }

  useEffect(load, []);

  if (error) return <p className="hint">Ошибка: {error}</p>;
  if (!today) return <div className="loading">Загрузка…</div>;

  function setReps(key: string, idx: number, value: string) {
    setSets((prev) => {
      const cur = prev[key];
      const reps = [...cur.reps];
      reps[idx] = value;
      return { ...prev, [key]: { ...cur, reps } };
    });
  }

  function setWeight(key: string, value: string) {
    setSets((prev) => ({ ...prev, [key]: { ...prev[key], weight: value } }));
  }

  function addSet(key: string) {
    setSets((prev) => ({ ...prev, [key]: { ...prev[key], reps: [...prev[key].reps, ""] } }));
  }

  function removeSet(key: string) {
    setSets((prev) => {
      const reps = prev[key].reps.slice(0, -1);
      return { ...prev, [key]: { ...prev[key], reps } };
    });
  }

  function toggleSkip(key: string) {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function submitLog() {
    if (!today) return;
    setSubmitting(true);
    try {
      const entries = today.exercises
        .filter((e) => !skipped.has(e.key))
        .map((e) => ({
          key: e.key,
          weight: parseFloat(sets[e.key].weight.replace(",", ".")) || 0,
          reps: sets[e.key].reps.map((r) => parseInt(r, 10)).filter((n) => !isNaN(n) && n >= 0),
        }))
        .filter((e) => e.reps.length > 0);
      const res = await api.log(entries, Array.from(skipped));
      setNotes(res.notes);
      setMode("result");
      hapticNotify("success");
      onLogged();
    } catch (e) {
      hapticNotify("error");
      setError((e as ApiError).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitWeight() {
    const kg = parseFloat(weightInput.replace(",", "."));
    if (isNaN(kg)) return;
    try {
      const stats = await api.weight(kg);
      setWeightMsg(
        `Записал ${kg} кг.` +
          (stats.avg7 ? ` Среднее за 7 дней: ${stats.avg7} кг.` : "") +
          (stats.to_goal !== undefined ? ` До цели: ${stats.to_goal > 0 ? "+" : ""}${stats.to_goal} кг.` : "")
      );
      hapticNotify("success");
      setWeightInput("");
    } catch (e) {
      setWeightMsg((e as ApiError).message);
      hapticNotify("error");
    }
  }

  if (mode === "result") {
    return (
      <div className="stack">
        <div className="card">
          <h2>Тренировка записана</h2>
          {notes.map((n) => (
            <div key={n.key} className="log-note">
              <div className="name">{n.name}</div>
              <div className="hint">{n.note}</div>
            </div>
          ))}
        </div>
        <button
          className="btn"
          onClick={() => {
            setMode("view");
            setSkipped(new Set());
            load();
          }}
        >
          Готово
        </button>
      </div>
    );
  }

  if (mode === "log") {
    return (
      <div className="stack">
        <div className="card">
          <h2>{today.day_title}</h2>
          {today.exercises.map((e) => {
            const isSkipped = skipped.has(e.key);
            return (
              <div className="exercise-block" key={e.key} style={{ opacity: isSkipped ? 0.4 : 1 }}>
                <div className="ex-title">{e.name}</div>
                <div className="ex-target">{targetText(e)}</div>
                {!isSkipped &&
                  sets[e.key]?.reps.map((val, idx) => (
                    <div className={`set-row ${e.kind === "weight" ? "" : "no-weight"}`} key={idx}>
                      <div className="set-idx">{idx + 1}</div>
                      {e.kind === "weight" && (
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="кг"
                          value={sets[e.key].weight}
                          onChange={(ev) => setWeight(e.key, ev.target.value)}
                        />
                      )}
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder={unitLabel(e.kind)}
                        value={val}
                        onChange={(ev) => setReps(e.key, idx, ev.target.value)}
                      />
                    </div>
                  ))}
                <div className="set-controls">
                  {!isSkipped && (
                    <>
                      <button className="btn small secondary" onClick={() => addSet(e.key)}>
                        + подход
                      </button>
                      {sets[e.key]?.reps.length > 1 && (
                        <button className="btn small secondary" onClick={() => removeSet(e.key)}>
                          − подход
                        </button>
                      )}
                    </>
                  )}
                  <button className="btn small secondary" onClick={() => toggleSkip(e.key)}>
                    {isSkipped ? "Вернуть" : "Пропустить"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="btn-row">
          <button className="btn secondary" onClick={() => setMode("view")}>
            Отмена
          </button>
          <button className="btn" disabled={submitting} onClick={submitLog}>
            {submitting ? "Сохраняю…" : "Сохранить тренировку"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>{today.day_title}</h2>
        <div className="hint" style={{ marginBottom: 8 }}>
          {today.phase_name} · день {today.day_number}
        </div>
        {today.deload && <div className="badge warn">Разгрузочная неделя: веса 60%, объём вдвое меньше</div>}
        {today.logged_today && (
          <div className="hint" style={{ marginTop: 8 }}>
            ✅ Тренировка на сегодня уже записана
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          {today.exercises.map((e) => (
            <div className="row" key={e.key}>
              <span className="label">{e.name}</span>
              <span className="value">{targetText(e)}</span>
            </div>
          ))}
        </div>
      </div>
      <button
        className="btn"
        onClick={() => {
          haptic();
          setMode("log");
        }}
      >
        {today.logged_today ? "Записать ещё раз" : "Записать тренировку"}
      </button>

      <div className="card">
        <h3>⚖️ Утренний вес</h3>
        <div className="btn-row">
          <input
            type="number"
            inputMode="decimal"
            placeholder="69.4"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
          />
          <button className="btn small" style={{ width: 90 }} onClick={submitWeight}>
            Записать
          </button>
        </div>
        {weightMsg && <p className="hint" style={{ marginTop: 8 }}>{weightMsg}</p>}
      </div>
    </div>
  );
}
