# -*- coding: utf-8 -*-
"""
Данные программы: 3 фазы по 3 месяца, питание, добавки.
Меняй здесь упражнения и цифры — логика бота их подхватит автоматически.

kind:
  "weight"     — вводишь вес и повторы:      "60 5 5 5"
  "bodyweight" — вводишь только повторы:     "8 7 6"
  "time"       — вводишь только секунды:     "40 40 35"
step — на сколько кг поднимать вес, когда все подходы выполнены.
"""

START_WEIGHT = 69.0
GOAL_WEIGHT = 80.0
# Плановый прирост кг/месяц по фазам (3 + 3 + 3 месяца = ~11 кг)
PLAN_RATES = [1.5, 1.2, 1.0]

PHASES = [
    {
        "name": "Фаза 1 · Линейная прогрессия",
        "months": "1–3",
        "kcal": 2900,
        "protein": 140,
        "fat": 65,
        "carbs": 440,
        "note": "Фулбоди, чередование A/B/A → B/A/B. Отдых в базе 3 мин, в подсобке 1,5–2 мин.",
        "deload_every": 0,
        "days": [
            {
                "code": "A",
                "title": "Фулбоди A",
                "exercises": [
                    {"key": "squat", "name": "Приседания со штангой", "sets": 3, "reps": 5, "kind": "weight", "step": 5.0},
                    {"key": "bench", "name": "Жим лёжа", "sets": 3, "reps": 5, "kind": "weight", "step": 2.5},
                    {"key": "row", "name": "Тяга штанги в наклоне", "sets": 3, "reps": 8, "kind": "weight", "step": 2.5},
                    {"key": "calf", "name": "Подъём на носки", "sets": 3, "reps": 12, "kind": "weight", "step": 5.0},
                    {"key": "plank", "name": "Планка", "sets": 3, "reps": 40, "kind": "time", "step": 0},
                ],
            },
            {
                "code": "B",
                "title": "Фулбоди B",
                "exercises": [
                    {"key": "rdl", "name": "Румынская тяга", "sets": 3, "reps": 5, "kind": "weight", "step": 5.0},
                    {"key": "ohp", "name": "Жим штанги стоя", "sets": 3, "reps": 6, "kind": "weight", "step": 2.5},
                    {"key": "pullup", "name": "Подтягивания", "sets": 3, "reps": 8, "kind": "bodyweight", "step": 0},
                    {"key": "legpress", "name": "Жим ногами", "sets": 3, "reps": 10, "kind": "weight", "step": 10.0},
                    {"key": "curl", "name": "Подъём на бицепс", "sets": 3, "reps": 12, "kind": "weight", "step": 2.5},
                    {"key": "triceps", "name": "Разгибания на блоке", "sets": 3, "reps": 12, "kind": "weight", "step": 2.5},
                ],
            },
        ],
    },
    {
        "name": "Фаза 2 · Рост объёма",
        "months": "4–6",
        "kcal": 3100,
        "protein": 155,
        "fat": 70,
        "carbs": 460,
        "note": "Сплит Верх / Низ / Фулбоди. Диапазон 6–12 повторов, последний подход — до 1–2 в запасе.",
        "deload_every": 0,
        "days": [
            {
                "code": "U",
                "title": "Верх",
                "exercises": [
                    {"key": "bench", "name": "Жим лёжа", "sets": 4, "reps": 7, "kind": "weight", "step": 2.5},
                    {"key": "row", "name": "Тяга штанги в наклоне", "sets": 4, "reps": 8, "kind": "weight", "step": 2.5},
                    {"key": "ohp", "name": "Жим штанги стоя", "sets": 3, "reps": 9, "kind": "weight", "step": 2.5},
                    {"key": "pullup", "name": "Подтягивания", "sets": 3, "reps": 9, "kind": "bodyweight", "step": 0},
                    {"key": "fly", "name": "Разводка гантелей", "sets": 3, "reps": 12, "kind": "weight", "step": 2.0},
                    {"key": "curl", "name": "Подъём на бицепс", "sets": 3, "reps": 12, "kind": "weight", "step": 2.5},
                    {"key": "triceps", "name": "Разгибания на блоке", "sets": 3, "reps": 12, "kind": "weight", "step": 2.5},
                ],
            },
            {
                "code": "L",
                "title": "Низ",
                "exercises": [
                    {"key": "squat", "name": "Приседания со штангой", "sets": 4, "reps": 7, "kind": "weight", "step": 5.0},
                    {"key": "rdl", "name": "Румынская тяга", "sets": 3, "reps": 8, "kind": "weight", "step": 5.0},
                    {"key": "legpress", "name": "Жим ногами", "sets": 3, "reps": 12, "kind": "weight", "step": 10.0},
                    {"key": "lunge", "name": "Выпады с гантелями", "sets": 3, "reps": 10, "kind": "weight", "step": 2.0},
                    {"key": "calf", "name": "Подъём на носки", "sets": 4, "reps": 15, "kind": "weight", "step": 5.0},
                    {"key": "plank", "name": "Планка", "sets": 3, "reps": 50, "kind": "time", "step": 0},
                ],
            },
            {
                "code": "F",
                "title": "Фулбоди",
                "exercises": [
                    {"key": "squat_light", "name": "Приседания (лёгкий день)", "sets": 3, "reps": 8, "kind": "weight", "step": 5.0},
                    {"key": "bench_light", "name": "Жим лёжа (лёгкий день)", "sets": 3, "reps": 9, "kind": "weight", "step": 2.5},
                    {"key": "pulldown", "name": "Тяга верхнего блока", "sets": 3, "reps": 10, "kind": "weight", "step": 2.5},
                    {"key": "dbpress", "name": "Жим гантелей сидя", "sets": 3, "reps": 10, "kind": "weight", "step": 2.0},
                    {"key": "legcurl", "name": "Сгибания ног", "sets": 3, "reps": 12, "kind": "weight", "step": 5.0},
                    {"key": "curl", "name": "Подъём на бицепс", "sets": 3, "reps": 12, "kind": "weight", "step": 2.5},
                ],
            },
        ],
    },
    {
        "name": "Фаза 3 · Объём + циклирование",
        "months": "7–9",
        "kcal": 3300,
        "protein": 165,
        "fat": 75,
        "carbs": 490,
        "note": "Тот же сплит, больше объёма. Каждая 4-я неделя — разгрузка: веса 60%, подходов вдвое меньше.",
        "deload_every": 4,
        "days": [
            {
                "code": "U",
                "title": "Верх",
                "exercises": [
                    {"key": "bench", "name": "Жим лёжа", "sets": 5, "reps": 6, "kind": "weight", "step": 2.5},
                    {"key": "row", "name": "Тяга штанги в наклоне", "sets": 4, "reps": 8, "kind": "weight", "step": 2.5},
                    {"key": "ohp", "name": "Жим штанги стоя", "sets": 4, "reps": 8, "kind": "weight", "step": 2.5},
                    {"key": "pullup", "name": "Подтягивания (можно с весом)", "sets": 4, "reps": 8, "kind": "bodyweight", "step": 0},
                    {"key": "fly", "name": "Разводка гантелей", "sets": 3, "reps": 14, "kind": "weight", "step": 2.0},
                    {"key": "curl", "name": "Подъём на бицепс", "sets": 4, "reps": 12, "kind": "weight", "step": 2.5},
                    {"key": "triceps", "name": "Разгибания на блоке", "sets": 4, "reps": 12, "kind": "weight", "step": 2.5},
                ],
            },
            {
                "code": "L",
                "title": "Низ",
                "exercises": [
                    {"key": "squat", "name": "Приседания со штангой", "sets": 5, "reps": 6, "kind": "weight", "step": 5.0},
                    {"key": "rdl", "name": "Румынская тяга", "sets": 4, "reps": 8, "kind": "weight", "step": 5.0},
                    {"key": "legpress", "name": "Жим ногами", "sets": 4, "reps": 12, "kind": "weight", "step": 10.0},
                    {"key": "lunge", "name": "Выпады с гантелями", "sets": 3, "reps": 12, "kind": "weight", "step": 2.0},
                    {"key": "calf", "name": "Подъём на носки", "sets": 4, "reps": 15, "kind": "weight", "step": 5.0},
                    {"key": "plank", "name": "Планка", "sets": 3, "reps": 60, "kind": "time", "step": 0},
                ],
            },
            {
                "code": "F",
                "title": "Фулбоди",
                "exercises": [
                    {"key": "squat_light", "name": "Приседания (лёгкий день)", "sets": 3, "reps": 8, "kind": "weight", "step": 5.0},
                    {"key": "bench_light", "name": "Жим лёжа (лёгкий день)", "sets": 4, "reps": 8, "kind": "weight", "step": 2.5},
                    {"key": "pulldown", "name": "Тяга верхнего блока", "sets": 4, "reps": 10, "kind": "weight", "step": 2.5},
                    {"key": "dbpress", "name": "Жим гантелей сидя", "sets": 3, "reps": 10, "kind": "weight", "step": 2.0},
                    {"key": "legcurl", "name": "Сгибания ног", "sets": 3, "reps": 12, "kind": "weight", "step": 5.0},
                    {"key": "triceps", "name": "Разгибания на блоке", "sets": 3, "reps": 14, "kind": "weight", "step": 2.5},
                ],
            },
        ],
    },
]

