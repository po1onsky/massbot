#!/usr/bin/env bash
# Поднимает бесплатный Cloudflare Tunnel (без домена, без открытия портов),
# вытаскивает выданный адрес *.trycloudflare.com и запускает сервис с ним
# в PUBLIC_URL. При каждом рестарте адрес меняется — это нормально: api.py
# сам перерегистрирует вебхук и кнопку меню на новый адрес при старте.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-8000}"
TUNNEL_LOG="$(mktemp)"

cloudflared tunnel --url "http://127.0.0.1:${PORT}" --no-autoupdate \
  --protocol http2 --edge-ip-version 4 >"$TUNNEL_LOG" 2>&1 &
# --protocol http2 --edge-ip-version 4: на некоторых облачных VPC (замечено на
# GCP) дефолтный QUIC/IPv6 путь у cloudflared зависает без ошибки на этапе
# установки соединения — форсируем HTTP/2 поверх IPv4, с ним подключается.

echo "Ждём адрес от Cloudflare Tunnel..."
PUBLIC_URL=""
for _ in $(seq 1 45); do
  PUBLIC_URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" | head -n1 || true)
  [ -n "$PUBLIC_URL" ] && break
  sleep 1
done

if [ -z "$PUBLIC_URL" ]; then
  echo "Не получили адрес туннеля за 45 секунд. Лог cloudflared:" >&2
  cat "$TUNNEL_LOG" >&2
  rm -f "$TUNNEL_LOG"
  exit 1
fi
rm -f "$TUNNEL_LOG"

echo "Публичный адрес: $PUBLIC_URL"

# Cloudflare печатает адрес чуть раньше, чем маршрут реально начинает
# резолвиться — без этой паузы Telegram иногда не может поставить вебхук
# (BadRequest: failed to resolve host) сразу после старта.
HOST="${PUBLIC_URL#https://}"
echo "Ждём, пока адрес начнёт резолвиться..."
for _ in $(seq 1 20); do
  getent hosts "$HOST" >/dev/null 2>&1 && break
  sleep 1
done

export PUBLIC_URL

cd "$APP_DIR"
# uvicorn слушает только локально — наружу торчит один Cloudflare Tunnel
exec "$APP_DIR/.venv/bin/uvicorn" api:app --host 127.0.0.1 --port "$PORT"
