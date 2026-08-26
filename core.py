# -*- coding: utf-8 -*-
"""
Общая логика и работа с БД: используется и телеграм-ботом (напоминания,
/start), и API мини-приложения. Ничего не знает про python-telegram-bot —
только данные и SQLite.
"""

import json
import os
import sqlite3
import datetime as dt
from typing import Optional
from zoneinfo import ZoneInfo

from program import (
    PHASES,
    SUPPLEMENTS,
    SHAKE,
    FOOD_CATALOG,
    BEGINNER_START,
    BLOCK_WEEKS,
    phase_for_day,
    planned_weight,
    generate_workout_templates,
    block_style_for,
    apply_block_style,
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
        CREATE TABLE IF NOT EXISTS foods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_chat_id INTEGER,
            name TEXT NOT NULL,
            protein REAL NOT NULL,
            fat REAL NOT NULL,
            carbs REAL NOT NULL
        );
        CREATE TABLE IF NOT EXISTS food_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            food_id INTEGER,
            grams REAL,
            kcal REAL NOT NULL,
            protein REAL NOT NULL,
            fat REAL NOT NULL,
            carbs REAL NOT NULL,
            label TEXT
        );
        """
    )
    # Миграции для баз, созданных до появления новых колонок/онбординга.
    # Всем существующим строкам onboarded проставляется 1 (DEFAULT) — их
    # текущая программа (легаси PHASES) продолжает работать как раньше;
    # новые пользователи создаются явно с onboarded=0 (см. ensure_user).
    cols = {r["name"] for r in db.execute("PRAGMA table_info(users)")}
    migrations = [
        ("first_name", "TEXT"),
        ("sex", "TEXT"),
        ("height_cm", "REAL"),
        ("age", "INTEGER"),
        ("goal", "TEXT"),
        ("target_weeks", "INTEGER"),
        ("equipment", "TEXT NOT NULL DEFAULT 'gym'"),
        ("experience", "TEXT NOT NULL DEFAULT 'experienced'"),
        ("onboarded", "INTEGER NOT NULL DEFAULT 1"),
        ("program_json", "TEXT"),
        ("kcal_base", "INTEGER"),
        ("protein_g", "INTEGER"),
        ("fat_g", "INTEGER"),
        ("carbs_g", "INTEGER"),
    ]
    for name, decl in migrations:
        if name not in cols:
            db.execute(f"ALTER TABLE users ADD COLUMN {name} {decl}")
    db.commit()
    seed_foods_if_empty()


def seed_foods_if_empty() -> None:
    n = db.execute("SELECT COUNT(*) c FROM foods WHERE owner_chat_id IS NULL").fetchone()["c"]
    if n == 0:
        db.executemany(
            "INSERT INTO foods (owner_chat_id, name, protein, fat, carbs) VALUES (NULL,?,?,?,?)",
            FOOD_CATALOG,
        )
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
        # Новый пользователь: onboarded=0 — программу и цель он ещё не задал,
        # фронтенд покажет визард настройки вместо дашборда. start/goal_weight
        # тут просто заглушки, онбординг их сразу перезапишет.
        db.execute(
            "INSERT INTO users (chat_id, start_date, start_weight, goal_weight, training_days, first_name, onboarded)"
            " VALUES (?,?,?,?,?,?,0)",
            (chat_id, today_str(), 0.0, 0.0, DEFAULT_TRAINING_DAYS, first_name),
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


def is_new_style(u) -> bool:
    return u["program_json"] is not None


def current_phase(u):
    """Легаси: индекс/данные фазы из статичной PHASES-программы."""
    idx = phase_for_day(day_number(u))
    return idx, PHASES[idx]


def current_phase_idx(u) -> int:
    if is_new_style(u):
        return 0  # у сгенерированной программы одна непрерывная "фаза"
    idx = phase_for_day(day_number(u))
    return idx


def get_program_days(u) -> list:
    """Базовый (без учёта блока) сплит — конкретные упражнения под паттерн/
    оборудование, сеты/повторы ещё не подогнаны под текущий блок."""
    if is_new_style(u):
        return json.loads(u["program_json"])
    _, phase = current_phase(u)
    return phase["days"]


def current_block_index(u) -> int:
    """0-based индекс блока периодизации (8 недель на блок, зациклено)."""
    week = day_number(u) // 7
    return week // BLOCK_WEEKS


def total_blocks(u) -> Optional[int]:
    """Сколько блоков во всей программе. None — открытый срок (без цели по неделям)."""
    if not u["target_weeks"]:
        return None
    return max(1, -(-u["target_weeks"] // BLOCK_WEEKS))  # ceil division


def get_program_days_for_block(u, block_index: int) -> list:
    """Сплит с сетами/повторами, подогнанными под стиль конкретного блока —
    сами упражнения (и рабочий вес, ключуемый по паттерну) не меняются между
    блоками, продолжая копить прогресс."""
    base_days = get_program_days(u)
    if not is_new_style(u):
        return base_days
    style = block_style_for(block_index)
    return [
        {
            "code": d["code"],
            "title": d["title"],
            "exercises": [apply_block_style(e, style) for e in d["exercises"]],
        }
        for d in base_days
    ]


def phase_display(u) -> str:
    if is_new_style(u):
        week = day_number(u) // 7 + 1
        total_weeks = u["target_weeks"]
        style = block_style_for(current_block_index(u))
        if total_weeks:
            return f"{style['name']} · неделя {week} из {total_weeks}"
        return f"{style['name']} · неделя {week}"
    _, phase = current_phase(u)
    return phase["name"]


def total_days_horizon(u) -> Optional[int]:
    """Общая длина программы в днях — для отображения «день N из M». None — открытый срок."""
    if is_new_style(u):
        return u["target_weeks"] * 7 if u["target_weeks"] else None
    return 270


def is_deload(u) -> bool:
    if is_new_style(u):
        # Единое правило вместо привязки к конкретной фазе: каждая 4-я неделя
        # от старта программы — разгрузочная, независимо от сплита/цели.
        week = day_number(u) // 7
        return week % 4 == 3
    idx = current_phase_idx(u)
    phase = PHASES[idx]
    every = phase.get("deload_every", 0)
    if not every:
        return False
    phase_start_day = [0, 90, 180][idx]
    week_in_phase = max(0, (day_number(u) - phase_start_day)) // 7
    return week_in_phase % every == every - 1


def next_day_plan(u):
    """Какая тренировка по счёту в программе (по факту записанных тренировок).
    Ротация A/B/C идёт по общему числу тренировок и не сбрасывается на
    границе блока — блок просто подгоняет подходы/повторы того же дня."""
    idx = current_phase_idx(u)
    n = db.execute(
        "SELECT COUNT(*) c FROM sessions WHERE chat_id=? AND phase=?",
        (u["chat_id"], idx),
    ).fetchone()["c"]
    days = get_program_days_for_block(u, current_block_index(u)) if is_new_style(u) else get_program_days(u)
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
    day = next_day_plan(u)
    deload = is_deload(u)
    return {
        "day_title": day["title"],
        "day_code": day["code"],
        "phase_index": current_phase_idx(u),
        "phase_name": phase_display(u),
        "day_number": day_number(u) + 1,
        "deload": deload,
        "logged_today": has_session_today(u["chat_id"]),
        "exercises": [exercise_view(u["chat_id"], e, deload) for e in day["exercises"]],
    }


def log_workout(u, entries: list, skipped: list) -> dict:
    """entries: [{key, weight, reps:[int,...]}]. Возвращает заметки по каждому упражнению."""
    idx = current_phase_idx(u)
    day = next_day_plan(u)
    deload = is_deload(u)
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


def planned_weight_for(u, d: int) -> float:
    """Плановый вес на N-й день программы — обобщённая версия planned_weight()
    для сгенерированных (не легаси) программ: линейная интерполяция от
    старта к цели за target_weeks. Без срока (открытая цель) — держим старт."""
    if not is_new_style(u):
        return planned_weight(d)
    weeks = u["target_weeks"]
    start, goal = u["start_weight"], u["goal_weight"]
    if not weeks:
        return start
    total_days = weeks * 7
    frac = min(1.0, max(0.0, d / total_days)) if total_days else 1.0
    return round(start + (goal - start) * frac, 1)


def me_payload(u) -> dict:
    return {
        "chat_id": u["chat_id"],
        "first_name": u["first_name"],
        "start_date": u["start_date"],
        "start_weight": u["start_weight"],
        "goal_weight": u["goal_weight"],
        "day_number": day_number(u),
        "total_days": total_days_horizon(u),
        "phase_index": current_phase_idx(u),
        "phase_name": phase_display(u),
        "deload": is_deload(u),
        "kcal_offset": u["kcal_offset"],
        "training_days": u["training_days"],
        "onboarded": bool(u["onboarded"]),
        "goal": u["goal"],
        "target_weeks": u["target_weeks"],
        "sex": u["sex"],
        "height_cm": u["height_cm"],
        "age": u["age"],
        "equipment": u["equipment"],
        "experience": u["experience"],
    }


def stats_payload(u) -> dict:
    wm = weight_map(u["chat_id"])
    today = today_date()
    d = day_number(u)
    ses = db.execute(
        "SELECT COUNT(*) c FROM sessions WHERE chat_id=?", (u["chat_id"],)
    ).fetchone()["c"]

    if not wm:
        return {
            "has_data": False,
            "day_number": d + 1,
            "total_days": total_days_horizon(u),
            "phase_name": phase_display(u),
            "sessions_logged": ses,
        }

    last_date = max(wm)
    last = wm[last_date]
    avg = window_avg(wm, today)
    plan = planned_weight_for(u, d)
    return {
        "has_data": True,
        "day_number": d + 1,
        "total_days": total_days_horizon(u),
        "phase_name": phase_display(u),
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
    horizon = total_days_horizon(u) or 90
    plan_dates = [(start + dt.timedelta(days=i)).isoformat() for i in range(0, horizon + 1, 5)]
    plan_weights = [planned_weight_for(u, i) for i in range(0, horizon + 1, 5)]
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
    if is_new_style(u) and u["kcal_base"] is not None:
        kcal = u["kcal_base"] + u["kcal_offset"]
        return {
            "phase_name": phase_display(u),
            "kcal": kcal,
            "kcal_offset": u["kcal_offset"],
            "protein": u["protein_g"],
            "fat": u["fat_g"],
            "carbs": u["carbs_g"],
            "shake": SHAKE,
        }
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
    if is_new_style(u):
        months_text = f"{u['target_weeks']} нед." if u["target_weeks"] else "без ограничения по срокам"
        kcal = (u["kcal_base"] or 0) + u["kcal_offset"]
        n_blocks = total_blocks(u)
        cur_block = current_block_index(u)
        # Открытый срок (или очень длинная программа) — не рисуем блоки без
        # конца: показываем один цикл стилей (3 блока), но не меньше, чем
        # нужно, чтобы включить текущий блок; жёсткий потолок на 12 карточек.
        shown = max(n_blocks or 3, cur_block + 1)
        shown = min(shown, 12)
        phases = []
        for b in range(shown):
            style = block_style_for(b)
            week_from = b * BLOCK_WEEKS + 1
            week_to = (b + 1) * BLOCK_WEEKS if not u["target_weeks"] else min((b + 1) * BLOCK_WEEKS, u["target_weeks"])
            phases.append(
                {
                    "index": b,
                    "current": b == cur_block,
                    "name": style["name"],
                    "months": f"нед. {week_from}–{week_to}",
                    "kcal": kcal,
                    "protein": u["protein_g"],
                    "fat": u["fat_g"],
                    "carbs": u["carbs_g"],
                    "note": f"{style['note']} Разгрузка каждую 4-ю неделю: веса 60%, подходов вдвое меньше.",
                    "days": get_program_days_for_block(u, b),
                }
            )
        return {
            "start_weight": u["start_weight"],
            "goal_weight": u["goal_weight"],
            "duration_text": months_text,
            "phases": phases,
        }
    idx, _ = current_phase(u)
    phases = []
    for i, p in enumerate(PHASES):
        phases.append(
            {
                "index": i,
                "current": i == idx,
                "name": p["name"],
                "months": f"мес. {p['months']}",  # легаси-диапазон ("1–3") — префикс тут, а не во фронтенде
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
    return {
        "start_weight": u["start_weight"],
        "goal_weight": u["goal_weight"],
        "duration_text": "9 месяцев",
        "phases": phases,
    }


def users_with_reminders():
    # onboarded=1 — не дёргаем напоминаниями тех, кто ещё не прошёл настройку
    return db.execute("SELECT * FROM users WHERE reminders=1 AND onboarded=1").fetchall()


def has_session_today(chat_id: int) -> bool:
    return bool(
        db.execute(
            "SELECT 1 FROM sessions WHERE chat_id=? AND date=?", (chat_id, today_str())
        ).fetchone()
    )


# ===================================================================
# Онбординг: рост/пол/возраст → калории по формуле, цель (набор/сброс) +
# срок → проверка реалистичности скорости, оборудование/опыт/дни → сплит
# из program.generate_workout_templates(). Легаси-пользователи (у которых
# program_json уже пуст) этот путь не проходят и не затрагиваются.
# ===================================================================

SEX_MULT = {"male": 5, "female": -161}


def bmr_tdee(sex: str, weight: float, height_cm: float, age: int, training_days_count: int, active_job: bool) -> float:
    bmr = 10 * weight + 6.25 * height_cm - 5 * age + SEX_MULT.get(sex, -78)
    base_mult = 1.35 if active_job else 1.2
    mult = min(1.9, base_mult + 0.05 * training_days_count)
    return bmr * mult


def calc_calorie_target(sex, weight, height_cm, age, training_days_count, active_job, goal):
    tdee = bmr_tdee(sex, weight, height_cm, age, training_days_count, active_job)
    factor = 1.15 if goal == "gain" else 0.82
    kcal = round(tdee * factor / 50) * 50
    protein_g = round(weight * 1.8)
    fat_g = round(weight * 0.9)
    carbs_kcal = kcal - protein_g * 4 - fat_g * 9
    carbs_g = max(50, round(carbs_kcal / 4))
    return kcal, protein_g, fat_g, carbs_g


def evaluate_goal_rate(goal: str, current_weight: float, target_weight: float, weeks: Optional[int]):
    """Возвращает (кг/нед, текст предупреждения|None). Не блокирует — только предупреждает."""
    delta = abs(target_weight - current_weight)
    if not weeks or weeks <= 0 or delta == 0:
        return 0.0, None
    rate = delta / weeks
    pct = rate / current_weight * 100
    safe_max_pct = 0.5 if goal == "gain" else 0.8
    warning = None
    if pct > safe_max_pct:
        min_weeks = max(1, round(delta / (current_weight * safe_max_pct / 100)))
        warning = (
            f"Это ≈{rate:.2f} кг/нед ({pct:.1f}% веса в неделю). Обычно безопасно "
            f"до {safe_max_pct:.1f}%/нед — комфортнее растянуть срок примерно до {min_weeks} нед."
        )
    return round(rate, 2), warning


def _apply_program(chat_id: int, equipment: str, training_days: list, experience: str, starting_weights: Optional[dict] = None) -> list:
    days_count = max(1, len(training_days))
    program_days = generate_workout_templates(equipment, days_count)
    db.execute(
        "UPDATE users SET program_json=? WHERE chat_id=?",
        (json.dumps(program_days, ensure_ascii=False), chat_id),
    )
    starting = starting_weights or {}
    seen = set()
    for d in program_days:
        for e in d["exercises"]:
            if e["key"] in seen or e["kind"] != "weight":
                continue
            seen.add(e["key"])
            w = starting.get(e["key"]) if experience == "experienced" else BEGINNER_START.get((e["key"], equipment))
            if w:
                # INSERT OR IGNORE — не затираем уже накопленный прогресс, если
                # это упражнение у пользователя встречалось и раньше.
                db.execute(
                    "INSERT OR IGNORE INTO ex_state (chat_id, ex_key, working_weight, fail_streak) VALUES (?,?,?,0)",
                    (chat_id, e["key"], w),
                )
    db.commit()
    return program_days


def complete_onboarding(chat_id: int, data: dict) -> dict:
    training_days = sorted({int(d) for d in data["training_days"] if 0 <= int(d) <= 6})
    training_days_val = ",".join(map(str, training_days)) or DEFAULT_TRAINING_DAYS
    days_count = max(1, len(training_days))

    kcal, protein_g, fat_g, carbs_g = calc_calorie_target(
        data["sex"], data["current_weight"], data["height_cm"], data["age"],
        days_count, data["active_job"], data["goal"],
    )

    db.execute(
        """UPDATE users SET
            start_date=?, start_weight=?, goal_weight=?, sex=?, height_cm=?, age=?,
            goal=?, target_weeks=?, equipment=?, experience=?, training_days=?,
            kcal_base=?, protein_g=?, fat_g=?, carbs_g=?, kcal_offset=0, onboarded=1
        WHERE chat_id=?""",
        (
            today_str(), data["current_weight"], data["target_weight"], data["sex"],
            data["height_cm"], data["age"], data["goal"], data.get("target_weeks"),
            data["equipment"], data["experience"], training_days_val,
            kcal, protein_g, fat_g, carbs_g, chat_id,
        ),
    )
    db.commit()

    _apply_program(chat_id, data["equipment"], training_days, data["experience"], data.get("starting_weights"))

    u = get_user(chat_id)
    rate, warning = evaluate_goal_rate(
        data["goal"], data["current_weight"], data["target_weight"], data.get("target_weeks")
    )
    return {
        "me": me_payload(u),
        "today": today_payload(u),
        "rate_per_week": rate,
        "warning": warning,
    }


def update_goal(u, goal: str, target_weight: float, target_weeks: Optional[int]) -> dict:
    """Меняет цель и срок, пересчитывает калории от текущего веса — историю
    взвешиваний/тренировок не трогает, только целевую точку вперёд."""
    wm = weight_map(u["chat_id"])
    current = wm[max(wm)] if wm else u["start_weight"]
    kcal, protein_g, fat_g, carbs_g = calc_calorie_target(
        u["sex"] or "male", current, u["height_cm"] or 175, u["age"] or 30,
        len((u["training_days"] or "0").split(",")), True, goal,
    )
    db.execute(
        """UPDATE users SET goal=?, start_date=?, start_weight=?, goal_weight=?, target_weeks=?,
           kcal_base=?, protein_g=?, fat_g=?, carbs_g=?, kcal_offset=0 WHERE chat_id=?""",
        (goal, today_str(), current, target_weight, target_weeks, kcal, protein_g, fat_g, carbs_g, u["chat_id"]),
    )
    db.commit()
    rate, warning = evaluate_goal_rate(goal, current, target_weight, target_weeks)
    return {"me": me_payload(get_user(u["chat_id"])), "rate_per_week": rate, "warning": warning}


def update_program(u, equipment: str, experience: str, training_days: list, starting_weights: Optional[dict] = None) -> dict:
    training_days = sorted({int(d) for d in training_days if 0 <= int(d) <= 6})
    training_days_val = ",".join(map(str, training_days)) or u["training_days"]
    db.execute(
        "UPDATE users SET training_days=?, equipment=?, experience=? WHERE chat_id=?",
        (training_days_val, equipment, experience, u["chat_id"]),
    )
    db.commit()
    _apply_program(u["chat_id"], equipment, training_days, experience, starting_weights)
    return me_payload(get_user(u["chat_id"]))


# ------------------------------------------------------------------ дневник питания
def food_search(query: str, chat_id: int, limit: int = 20) -> list:
    # SQLite LIKE регистронезависим только для ASCII — кириллицу приходится
    # сравнивать в Python (str.lower() умеет её нормально); каталог маленький,
    # так что тянуть всё и фильтровать на лету не проблема.
    q = query.strip().lower()
    rows = db.execute(
        "SELECT id, owner_chat_id, name, protein, fat, carbs FROM foods"
        " WHERE owner_chat_id IS NULL OR owner_chat_id=?",
        (chat_id,),
    ).fetchall()
    if q:
        rows = [r for r in rows if q in r["name"].lower()]
    rows = sorted(rows, key=lambda r: (r["owner_chat_id"] is None, r["name"]))[:limit]
    return [{"id": r["id"], "name": r["name"], "protein": r["protein"], "fat": r["fat"], "carbs": r["carbs"]} for r in rows]


def add_custom_food(chat_id: int, name: str, protein: float, fat: float, carbs: float) -> int:
    cur = db.execute(
        "INSERT INTO foods (owner_chat_id, name, protein, fat, carbs) VALUES (?,?,?,?,?)",
        (chat_id, name, protein, fat, carbs),
    )
    db.commit()
    return cur.lastrowid


def log_food_by_item(chat_id: int, food_id: int, grams: float) -> None:
    f = db.execute("SELECT * FROM foods WHERE id=?", (food_id,)).fetchone()
    if not f:
        raise ValueError("продукт не найден")
    factor = grams / 100.0
    kcal = round((f["protein"] * 4 + f["fat"] * 9 + f["carbs"] * 4) * factor)
    protein = round(f["protein"] * factor, 1)
    fat = round(f["fat"] * factor, 1)
    carbs = round(f["carbs"] * factor, 1)
    db.execute(
        "INSERT INTO food_log (chat_id, date, food_id, grams, kcal, protein, fat, carbs, label)"
        " VALUES (?,?,?,?,?,?,?,?,?)",
        (chat_id, today_str(), food_id, grams, kcal, protein, fat, carbs, f["name"]),
    )
    db.commit()


def log_food_manual(chat_id: int, label: str, kcal: float, protein: float = 0, fat: float = 0, carbs: float = 0) -> None:
    db.execute(
        "INSERT INTO food_log (chat_id, date, food_id, grams, kcal, protein, fat, carbs, label)"
        " VALUES (?,?,NULL,NULL,?,?,?,?,?)",
        (chat_id, today_str(), kcal, protein, fat, carbs, label or "Приём пищи"),
    )
    db.commit()


def food_log_today(chat_id: int) -> dict:
    rows = db.execute(
        "SELECT id, label, grams, kcal, protein, fat, carbs FROM food_log"
        " WHERE chat_id=? AND date=? ORDER BY id",
        (chat_id, today_str()),
    ).fetchall()
    entries = [dict(r) for r in rows]
    totals = {
        "kcal": round(sum(r["kcal"] for r in entries)),
        "protein": round(sum(r["protein"] for r in entries), 1),
        "fat": round(sum(r["fat"] for r in entries), 1),
        "carbs": round(sum(r["carbs"] for r in entries), 1),
    }
    return {"entries": entries, "totals": totals}


def delete_food_log(chat_id: int, entry_id: int) -> None:
    db.execute("DELETE FROM food_log WHERE chat_id=? AND id=?", (chat_id, entry_id))
    db.commit()
