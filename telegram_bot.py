# -*- coding: utf-8 -*-
"""
Тонкий телеграм-бот: весь функционал живёт в мини-приложении, бот только
открывает его (кнопка меню + /start) и присылает напоминания.

Работает через вебхук (не polling) — это встраивается в FastAPI-процесс,
см. api.py. Здесь только сборка Application и хендлеры.
"""

import logging
import os
import datetime as dt
from typing import Optional

from telegram import (
    BotCommand,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    MenuButtonWebApp,
    Update,
    WebAppInfo,
)
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

import core

log = logging.getLogger("massbot.bot")

PUBLIC_URL = os.environ.get("PUBLIC_URL", "").rstrip("/")
MORNING_HOUR = 8, 30   # напоминание взвеситься
WORKOUT_HOUR = 18, 0   # напоминание о тренировке


def _webapp_markup() -> Optional[InlineKeyboardMarkup]:
    if not PUBLIC_URL:
        return None
    return InlineKeyboardMarkup(
        [[InlineKeyboardButton("🏋 Открыть приложение", web_app=WebAppInfo(url=PUBLIC_URL))]]
    )


async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    u = core.ensure_user(update.effective_chat.id, update.effective_user.first_name if update.effective_user else None)
    if not u["onboarded"]:
        text = (
            "Погнали. Сначала — пара вопросов в приложении (рост, вес, цель, "
            "оборудование), это займёт минуту, дальше программа и калории "
            "считаются сами.\n\nОткрывай кнопкой ниже или через меню чата."
        )
    else:
        weeks_part = f" за {u['target_weeks']} нед." if u["target_weeks"] else ""
        text = (
            f"Погнали. Старт {u['start_date']}, {u['start_weight']:g} кг → цель {u['goal_weight']:g} кг{weeks_part}.\n\n"
            "Всё в приложении: тренировка на сегодня, запись подходов, вес, статистика, питание, добавки.\n"
            "Открывай кнопкой ниже или через меню чата (значок рядом со скрепкой)."
        )
    await update.message.reply_text(text, reply_markup=_webapp_markup())


async def cmd_help(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Весь функционал — в мини-приложении. Открой его кнопкой в меню чата "
        "или командой /start.",
        reply_markup=_webapp_markup(),
    )


async def on_text(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Я теперь работаю через приложение — открой его кнопкой в меню чата.",
        reply_markup=_webapp_markup(),
    )


# ------------------------------------------------------------------ напоминания
async def job_morning(ctx: ContextTypes.DEFAULT_TYPE):
    for u in core.users_with_reminders():
        if core.today_str() in core.weight_map(u["chat_id"]):
            continue
        await ctx.bot.send_message(
            u["chat_id"], "Взвесься натощак и запиши вес в приложении.", reply_markup=_webapp_markup()
        )


async def job_workout(ctx: ContextTypes.DEFAULT_TYPE):
    wd = dt.datetime.now(core.TZ).weekday()
    for u in core.users_with_reminders():
        if str(wd) not in u["training_days"].split(","):
            continue
        if core.has_session_today(u["chat_id"]):
            continue
        payload = core.today_payload(u)
        await ctx.bot.send_message(
            u["chat_id"],
            f"Сегодня по плану: {payload['day_title']}. Открой приложение для деталей.",
            reply_markup=_webapp_markup(),
        )


def build_application() -> Application:
    token = os.environ.get("BOT_TOKEN", "")
    if not token:
        raise SystemExit("Не задан BOT_TOKEN")
    # updater=None — вебхуком управляем сами через FastAPI, PTB свою веб-часть не поднимает
    application = Application.builder().token(token).updater(None).build()

    application.add_handler(CommandHandler("start", cmd_start))
    application.add_handler(CommandHandler("help", cmd_help))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text))

    if application.job_queue:
        application.job_queue.run_daily(job_morning, dt.time(*MORNING_HOUR, tzinfo=core.TZ))
        application.job_queue.run_daily(job_workout, dt.time(*WORKOUT_HOUR, tzinfo=core.TZ))

    return application


async def configure_bot(application: Application) -> None:
    """Регистрирует команды и постоянную кнопку меню, открывающую мини-приложение."""
    await application.bot.set_my_commands(
        [BotCommand("start", "Начать / открыть приложение"), BotCommand("help", "Помощь")]
    )
    if PUBLIC_URL:
        await application.bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(text="Тренировки", web_app=WebAppInfo(url=PUBLIC_URL))
        )
    else:
        log.warning("PUBLIC_URL не задан — кнопка меню с мини-приложением не настроена")
