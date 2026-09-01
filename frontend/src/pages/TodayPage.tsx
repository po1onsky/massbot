import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { haptic, hapticNotify } from "../telegram";
import Loading from "../components/Loading";
import Stepper from "../components/Stepper";
import { exerciseIcon } from "../exerciseIcons";
import type { ExerciseKind, LogNote, TodayExercise, TodayPayload } from "../types";

type SetsState = Record<string, { weights: string[]; reps: string[] }>;
type Substitute = { name: string; kind: ExerciseKind; sets: number; reps: number };
type SubstitutesState = Record<string, Substitute | undefined>;

function targetText(e: TodayExercise): string {
  if (e.kind === "time") return `${e.sets}×${e.reps} сек`;
  if (e.kind === "bodyweight") return `${e.sets}×${e.reps} (свой вес)`;
  if (e.working_weight != null) return `${e.sets}×${e.reps} → ${e.working_weight} кг`;
  return `${e.sets}×${e.reps} → подбери вес, 3–4 повтора в запасе`;
}

function subTargetText(s: Substitute): string {
  if (s.kind === "time") return `${s.sets}×${s.reps} сек`;
  if (s.kind === "bodyweight") return `${s.sets}×${s.reps} (свой вес)`;
  return `${s.sets}×${s.reps} → подбери вес`;
}

function unitLabel(kind: TodayExercise["kind"]): string {
  return kind === "time" ? "сек" : "повт.";
}

function noteVariant(note: string): "success" | "warning" | "neutral" {
  if (note.startsWith("✅")) return "success";
  if (note.startsWith("↩️") || note.startsWith("⏸")) return "warning";
  return "neutral";
}

