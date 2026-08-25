import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initTelegram, tg } from "./telegram";
import "./styles.css";

initTelegram();

// Подхватываем цвета темы Telegram поверх дефолтных CSS-переменных, если приложение
// открыто внутри Telegram — вне его (обычный браузер) остаются дефолты из styles.css.
if (tg?.themeParams) {
  const map: Record<string, string> = {
    bg_color: "--tg-bg",
    text_color: "--tg-text",
    hint_color: "--tg-hint",
    link_color: "--tg-link",
    button_color: "--tg-button",
    button_text_color: "--tg-button-text",
    secondary_bg_color: "--tg-secondary-bg",
  };
  const root = document.documentElement.style;
  for (const [tgKey, cssVar] of Object.entries(map)) {
    const value = tg.themeParams[tgKey];
    if (value) root.setProperty(cssVar, value);
  }
  tg.setBackgroundColor?.(tg.themeParams.bg_color ?? "#ffffff");
  tg.setHeaderColor?.(tg.themeParams.bg_color ?? "#ffffff");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
