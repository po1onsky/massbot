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