SUPPLEMENTS = [
    "Креатин моногидрат — 5 г, каждый день, включая дни отдыха",
    "Сывороточный протеин — 1–2 порции, чтобы добрать белок",
    "Витамин D3 — 2000 МЕ в зимние месяцы",
    "Омега-3 — если рыбы в рационе мало",
]

SHAKE = (
    "Калорийный шейк (~800 ккал, пьётся за 2 минуты):\n"
    "400 мл молока + 60 г овсянки + банан + 30 г арахисовой пасты + скуп протеина"
)


def phase_for_day(day_number: int) -> int:
    """day_number — сколько дней прошло с начала программы (0 = день старта)."""
    month = day_number // 30 + 1
    if month <= 3:
        return 0
    if month <= 6:
        return 1
    return 2


def planned_weight(day_number: int) -> float:
    """Плановый вес на N-й день программы по темпам PLAN_RATES."""
    w = START_WEIGHT
    left = day_number
    for rate in PLAN_RATES:
        block = min(left, 90)
        w += rate * block / 30.0
        left -= block
        if left <= 0:
            break
    if left > 0:  # программа кончилась — держим цель
        w = min(GOAL_WEIGHT, w)
    return round(w, 1)


# ===================================================================
# Генерируемая программа: для новых пользователей (после онбординга)
# программа собирается из паттернов движения + доступного оборудования,
# а не хранится готовым текстом. Легаси-PHASES выше не трогаем — старые
# пользователи (program_json пуст) продолжают жить на них.
#
# equipment пользователя:
#   "gym"      — зал, доступна штанга/тренажёры/гантели
#   "dumbbell" — дома с гантелями
#   "none"     — без оборудования, только свой вес
# ===================================================================

