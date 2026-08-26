#!/usr/bin/env bash
# Запускать на VM после `git push` — от своего обычного SSH-пользователя
# (у него настоящий sudo), НЕ через `sudo -u massbot`:
#   bash /opt/massbot/deploy/update.sh
#
# git pull / зависимости / сборка фронтенда идут от имени massbot (он
# владелец файлов в /opt/massbot), а systemctl restart — от вызывающего
# пользователя. Раньше весь скрипт запускался как `sudo -u massbot ...`,
# и `sudo systemctl restart massbot` внутри спрашивал пароль у massbot —
# у него его просто нет (системный пользователь без логина), поэтому
# sudo уходил в бесконечный "Попробуйте ещё раз".
set -euo pipefail

APP_DIR="/opt/massbot"

sudo -u massbot bash -c "
  set -euo pipefail
  cd '$APP_DIR'
  git pull
  .venv/bin/pip install -q -r requirements.txt
  cd frontend && npm install && npm run build
"

sudo systemctl restart massbot
echo "Обновлено и перезапущено."
