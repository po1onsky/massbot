# Бесплатный деплой навсегда: Oracle Cloud Always Free + Cloudflare Tunnel

$0/мес без ограничения по времени (это не триал), с настоящим постоянным
диском — SQLite остаётся как есть, без переезда на внешнюю БД. Плата за
это — разовая ручная настройка VM (минут 30–40), дальше обновления одной
командой.

Как это работает: на бесплатной VM крутится наш FastAPI-сервис на
`127.0.0.1:8000` (наружу не торчит вообще). `cloudflared` поднимает
исходящий туннель до Cloudflare и даёт публичный HTTPS-адрес вида
`https://random-words.trycloudflare.com` — входящих портов открывать не
нужно вообще, поэтому не придётся разбираться с Security List/NSG
Oracle. При каждом рестарте сервиса адрес меняется — не страшно: наш
[api.py](api.py) сам перерегистрирует вебхук бота и кнопку меню на новый
адрес при каждом старте (см. [telegram_bot.py](telegram_bot.py)).

## 1. Завести Oracle Cloud аккаунт

1. [cloud.oracle.com](https://www.oracle.com/cloud/free/) → Start for free.
2. Регистрация попросит карту для верификации личности — с Always Free
   ресурсов деньги не списываются, но карта нужна на этапе регистрации
   (так у Oracle, без вариантов).
3. Выбери домашний регион (Home Region) — вроде Frankfurt/Amsterdam, что
   ближе. Это нельзя поменять потом, не критично для этой задачи.

## 2. Создать Always Free VM

В консоли: **Compute → Instances → Create Instance**.

- **Image**: Canonical Ubuntu 22.04 (Minimal или обычный — без разницы).
- **Shape**: сначала попробуй `VM.Standard.A1.Flex` (Ampere ARM, до 4
  OCPU / 24 GB бесплатно) — жми **Change shape**, выбери Ampere, поставь
  1 OCPU / 6 GB, этого с запасом хватит. Если консоль пишет
  "Out of host capacity" (частая история для A1 в загруженных регионах) —
  возьми `VM.Standard.E2.1.Micro` (AMD, 1/8 OCPU, 1 GB) — тоже Always
  Free, послабее, но для этого сервиса достаточно.
- **Networking**: оставь дефолтный VCN с публичным IP — он не понадобится
  для входящих соединений (только для SSH), но пусть будет.
- **SSH keys**: дай сгенерировать пару и **сразу скачай приватный ключ**
  (`ssh-key-*.key`) — второй раз скачать нельзя.
- Create.

Через пару минут у инстанса появится **Public IP** — он нужен для SSH.

```bash
chmod 600 ~/Downloads/ssh-key-*.key
ssh -i ~/Downloads/ssh-key-*.key ubuntu@<PUBLIC_IP>
```

(Для образа Ubuntu пользователь по умолчанию — `ubuntu`.)

## 3. Установить зависимости на VM

```bash
sudo apt-get update
sudo apt-get install -y python3.11 python3.11-venv git nodejs npm

# cloudflared — по архитектуре: arm64 для A1.Flex, amd64 для E2.1.Micro
ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ]; then CF_ARCH=arm64; else CF_ARCH=amd64; fi
curl -L -o cloudflared.deb "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}.deb"
sudo dpkg -i cloudflared.deb
cloudflared --version   # проверка
```

Если в репозиториях Ubuntu нет `python3.11` (бывает на некоторых образах) —
поставь через deadsnakes PPA:
```bash
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt-get update && sudo apt-get install -y python3.11 python3.11-venv
```

Node из стандартного apt иногда старый — если `npm run build` в шаге 5
ругается на версию Node, поставь свежий через nodesource:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 4. Завести пользователя и склонировать репозиторий

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin massbot
sudo mkdir -p /opt/massbot
sudo chown massbot:massbot /opt/massbot

# клонируем от имени massbot (репозиторий — тот, что запушил на GitHub)
sudo -u massbot git clone https://github.com/<твой-аккаунт>/<репозиторий>.git /opt/massbot
```

Если репозиторий приватный — либо сделай его публичным (это личный
трекер тренировок, не секрет сам по себе, секрет — только токен бота,
который в git не попадает благодаря `.gitignore`), либо разово
настрой на VM деплой-ключ / `gh auth login` под пользователем massbot.

## 5. Собрать проект

```bash
cd /opt/massbot
sudo -u massbot python3.11 -m venv .venv
sudo -u massbot .venv/bin/pip install -r requirements.txt
sudo -u massbot bash -c "cd frontend && npm install && npm run build"
```

## 6. Настроить секреты и systemd

```bash
sudo cp deploy/massbot.env.example /etc/massbot.env
sudo nano /etc/massbot.env   # вписать свой BOT_TOKEN, проверить TZ_NAME
sudo chown root:massbot /etc/massbot.env
sudo chmod 640 /etc/massbot.env

sudo cp deploy/massbot.service /etc/systemd/system/massbot.service
sudo systemctl daemon-reload
sudo systemctl enable --now massbot
```

## 7. Проверить, что всё поднялось

```bash
sudo systemctl status massbot
sudo journalctl -u massbot -f
```

В логе должно быть что-то вроде:
```
Публичный адрес: https://random-words-1234.trycloudflare.com
INFO:     Вебхук установлен: https://random-words-1234.trycloudflare.com/telegram/webhook/...
INFO:     Application startup complete.
```

Открой бота в Telegram → `/start` → кнопка **🏋 Открыть приложение**.
Дальше сервис работает сам, без твоего компьютера.

## 8. Обновления после `git push`

```bash
ssh -i ~/Downloads/ssh-key-*.key ubuntu@<PUBLIC_IP>
bash /opt/massbot/deploy/update.sh
```

Запускать от своего пользователя, не через `sudo -u massbot` — скрипт сам
переключается на massbot там, где это нужно (владение файлами), и
перезапускает сервис от твоего sudo. Сам сделает `git pull`, обновит
зависимости, пересоберёт фронтенд и перезапустит сервис (см.
[deploy/update.sh](deploy/update.sh)).

## Ограничения этого варианта

- Адрес `*.trycloudflare.com` меняется на каждый рестарт сервиса — сам
  сервис это переживает автоматически, но если ты когда-нибудь захочешь
  повесить мини-апп ещё и на прямую ссылку (`t.me/bot/app`) для шаринга —
  для стабильного адреса потребуется уже свой домен в Cloudflare
  (именованный туннель вместо quick tunnel). Для личного трекера через
  кнопку меню это не нужно.
- Cloudflare сам предупреждает, что quick tunnel — не для продакшена с
  serious нагрузкой и без SLA. Для одного пользователя это не проблема.
- `VM.Standard.E2.1.Micro` (если достался он, а не A1) слабый — 1 GB RAM.
  Сервису с натяжкой хватает, но если параллельно будешь ставить туда
  что-то ещё, может не хватить памяти.