EXERCISE_POOL = {
    "squat": [
        {"equipment": "barbell", "name": "Приседания со штангой", "kind": "weight", "sets": 3, "reps": 6, "step": 5.0},
        {"equipment": "dumbbell", "name": "Присед с гантелью (гоблет)", "kind": "weight", "sets": 3, "reps": 10, "step": 2.0},
        {"equipment": "none", "name": "Приседания с своим весом", "kind": "bodyweight", "sets": 3, "reps": 20, "step": 0},
    ],
    "hinge": [
        {"equipment": "barbell", "name": "Румынская тяга со штангой", "kind": "weight", "sets": 3, "reps": 6, "step": 5.0},
        {"equipment": "dumbbell", "name": "Румынская тяга с гантелями", "kind": "weight", "sets": 3, "reps": 10, "step": 2.0},
        {"equipment": "none", "name": "Ягодичный мост", "kind": "bodyweight", "sets": 3, "reps": 20, "step": 0},
    ],
    "push_h": [
        {"equipment": "barbell", "name": "Жим штанги лёжа", "kind": "weight", "sets": 3, "reps": 6, "step": 2.5},
        {"equipment": "dumbbell", "name": "Жим гантелей лёжа", "kind": "weight", "sets": 3, "reps": 10, "step": 2.0},
        {"equipment": "none", "name": "Отжимания от пола", "kind": "bodyweight", "sets": 3, "reps": 15, "step": 0},
    ],
    "push_v": [
        {"equipment": "barbell", "name": "Жим штанги стоя", "kind": "weight", "sets": 3, "reps": 8, "step": 2.5},
        {"equipment": "dumbbell", "name": "Жим гантелей сидя", "kind": "weight", "sets": 3, "reps": 10, "step": 2.0},
        {"equipment": "none", "name": "Отжимания в упоре ногами выше рук", "kind": "bodyweight", "sets": 3, "reps": 12, "step": 0},
    ],
    "pull_h": [
        {"equipment": "barbell", "name": "Тяга штанги в наклоне", "kind": "weight", "sets": 3, "reps": 8, "step": 2.5},
        {"equipment": "dumbbell", "name": "Тяга гантели в наклоне", "kind": "weight", "sets": 3, "reps": 10, "step": 2.0},
        {"equipment": "none", "name": "Тяга полотенца/резинки к поясу", "kind": "bodyweight", "sets": 3, "reps": 20, "step": 0},
    ],
    "pull_v": [
        {"equipment": "barbell", "name": "Тяга верхнего блока", "kind": "weight", "sets": 3, "reps": 10, "step": 2.5},
        {"equipment": "dumbbell", "name": "Подтягивания в гравитроне/с резинкой", "kind": "bodyweight", "sets": 3, "reps": 8, "step": 0},
        {"equipment": "none", "name": "Подтягивания на турнике", "kind": "bodyweight", "sets": 3, "reps": 6, "step": 0},
    ],
    "legs_acc": [
        {"equipment": "barbell", "name": "Жим ногами", "kind": "weight", "sets": 3, "reps": 12, "step": 10.0},
        {"equipment": "dumbbell", "name": "Выпады с гантелями", "kind": "weight", "sets": 3, "reps": 10, "step": 2.0},
        {"equipment": "none", "name": "Выпады со своим весом", "kind": "bodyweight", "sets": 3, "reps": 20, "step": 0},
    ],
    "calf": [
        {"equipment": "barbell", "name": "Подъём на носки со штангой", "kind": "weight", "sets": 3, "reps": 15, "step": 5.0},
        {"equipment": "dumbbell", "name": "Подъём на носки с гантелями", "kind": "weight", "sets": 3, "reps": 15, "step": 2.0},
        {"equipment": "none", "name": "Подъём на носки со своим весом", "kind": "bodyweight", "sets": 3, "reps": 25, "step": 0},
    ],
    "arms": [
        {"equipment": "barbell", "name": "Подъём штанги на бицепс", "kind": "weight", "sets": 3, "reps": 12, "step": 2.5},
        {"equipment": "dumbbell", "name": "Подъём гантелей на бицепс", "kind": "weight", "sets": 3, "reps": 12, "step": 2.0},
        {"equipment": "none", "name": "Отжимания узким хватом", "kind": "bodyweight", "sets": 3, "reps": 15, "step": 0},
    ],
    "core": [
        {"equipment": "any", "name": "Планка", "kind": "time", "sets": 3, "reps": 40, "step": 0},
    ],
}

