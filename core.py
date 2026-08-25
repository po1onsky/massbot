# -*- coding: utf-8 -*-
"""
Общая логика и работа с БД: используется и телеграм-ботом (напоминания,
/start), и API мини-приложения. Ничего не знает про python-telegram-bot —
только данные и SQLite.
"""

import os
import sqlite3
import datetime as dt
from typing import Optional
from zoneinfo import ZoneInfo

from program import (
    PHASES,
    SUPPLEMENTS,
    SHAKE,
    START_WEIGHT,
    GOAL_WEIGHT,
    phase_for_day,
    planned_weight,
)

TZ = ZoneInfo(os.environ.get("TZ_NAME", "Europe/Moscow"))
DB_PATH = os.environ.get("DB_PATH", "massbot.db")
DEFAULT_TRAINING_DAYS = "0,2,4"  # пн, ср, пт

db = sqlite3.connect(DB_PATH, check_same_thread=False)
db.row_factory = sqlite3.Row
db.execute("PRAGMA journal_mode=WAL")  # бот и API — разные процессы, пишут в одну базу


def init_db() -> None:
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            chat_id      INTEGER PRIMARY KEY,
            start_date   TEXT NOT NULL,
            start_weight REAL NOT NULL,
            goal_weight  REAL NOT NULL,
            kcal_offset  INTEGER NOT NULL DEFAULT 0,
            training_days TEXT NOT NULL DEFAULT '0,2,4',
            reminders    INTEGER NOT NULL DEFAULT 1,
            first_name   TEXT
        );
        CREATE TABLE IF NOT EXISTS weights (
            chat_id INTEGER, date TEXT, kg REAL,
            PRIMARY KEY (chat_id, date)
        );
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id INTEGER, date TEXT, phase INTEGER, day_code TEXT
        );
        CREATE TABLE IF NOT EXISTS sets (
            session_id INTEGER, ex_key TEXT, weight REAL, reps TEXT, ok INTEGER
        );
        CREATE TABLE IF NOT EXISTS ex_state (
            chat_id INTEGER, ex_key TEXT, working_weight REAL,
            fail_streak INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (chat_id, ex_key)
        );
        CREATE TABLE IF NOT EXISTS supp_log (
            chat_id INTEGER, date TEXT,
            PRIMARY KEY (chat_id, date)
        );
        """
    )
    # на случай апгрейда со старой версии базы без колонки first_name
    cols = {r["name"] for r in db.execute("PRAGMA table_info(users)")}
    if "first_name" not in cols:
        db.execute("ALTER TABLE users ADD COLUMN first_name TEXT")
    db.commit()


def today_str() -> str:
    return dt.datetime.now(TZ).date().isoformat()


def today_date() -> dt.date:
    return dt.datetime.now(TZ).date()


# ------------------------------------------------------------------ пользователь
def get_user(chat_id: int):
    return db.execute("SELECT * FROM users WHERE chat_id=?", (chat_id,)).fetchone()


def ensure_user(chat_id: int, first_name: Optional[str] = None):
    u = get_user(chat_id)
    if u is None:
        db.execute(
            "INSERT INTO users (chat_id, start_date, start_weight, goal_weight, training_days, first_name)"
            " VALUES (?,?,?,?,?,?)",
            (chat_id, today_str(), START_WEIGHT, GOAL_WEIGHT, DEFAULT_TRAINING_DAYS, first_name),
        )
        db.commit()
        u = get_user(chat_id)
    elif first_name and u["first_name"] != first_name:
        db.execute("UPDATE users SET first_name=? WHERE chat_id=?", (first_name, chat_id))
        db.commit()
        u = get_user(chat_id)
    return u


def day_number(u) -> int:
    start = dt.date.fromisoformat(u["start_date"])
    return (today_date() - start).days


def current_phase(u):
    idx = phase_for_day(day_number(u))
    return idx, PHASES[idx]


def is_deload(u, phase_idx: int) -> bool:
    phase = PHASES[phase_idx]
    every = phase.get("deload_every", 0)
    if not every:
        return False
    phase_start_day = [0, 90, 180][phase_idx]
    week_in_phase = max(0, (day_number(u) - phase_start_day)) // 7
    return week_in_phase % every == every - 1


def next_day_plan(u, phase_idx: int):
    """Какая тренировка по счёту в этой фазе."""
    n = db.execute(
        "SELECT COUNT(*) c FROM sessions WHERE chat_id=? AND phase=?",
        (u["chat_id"], phase_idx),
    ).fetchone()["c"]
    days = PHASES[phase_idx]["days"]
    return days[n % len(days)]


def ex_state(chat_id: int, key: str):
    return db.execute(
        "SELECT * FROM ex_state WHERE chat_id=? AND ex_key=?", (chat_id, key)
    ).fetchone()


def ex_by_key(day: dict, key: str):
    for e in day["exercises"]:
        if e["key"] == key:
            return e
    return None


# ------------------------------------------------------------------ прогрессия
def apply_progression(chat_id: int, ex: dict, weight: float, reps: list) -> str:
    """Обновляет рабочий вес и возвращает текст-пояснение."""
    done = len(reps) >= ex["sets"] and all(r >= ex["reps"] for r in reps)
    st = ex_state(chat_id, ex["key"])
    fails = st["fail_streak"] if st else 0
    step = ex["step"]

    if done:
        new_w = weight + step if step else weight
        fails = 0
        if ex["kind"] == "weight" and step:
            note = f"✅ +{step:g} кг → в следующий раз {new_w:g} кг"
        else:
            note = "✅ норма выполнена → добавь 1–2 повтора в следующий раз"
    else:
        fails += 1
        if fails >= 2:
            new_w = round(weight * 0.9 / 2.5) * 2.5 if ex["kind"] == "weight" else weight
            fails = 0
            note = (
                f"↩️ второй недобор → сброс 10%: {new_w:g} кг, заходи заново"
                if ex["kind"] == "weight"
                else "↩️ второй недобор → сбавь объём и заходи заново"
            )
        else:
            new_w = weight
            note = "⏸ недобор → повтори тот же вес"

    db.execute(
        "INSERT INTO ex_state (chat_id, ex_key, working_weight, fail_streak) VALUES (?,?,?,?)"
        " ON CONFLICT(chat_id, ex_key) DO UPDATE SET working_weight=?, fail_streak=?",
        (chat_id, ex["key"], new_w, fails, new_w, fails),
    )
    db.commit()
    return new_w, note


# ------------------------------------------------------------------ вес
def weight_map(chat_id: int) -> dict:
    rows = db.execute(
        "SELECT date, kg FROM weights WHERE chat_id=? ORDER BY date", (chat_id,)
    ).fetchall()
    return {r["date"]: r["kg"] for r in rows}


def window_avg(wm: dict, end: dt.date, days: int = 7):
    vals = [
        wm[d.isoformat()]
        for d in (end - dt.timedelta(days=i) for i in range(days))
        if d.isoformat() in wm
    ]
    return sum(vals) / len(vals) if vals else None


def weekly_delta(wm: dict, today: dt.date, weeks_back: int = 0):
    a = window_avg(wm, today - dt.timedelta(days=7 * weeks_back))
    b = window_avg(wm, today - dt.timedelta(days=7 * (weeks_back + 1)))
    if a is None or b is None:
        return None
    return round(a - b, 2)


def kcal_advice(wm: dict, today: dt.date) -> str:
    d0 = weekly_delta(wm, today, 0)
    if d0 is None:
        return "Данных пока мало — нужно 2 недели ежедневных взвешиваний."
    d1 = weekly_delta(wm, today, 1)
    if d0 > 0.5:
        return f"Прирост {d0:+.2f} кг/нед — быстро. Срежь 150 ккал."
    if d0 < 0.2:
        if d1 is not None and d1 < 0.2:
            return f"Две недели подряд меньше 0,2 кг/нед. Добавь 200 ккал."
        return f"Прирост {d0:+.2f} кг/нед — мало. Если следующая неделя такая же, добавляем 200 ккал."
    return f"Прирост {d0:+.2f} кг/нед — точно в целевом коридоре. Ничего не меняй."


def save_weight(chat_id: int, kg: float):
    db.execute(
        "INSERT INTO weights (chat_id, date, kg) VALUES (?,?,?)"
        " ON CONFLICT(chat_id, date) DO UPDATE SET kg=?",
        (chat_id, today_str(), kg, kg),
    )
    db.commit()


# ------------------------------------------------------------------ сериализация для API
def exercise_view(chat_id: int, e: dict, deload: bool) -> dict:
    st = ex_state(chat_id, e["key"])
    working_weight = None
    if e["kind"] == "weight" and st and st["working_weight"]:
        working_weight = st["working_weight"] * (0.6 if deload else 1)
        working_weight = round(working_weight, 1)
    return {
        "key": e["key"],
        "name": e["name"],
        "kind": e["kind"],
        "sets": e["sets"] if not deload else max(1, e["sets"] // 2),
        "reps": e["reps"],
        "step": e["step"],
        "working_weight": working_weight,
    }


def today_payload(u) -> dict:
    idx, phase = current_phase(u)
    day = next_day_plan(u, idx)
    deload = is_deload(u, idx)
    return {
        "day_title": day["title"],
        "day_code": day["code"],
        "phase_index": idx,
        "phase_name": phase["name"],
        "day_number": day_number(u) + 1,
        "deload": deload,
        "logged_today": has_session_today(u["chat_id"]),
        "exercises": [exercise_view(u["chat_id"], e, deload) for e in day["exercises"]],
    }


def log_workout(u, entries: list, skipped: list) -> dict:
    """entries: [{key, weight, reps:[int,...]}]. Возвращает заметки по каждому упражнению."""
    idx, _ = current_phase(u)
    day = next_day_plan(u, idx)
    deload = is_deload(u, idx)
    chat_id = u["chat_id"]

    cur = db.execute(
        "INSERT INTO sessions (chat_id, date, phase, day_code) VALUES (?,?,?,?)",
        (chat_id, today_str(), idx, day["code"]),
    )
    db.commit()
    session_id = cur.lastrowid

    notes = []
    for entry in entries:
        ex = ex_by_key(day, entry["key"])
        if ex is None:
            continue
        weight = float(entry.get("weight") or 0)
        reps = [int(r) for r in entry.get("reps", []) if int(r) >= 0]
        if not reps:
            continue
        ok = int(len(reps) >= ex["sets"] and all(r >= ex["reps"] for r in reps))
        db.execute(
            "INSERT INTO sets (session_id, ex_key, weight, reps, ok) VALUES (?,?,?,?,?)",
            (session_id, ex["key"], weight, ",".join(map(str, reps)), ok),
        )
        db.commit()
        if not deload:
            new_w, note = apply_progression(chat_id, ex, weight, reps)
        else:
            new_w, note = weight, "🔁 разгрузка — прогрессию не двигаем"
        notes.append({"key": ex["key"], "name": ex["name"], "note": note, "working_weight": new_w})

    for key in skipped or []:
        ex = ex_by_key(day, key)
        if ex:
            notes.append({"key": key, "name": ex["name"], "note": "пропущено", "working_weight": None})

    return {"session_id": session_id, "notes": notes}


def me_payload(u) -> dict:
    idx, phase = current_phase(u)
    return {
        "chat_id": u["chat_id"],
        "first_name": u["first_name"],
        "start_date": u["start_date"],
        "start_weight": u["start_weight"],
        "goal_weight": u["goal_weight"],
        "day_number": day_number(u),
        "phase_index": idx,
        "phase_name": phase["name"],
        "deload": is_deload(u, idx),
        "kcal_offset": u["kcal_offset"],
        "training_days": u["training_days"],
    }


def stats_payload(u) -> dict:
    wm = weight_map(u["chat_id"])
    today = today_date()
    d = day_number(u)
    idx, phase = current_phase(u)
    ses = db.execute(
        "SELECT COUNT(*) c FROM sessions WHERE chat_id=?", (u["chat_id"],)
    ).fetchone()["c"]

    if not wm:
        return {
            "has_data": False,
            "day_number": d + 1,
            "phase_name": phase["name"],
            "sessions_logged": ses,
        }

    last_date = max(wm)
    last = wm[last_date]
    avg = window_avg(wm, today)
    plan = planned_weight(d)
    return {
        "has_data": True,
        "day_number": d + 1,
        "phase_name": phase["name"],
        "last_weight": last,
        "last_date": last_date,
        "avg7": round(avg, 2) if avg else None,
        "since_start": round(last - u["start_weight"], 1),
        "to_goal": round(u["goal_weight"] - last, 1),
        "planned_weight": plan,
        "deviation": round(last - plan, 1),
        "weighings_count": len(wm),
        "sessions_logged": ses,
        "advice": kcal_advice(wm, today),
    }


def plot_payload(u) -> dict:
    wm = weight_map(u["chat_id"])
    dates = sorted(wm)
    ys = [wm[x] for x in dates]
    roll = [
        round(sum(ys[max(0, i - 6): i + 1]) / len(ys[max(0, i - 6): i + 1]), 2)
        for i in range(len(ys))
    ]
    start = dt.date.fromisoformat(u["start_date"])
    plan_dates = [(start + dt.timedelta(days=i)).isoformat() for i in range(0, 271, 5)]
    plan_weights = [planned_weight(i) for i in range(0, 271, 5)]
    return {
        "dates": dates,
        "weights": ys,
        "rolling_avg": roll,
        "plan_dates": plan_dates,
        "plan_weights": plan_weights,
        "goal_weight": u["goal_weight"],
        "start_weight": u["start_weight"],
    }


def food_payload(u) -> dict:
    _, phase = current_phase(u)
    kcal = phase["kcal"] + u["kcal_offset"]
    return {
        "phase_name": phase["name"],
        "kcal": kcal,
        "kcal_offset": u["kcal_offset"],
        "protein": phase["protein"],
        "fat": phase["fat"],
        "carbs": phase["carbs"],
        "shake": SHAKE,
    }


def set_kcal_offset(u, delta: int) -> int:
    new = max(-600, min(900, u["kcal_offset"] + delta))
    db.execute("UPDATE users SET kcal_offset=? WHERE chat_id=?", (new, u["chat_id"]))
    db.commit()
    return new


def supp_payload(u) -> dict:
    chat_id = u["chat_id"]
    today = today_date()
    marked_today = bool(
        db.execute(
            "SELECT 1 FROM supp_log WHERE chat_id=? AND date=?", (chat_id, today.isoformat())
        ).fetchone()
    )
    start = today if marked_today else today - dt.timedelta(days=1)
    streak = 0
    d = start
    while db.execute(
        "SELECT 1 FROM supp_log WHERE chat_id=? AND date=?", (chat_id, d.isoformat())
    ).fetchone():
        streak += 1
        d -= dt.timedelta(days=1)
    return {"supplements": SUPPLEMENTS, "marked_today": marked_today, "streak": streak}


def supp_mark(u) -> dict:
    db.execute(
        "INSERT OR IGNORE INTO supp_log (chat_id, date) VALUES (?,?)",
        (u["chat_id"], today_str()),
    )
    db.commit()
    return supp_payload(u)


def set_training_days(u, days: list) -> str:
    val = ",".join(sorted(set(str(int(d)) for d in days if 0 <= int(d) <= 6)))
    if not val:
        val = u["training_days"]
    db.execute("UPDATE users SET training_days=? WHERE chat_id=?", (val, u["chat_id"]))
    db.commit()
    return val


def plan_payload(u) -> dict:
    idx, _ = current_phase(u)
    phases = []
    for i, p in enumerate(PHASES):
        phases.append(
            {
                "index": i,
                "current": i == idx,
                "name": p["name"],
                "months": p["months"],
                "kcal": p["kcal"],
                "protein": p["protein"],
                "fat": p["fat"],
                "carbs": p["carbs"],
                "note": p["note"],
                "days": [
                    {
                        "code": d["code"],
                        "title": d["title"],
                        "exercises": [
                            {"key": e["key"], "name": e["name"], "sets": e["sets"], "reps": e["reps"], "kind": e["kind"]}
                            for e in d["exercises"]
                        ],
                    }
                    for d in p["days"]
                ],
            }
        )
    return {"start_weight": u["start_weight"], "goal_weight": u["goal_weight"], "phases": phases}


def users_with_reminders():
    return db.execute("SELECT * FROM users WHERE reminders=1").fetchall()


def has_session_today(chat_id: int) -> bool:
    return bool(
        db.execute(
            "SELECT 1 FROM sessions WHERE chat_id=? AND date=?", (chat_id, today_str())
        ).fetchone()
    )
