# -*- coding: utf-8 -*-
"""
Проверка Telegram WebApp initData (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).

Мини-приложение на каждый запрос к /api/* кладёт заголовок
    Authorization: tma <initData>
initData — это window.Telegram.WebApp.initData, сырая query-строка.
Мы пересчитываем HMAC подписи по токену бота и сверяем с hash из initData.
"""

import hashlib
import hmac
import json
import os
import time
from typing import Optional
from urllib.parse import parse_qsl

from fastapi import Header, HTTPException

BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
DEV_MODE = os.environ.get("DEV_MODE", "0") == "1"
DEV_CHAT_ID = int(os.environ.get("DEV_CHAT_ID", "1"))
MAX_AUTH_AGE = 24 * 3600  # initData считаем свежим не дольше суток


class AuthUser:
    __slots__ = ("id", "first_name")

    def __init__(self, id: int, first_name: Optional[str]):
        self.id = id
        self.first_name = first_name


def _validate_init_data(init_data: str) -> AuthUser:
    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = pairs.pop("hash", None)
    if not received_hash:
        raise ValueError("нет hash в initData")

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        raise ValueError("подпись не совпадает")

    auth_date = int(pairs.get("auth_date", "0"))
    if auth_date and time.time() - auth_date > MAX_AUTH_AGE:
        raise ValueError("initData устарел")

    user_raw = pairs.get("user")
    if not user_raw:
        raise ValueError("нет данных пользователя")
    user = json.loads(user_raw)
    return AuthUser(id=int(user["id"]), first_name=user.get("first_name"))


async def get_current_user(authorization: Optional[str] = Header(default=None)) -> AuthUser:
    init_data = None
    if authorization and authorization.startswith("tma "):
        init_data = authorization[4:]

    if init_data:
        try:
            return _validate_init_data(init_data)
        except Exception as exc:
            if DEV_MODE:
                pass  # в dev-режиме падаем в заглушку ниже, даже если подпись битая
            else:
                raise HTTPException(status_code=401, detail=f"Неверный initData: {exc}")

    if DEV_MODE:
        return AuthUser(id=DEV_CHAT_ID, first_name="Dev")

    raise HTTPException(status_code=401, detail="Открой приложение через Telegram")