# Приоритет выбора оборудования внутри паттерна для каждого уровня доступа
# пользователя. "any" (например планка) подходит всем и проверяется всегда.
_TIER_PRIORITY = {
    "gym": ["barbell", "dumbbell", "none"],
    "dumbbell": ["dumbbell", "none"],
    "none": ["none"],
}


def pick_exercise(pattern: str, equipment: str) -> dict:
    options = {o["equipment"]: o for o in EXERCISE_POOL[pattern]}
    if "any" in options:
        return options["any"]
    for eq in _TIER_PRIORITY.get(equipment, ["none"]):
        if eq in options:
            return options[eq]
    return next(iter(options.values()))


# Стартовые рабочие веса для новичков (кг) — консервативно, дальше разгоняет
# обычная прогрессия. Для bodyweight-вариантов вес не нужен — не указываем.
BEGINNER_START = {
    ("squat", "gym"): 20.0, ("squat", "dumbbell"): 8.0,
    ("hinge", "gym"): 20.0, ("hinge", "dumbbell"): 8.0,
    ("push_h", "gym"): 20.0, ("push_h", "dumbbell"): 6.0,
    ("push_v", "gym"): 15.0, ("push_v", "dumbbell"): 4.0,
    ("pull_h", "gym"): 20.0, ("pull_h", "dumbbell"): 6.0,
    ("pull_v", "gym"): 25.0,
    ("legs_acc", "gym"): 40.0, ("legs_acc", "dumbbell"): 6.0,
    ("calf", "gym"): 20.0, ("calf", "dumbbell"): 6.0,
    ("arms", "gym"): 10.0, ("arms", "dumbbell"): 4.0,
}

