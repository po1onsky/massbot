# -*- coding: utf-8 -*-
"""
FastAPI: отдаёт собранный фронтенд мини-приложения, REST API для него,
и принимает вебхук телеграм-бота. Один процесс, один порт.

Запуск:  BOT_TOKEN=xxx PUBLIC_URL=https://... uvicorn api:app --host 0.0.0.0 --port 8000
"""

import hashlib
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from telegram import Update

import core
import telegram_bot
from auth import AuthUser, get_current_user

logging.basicConfig(format="%(asctime)s %(levelname)s %(name)s: %(message)s", level=logging.INFO)
log = logging.getLogger("massbot.api")

BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
WEBHOOK_SECRET = os.environ.get("WEBHOOK_SECRET") or hashlib.sha256(BOT_TOKEN.encode()).hexdigest()[:32]
DEV_MODE = os.environ.get("DEV_MODE", "0") == "1"

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

telegram_app = telegram_bot.build_application() if BOT_TOKEN else None


@asynccontextmanager
async def lifespan(app: FastAPI):
    core.init_db()
    if telegram_app is not None:
        async with telegram_app:
            await telegram_app.start()
            await telegram_bot.configure_bot(telegram_app)
            if telegram_bot.PUBLIC_URL:
                webhook_url = f"{telegram_bot.PUBLIC_URL}/telegram/webhook/{WEBHOOK_SECRET}"
                await telegram_app.bot.set_webhook(url=webhook_url, allowed_updates=Update.ALL_TYPES)
                log.info("Вебхук установлен: %s", webhook_url)
            else:
                log.warning("PUBLIC_URL не задан — вебхук не установлен, бот не будет получать апдейты")
            yield
            await telegram_app.stop()
    else:
        log.warning("BOT_TOKEN не задан — бот отключён, работает только API/фронтенд")
        yield


app = FastAPI(title="Massbot mini app", lifespan=lifespan)

if DEV_MODE:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )


# ------------------------------------------------------------------ телеграм вебхук
@app.post("/telegram/webhook/{secret}")
async def telegram_webhook(secret: str, request: Request):
    if telegram_app is None or secret != WEBHOOK_SECRET:
        raise HTTPException(status_code=404)
    data = await request.json()
    update = Update.de_json(data, telegram_app.bot)
    await telegram_app.process_update(update)
    return Response(status_code=200)


# ------------------------------------------------------------------ API мини-приложения
api = FastAPI()


def _user(auth: AuthUser):
    return core.ensure_user(auth.id, auth.first_name)


@api.get("/me")
def get_me(auth: AuthUser = Depends(get_current_user)):
    return core.me_payload(_user(auth))


@api.get("/today")
def get_today(auth: AuthUser = Depends(get_current_user)):
    return core.today_payload(_user(auth))


class LogEntry(BaseModel):
    key: str
    weight: float = 0
    reps: list[int] = []


class LogIn(BaseModel):
    entries: list[LogEntry] = []
    skipped: list[str] = []


@api.post("/log")
def post_log(body: LogIn, auth: AuthUser = Depends(get_current_user)):
    u = _user(auth)
    entries = [e.model_dump() for e in body.entries]
    return core.log_workout(u, entries, body.skipped)


class WeightIn(BaseModel):
    kg: float


@api.post("/weight")
def post_weight(body: WeightIn, auth: AuthUser = Depends(get_current_user)):
    if not 40 <= body.kg <= 200:
        raise HTTPException(status_code=400, detail="Похоже на опечатку — проверь число")
    u = _user(auth)
    core.save_weight(u["chat_id"], body.kg)
    return core.stats_payload(u)


@api.get("/stats")
def get_stats(auth: AuthUser = Depends(get_current_user)):
    return core.stats_payload(_user(auth))


@api.get("/plot")
def get_plot(auth: AuthUser = Depends(get_current_user)):
    return core.plot_payload(_user(auth))


@api.get("/food")
def get_food(auth: AuthUser = Depends(get_current_user)):
    return core.food_payload(_user(auth))


class KcalIn(BaseModel):
    delta: int


@api.post("/kcal")
def post_kcal(body: KcalIn, auth: AuthUser = Depends(get_current_user)):
    u = _user(auth)
    new_offset = core.set_kcal_offset(u, body.delta)
    return {"kcal_offset": new_offset, **core.food_payload(core.get_user(u["chat_id"]))}


@api.get("/supp")
def get_supp(auth: AuthUser = Depends(get_current_user)):
    return core.supp_payload(_user(auth))


@api.post("/supp/mark")
def post_supp_mark(auth: AuthUser = Depends(get_current_user)):
    return core.supp_mark(_user(auth))


@api.get("/plan")
def get_plan(auth: AuthUser = Depends(get_current_user)):
    return core.plan_payload(_user(auth))


class DaysIn(BaseModel):
    days: list[int]


@api.post("/days")
def post_days(body: DaysIn, auth: AuthUser = Depends(get_current_user)):
    u = _user(auth)
    val = core.set_training_days(u, body.days)
    return {"training_days": val}


app.mount("/api", api)

# ------------------------------------------------------------------ статика фронтенда
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
else:
    @app.get("/")
    def frontend_missing():
        return {
            "detail": "Фронтенд не собран. Выполни: cd frontend && npm install && npm run build"
        }
