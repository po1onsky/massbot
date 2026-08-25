# Бесплатный деплой навсегда: Google Cloud Free Tier + Cloudflare Tunnel

То же самое, что [DEPLOY_FREE.md](DEPLOY_FREE.md) (VM с постоянным диском +
Cloudflare Tunnel вместо открытия портов), только VM — у Google, не у
Oracle. Регистрация у Google обычно проходит без сюрпризов. Карту
привязать всё равно попросят (это условие Google для любого аккаунта,
не только платного), но пока остаёшься в лимитах Always Free — списаний
не будет.

Плюс у Google: SSH — прямо в браузере из консоли, кнопкой. Не нужно
скачивать и хранить приватный ключ, как с Oracle.

## 1. Завести аккаунт и проект

1. [console.cloud.google.com](https://console.cloud.google.com) → войти
   обычным Google-аккаунтом.
2. При первом входе попросит создать биллинг-аккаунт и привязать карту —
   это обязательный шаг Google, спишется $0, если не выходить за Always
   Free лимиты (описаны внизу этого файла).
3. Создай новый проект (наверху, рядом с логотипом Google Cloud →
   **New Project**) — назови как угодно, например `massbot`.

## 2. Создать VM (Always Free e2-micro)

**Compute Engine → VM instances → Create instance.**

Важно — Always Free для e2-micro действует только в одном из трёх
регионов, в любом другом с тебя спишут деньги:
- `us-west1` (Oregon)
- `us-central1` (Iowa)
- `us-east1` (South Carolina)

Настройки:
- **Region**: один из трёх выше. Zone — любая внутри него.
- **Machine type**: `E2` → `e2-micro`.
- **Boot disk**: Change → Ubuntu → **Ubuntu 22.04 LTS**, тип диска
  **Standard persistent disk** (не SSD — SSD не входит в бесплатный
  лимит), размер до 30 GB (тоже входит в лимит).
- **Firewall**: галочки HTTP/HTTPS можно не трогать — они не нужны,
  Cloudflare Tunnel работает только на исходящих соединениях, входящие
  порты открывать не придётся вообще.
- Create.

Через минуту у инстанса появится статус ● и имя — рядом с ним кнопка
**SSH**.

## 3. Подключиться и поставить зависимости

Жми **SSH** рядом с инстансом — откроется терминал прямо в браузере
(ключи Google сгенерирует и подставит сам, ничего скачивать не надо).

```bash
sudo apt-get update
sudo apt-get install -y python3.11 python3.11-venv git nodejs npm

# e2-micro — всегда amd64
curl -L -o cloudflared.deb "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb"
sudo dpkg -i cloudflared.deb
cloudflared --version
```

Если `python3.11` не находится в apt (редко, но бывает на некоторых
образах):
```bash
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt-get update && sudo apt-get install -y python3.11 python3.11-venv
```

Если `npm run build` дальше ругается на версию Node — поставь свежий:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 4. Завести пользователя и склонировать репозиторий

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin massbot
sudo mkdir -p /opt/massbot
sudo chown massbot:massbot /opt/massbot

sudo -u massbot git clone https://github.com/<твой-аккаунт>/<репозиторий>.git /opt/massbot
```

(Если репозиторий приватный — либо сделай публичным, секрет там только
`BOT_TOKEN`, а он в git не попадает благодаря `.gitignore`, либо разово
настрой деплой-ключ / `gh auth login` под пользователем massbot.)

## 5. Собрать проект

```bash
cd /opt/massbot
sudo -u massbot python3.11 -m venv .venv
sudo -u massbot .venv/bin/pip install -r requirements.txt
sudo -u massbot bash -c "cd frontend && npm install && npm run build"
```

## 6. Секреты и systemd

```bash
sudo cp deploy/massbot.env.example /etc/massbot.env
sudo nano /etc/massbot.env   # вписать свой BOT_TOKEN, проверить TZ_NAME
sudo chown root:massbot /etc/massbot.env
sudo chmod 640 /etc/massbot.env

sudo cp deploy/massbot.service /etc/systemd/system/massbot.service
sudo systemctl daemon-reload
sudo systemctl enable --now massbot
```

## 7. Проверить

```bash
sudo systemctl status massbot
sudo journalctl -u massbot -f
```

Должно появиться что-то вроде:
```
Публичный адрес: https://random-words-1234.trycloudflare.com
INFO:     Вебхук установлен: https://random-words-1234.trycloudflare.com/telegram/webhook/...
INFO:     Application startup complete.
```

Открой бота в Telegram → `/start` → кнопка **🏋 Открыть приложение**.

## 8. Обновления после `git push`

Заходишь по SSH (та же кнопка в консоли) и:
```bash
sudo -u massbot bash /opt/massbot/deploy/update.sh
```

## Что именно бесплатно навсегда (Always Free)

- 1 инстанс `e2-micro` в месяц в `us-west1` / `us-central1` / `us-east1`.
- 30 GB стандартного (не SSD) постоянного диска.
- 1 GB исходящего трафика в месяц из Северной Америки почти во все
  направления — для личного трекера это с большим запасом.

Выйти за эти лимиты с одним личным ботом почти невозможно. Если
когда-нибудь захочешь второй VM или диск побольше — вот тогда появится
платёж, но не раньше.
