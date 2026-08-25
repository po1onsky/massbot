#!/usr/bin/env bash
# Запускать на VM после `git push` в свой репозиторий, чтобы подтянуть
# изменения: git pull -> обновить зависимости -> пересобрать фронтенд ->
# перезапустить сервис.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

git pull
.venv/bin/pip install -q -r requirements.txt
(cd frontend && npm install && npm run build)

sudo systemctl restart massbot
echo "Обновлено и перезапущено."