# Сплит по числу тренировочных дней в неделю (1–6, больше 6 — берём как 6).
SPLIT_TEMPLATES = {
    1: [
        {"code": "A", "title": "Фулбоди", "patterns": ["squat", "hinge", "push_h", "pull_h", "legs_acc", "core"]},
    ],
    2: [
        {"code": "A", "title": "Фулбоди A", "patterns": ["squat", "push_h", "pull_h", "calf", "core"]},
        {"code": "B", "title": "Фулбоди B", "patterns": ["hinge", "push_v", "pull_v", "legs_acc", "arms"]},
    ],
    3: [
        {"code": "A", "title": "Фулбоди A", "patterns": ["squat", "push_h", "pull_h", "calf", "core"]},
        {"code": "B", "title": "Фулбоди B", "patterns": ["hinge", "push_v", "pull_v", "legs_acc", "arms"]},
        {"code": "C", "title": "Фулбоди C", "patterns": ["squat", "push_v", "pull_h", "legs_acc", "core"]},
    ],
    4: [
        {"code": "U1", "title": "Верх A", "patterns": ["push_h", "pull_h", "push_v", "arms", "core"]},
        {"code": "L1", "title": "Низ A", "patterns": ["squat", "hinge", "legs_acc", "calf"]},
        {"code": "U2", "title": "Верх B", "patterns": ["push_v", "pull_v", "push_h", "arms", "core"]},
        {"code": "L2", "title": "Низ B", "patterns": ["hinge", "squat", "legs_acc", "calf"]},
    ],
    5: [
        {"code": "P", "title": "Push (жимовая)", "patterns": ["push_h", "push_v", "arms", "core"]},
        {"code": "Pl", "title": "Pull (тяговая)", "patterns": ["pull_h", "pull_v", "arms"]},
        {"code": "L", "title": "Ноги", "patterns": ["squat", "hinge", "legs_acc", "calf"]},
        {"code": "U", "title": "Верх", "patterns": ["push_h", "pull_h", "push_v", "core"]},
        {"code": "Lw", "title": "Низ", "patterns": ["hinge", "squat", "legs_acc", "calf"]},
    ],
    6: [
        {"code": "P1", "title": "Push A", "patterns": ["push_h", "push_v", "arms", "core"]},
        {"code": "Pl1", "title": "Pull A", "patterns": ["pull_h", "pull_v", "arms"]},
        {"code": "L1", "title": "Ноги A", "patterns": ["squat", "hinge", "legs_acc", "calf"]},
        {"code": "P2", "title": "Push B", "patterns": ["push_v", "push_h", "arms", "core"]},
        {"code": "Pl2", "title": "Pull B", "patterns": ["pull_v", "pull_h", "arms"]},
        {"code": "L2", "title": "Ноги B", "patterns": ["hinge", "squat", "legs_acc", "calf"]},
    ],
}