function buildInitialSets(exercises: TodayExercise[]): SetsState {
  const state: SetsState = {};
  for (const e of exercises) {
    const w = e.working_weight != null ? String(e.working_weight) : "";
    state[e.key] = {
      weights: Array.from({ length: e.sets }, () => w),
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
  const [substitutes, setSubstitutes] = useState<SubstitutesState>({});
  const [pickerOpen, setPickerOpen] = useState<Set<string>>(new Set());
  const [customSubName, setCustomSubName] = useState<Record<string, string>>({});
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
  if (!today) return <Loading cards={2} />;

  function setReps(key: string, idx: number, value: string) {
    setSets((prev) => {
      const cur = prev[key];
      const reps = [...cur.reps];
      reps[idx] = value;
      return { ...prev, [key]: { ...cur, reps } };
    });
  }

  function setWeight(key: string, idx: number, value: string) {
    setSets((prev) => {
      const cur = prev[key];
      const weights = [...cur.weights];
      weights[idx] = value;
      return { ...prev, [key]: { ...cur, weights } };
    });
  }

  function addSet(key: string) {
    setSets((prev) => {
      const cur = prev[key];
      const lastWeight = cur.weights[cur.weights.length - 1] || "";
      return { ...prev, [key]: { weights: [...cur.weights, lastWeight], reps: [...cur.reps, ""] } };
    });
  }

  function removeSet(key: string) {
    setSets((prev) => {
      const reps = prev[key].reps.slice(0, -1);
      const weights = prev[key].weights.slice(0, -1);
      return { ...prev, [key]: { weights, reps } };
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

  function togglePicker(key: string) {
    setPickerOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function pickAlternative(e: TodayExercise, sub: Substitute) {
    setSubstitutes((prev) => ({ ...prev, [e.key]: sub }));
    setSets((prev) => ({
      ...prev,
      [e.key]: {
        weights: Array.from({ length: sub.sets }, () => ""),
        reps: Array.from({ length: sub.sets }, () => String(sub.reps)),
      },
    }));
    setPickerOpen((prev) => {
      const next = new Set(prev);
      next.delete(e.key);
      return next;
    });
  }

  function pickCustom(e: TodayExercise) {
    const name = (customSubName[e.key] || "").trim();
    if (!name) return;
    pickAlternative(e, { name, kind: e.kind, sets: e.sets, reps: e.reps });
    setCustomSubName((prev) => ({ ...prev, [e.key]: "" }));
  }

  function clearSubstitute(e: TodayExercise) {
    setSubstitutes((prev) => {
      const next = { ...prev };
      delete next[e.key];
      return next;
    });
    const w = e.working_weight != null ? String(e.working_weight) : "";
    setSets((prev) => ({
      ...prev,
      [e.key]: {
        weights: Array.from({ length: e.sets }, () => w),
        reps: Array.from({ length: e.sets }, () => String(e.reps)),
      },
    }));
  }

  async function switchVariant(key: string, variantIdx: number) {
    haptic();
    try {
      const t = await api.setExerciseVariant(key, variantIdx);
      const updated = t.exercises.find((e) => e.key === key);
      if (!updated) return;
      // Меняем только это упражнение — реps/веса, уже введённые по остальным
      // упражнениям в форме логирования, трогать не нужно.
      setToday((prev) => (prev ? { ...prev, exercises: prev.exercises.map((e) => (e.key === key ? updated : e)) } : prev));
      setSets((prev) => {
        const cur = prev[key];
        if (cur) return prev; // подходы уже заполнены — не сбрасываем набранное
        const w = updated.working_weight != null ? String(updated.working_weight) : "";
        return { ...prev, [key]: { weights: Array.from({ length: updated.sets }, () => w), reps: Array.from({ length: updated.sets }, () => String(updated.reps)) } };
      });
    } catch (e) {
      setError((e as ApiError).message);
    }
  }

  async function submitLog() {
    if (!today) return;
    setSubmitting(true);
    try {
      const entries = today.exercises
        .filter((e) => !skipped.has(e.key))
        .map((e) => {
          const reps = sets[e.key].reps.map((r) => parseInt(r, 10)).filter((n) => !isNaN(n) && n >= 0);
          const weights = sets[e.key].weights.slice(0, reps.length).map((w) => parseFloat(w.replace(",", ".")) || 0);
          return {
            key: e.key,
            weights,
            reps,
            ...(substitutes[e.key] ? { substitute_name: substitutes[e.key]!.name } : {}),
          };
        })
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
            <div key={n.key} className={`log-note ${noteVariant(n.note)}`}>
              <div className="name">
                <span className="ex-icon">{exerciseIcon(n.key)}</span>
                {n.name}
              </div>
              <div className="hint">{n.note}</div>
            </div>
          ))}
        </div>
        <button
          className="btn"
          onClick={() => {
            setMode("view");
            setSkipped(new Set());
            setSubstitutes({});
            setPickerOpen(new Set());
            setCustomSubName({});
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
            const sub = substitutes[e.key];
            const effectiveKind = sub?.kind ?? e.kind;
            return (
              <div className="exercise-block" key={e.key} style={{ opacity: isSkipped ? 0.4 : 1 }}>
                <div className="ex-title">
                  <span className="ex-icon">{exerciseIcon(e.key)}</span>
                  {sub ? sub.name : e.name}
                  {sub && <span className="hint"> (замена «{e.name}»)</span>}
                </div>
                <div className="ex-target">{sub ? subTargetText(sub) : targetText(e)}</div>

                {!isSkipped && !sub && e.variant_options.length > 1 && (
                  <div className="choice-grid" style={{ marginTop: 6, marginBottom: 4 }}>
                    {e.variant_options.map((opt) => (
                      <button
                        key={opt.idx}
                        className={`choice-toggle small ${e.variant_idx === opt.idx ? "selected" : ""}`}
                        onClick={() => switchVariant(e.key, opt.idx)}
                      >
                        {opt.name}
                      </button>
                    ))}
                  </div>
                )}

                {!isSkipped && pickerOpen.has(e.key) && (
                  <div className="card" style={{ padding: 10, margin: "8px 0" }}>
                    <div className="hint" style={{ marginBottom: 6 }}>Заменить на:</div>
                    {e.alternatives.length > 0 && (
                      <div className="choice-grid">
                        {e.alternatives.map((alt) => (
                          <button
                            key={alt.name}
                            className="choice-toggle"
                            onClick={() => pickAlternative(e, alt)}
                          >
                            {alt.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="btn-row" style={{ marginTop: 8 }}>
                      <input
                        type="text"
                        placeholder="Другое (впиши название)"
                        value={customSubName[e.key] || ""}
                        onChange={(ev) => setCustomSubName((prev) => ({ ...prev, [e.key]: ev.target.value }))}
                      />
                      <button className="btn small" onClick={() => pickCustom(e)}>
                        Ок
                      </button>
                    </div>
                  </div>
                )}

                {!isSkipped &&
                  sets[e.key]?.reps.map((val, idx) => (
                    <div className={`set-row ${effectiveKind === "weight" ? "" : "no-weight"}`} key={idx}>
                      <div className="set-idx">{idx + 1}</div>
                      {effectiveKind === "weight" && (
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="кг"
                          value={sets[e.key].weights[idx] ?? ""}
                          onChange={(ev) => setWeight(e.key, idx, ev.target.value)}
                        />
                      )}
                      <Stepper
                        value={val}
                        onChange={(v) => setReps(e.key, idx, v)}
                        placeholder={unitLabel(effectiveKind)}
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
                      <button
                        className="btn small secondary"
                        onClick={() => (sub ? clearSubstitute(e) : togglePicker(e.key))}
                      >
                        {sub ? "Отменить замену" : "Заменить"}
                      </button>
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
              <span className="label">
                <span className="ex-icon">{exerciseIcon(e.key)}</span>
                {e.name}
              </span>
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