def generate_workout_templates(equipment: str, days_count: int) -> list:
    days_count = max(1, min(int(days_count or 1), 6))
    template = SPLIT_TEMPLATES[days_count]
    days = []
    for d in template:
        exercises = []
        for pattern in d["patterns"]:
            ex = pick_exercise(pattern, equipment)
            exercises.append(
                {
                    "key": pattern,
                    "name": ex["name"],
                    "kind": ex["kind"],
                    "sets": ex["sets"],
                    "reps": ex["reps"],
                    "step": ex["step"],
                }
            )
        days.append({"code": d["code"], "title": d["title"], "exercises": exercises})
    return days


# ------------------------------------------------------------------ блоки/периодизация
# Один и тот же сплит (набор упражнений) держится весь срок — меняются подходы
# и повторы блоками, как раньше меняли фазы 1→2→3 (3×5 → 4×7-9 → 5×6, больше
# объёма). BLOCK_WEEKS — длина блока; стили зациклены, если программа длиннее
# трёх блоков (после блока 3 снова блок 1, но уже с накопленным рабочим весом).
BLOCK_WEEKS = 8

BLOCK_STYLES = [
    {
        "name": "Блок 1 · Линейная прогрессия",
        "note": "База: 3 подхода, умеренные повторы — привыкаем к весам и технике.",
        "sets_delta": 0,
        "reps_delta": 0,
        "time_delta": 0,
    },
    {
        "name": "Блок 2 · Рост объёма",
        "note": "Подходов и повторов больше — растим объём работы.",
        "sets_delta": 1,
        "reps_delta": 1,
        "time_delta": 10,
    },
    {
        "name": "Блок 3 · Плотность",
        "note": "Подходов максимум, повторы чуть ниже — тяжелее и плотнее.",
        "sets_delta": 2,
        "reps_delta": -1,
        "time_delta": 15,
    },
]


def block_style_for(block_index: int) -> dict:
    return BLOCK_STYLES[block_index % len(BLOCK_STYLES)]


def apply_block_style(ex: dict, style: dict) -> dict:
    sets = max(2, ex["sets"] + style["sets_delta"])
    if ex["kind"] == "time":
        reps = max(20, ex["reps"] + style.get("time_delta", 0))
    else:
        reps = max(4, ex["reps"] + style.get("reps_delta", 0))
    return {**ex, "sets": sets, "reps": reps}


# ------------------------------------------------------------------ питание: каталог продуктов
# (название, белки/100г, жиры/100г, углеводы/100г) — небольшой стартовый набор,
# пользователь может дополнять своими продуктами прямо в приложении.
FOOD_CATALOG = [
    ("Куриная грудка", 23, 1, 0),
    ("Куриное бедро без кожи", 18, 10, 0),
    ("Говядина постная", 22, 10, 0),
    ("Яйцо куриное", 13, 11, 1),
    ("Творог 5%", 18, 5, 3),
    ("Творог 9%", 17, 9, 2),
    ("Греческий йогурт", 9, 5, 4),
    ("Молоко 2.5%", 3, 2.5, 4.7),
    ("Рис отварной", 2.5, 0.3, 28),
    ("Гречка отварная", 4, 1, 20),
    ("Овсянка (сухая)", 12, 6, 60),
    ("Макароны отварные", 5, 1, 25),
    ("Картофель отварной", 2, 0.1, 17),
    ("Хлеб пшеничный", 8, 3, 50),
    ("Банан", 1.1, 0.3, 21),
    ("Яблоко", 0.4, 0.2, 10),
    ("Авокадо", 2, 15, 9),
    ("Арахисовая паста", 25, 50, 20),
    ("Оливковое масло", 0, 100, 0),
    ("Миндаль", 21, 49, 22),
    ("Лосось", 20, 13, 0),
    ("Тунец консервированный", 24, 1, 0),
    ("Сывороточный протеин (порошок)", 80, 8, 8),
    ("Сыр твёрдый", 25, 27, 0),
    ("Фасоль отварная", 8, 0.5, 20),
    ("Чечевица отварная", 9, 0.4, 20),
]
