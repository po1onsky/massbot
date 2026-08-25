import { useEffect, useState } from "react";
import { api, ApiError } from "./api";
import NavBar, { type Tab } from "./components/NavBar";
import TodayPage from "./pages/TodayPage";
import StatsPage from "./pages/StatsPage";
import PlanPage from "./pages/PlanPage";
import FoodPage from "./pages/FoodPage";
import SettingsPage from "./pages/SettingsPage";
import type { MePayload } from "./types";
import { isInsideTelegram } from "./telegram";

export default function App() {
  const [tab, setTab] = useState<Tab>("today");
  const [me, setMe] = useState<MePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refreshMe() {
    api.me().then(setMe).catch((e: ApiError) => setError(e.message));
  }

  useEffect(refreshMe, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          {me?.first_name ? `Привет, ${me.first_name} 👋` : "Тренировки"}
        </h1>
        {me && (
          <div className="sub">
            {me.phase_name} · день {me.day_number + 1} · {me.start_weight} → {me.goal_weight} кг
          </div>
        )}
        {!isInsideTelegram() && (
          <div className="sub" style={{ color: "#ff9500", marginTop: 4 }}>
            ⚠️ Открыто вне Telegram — работает тестовый режим
          </div>
        )}
      </header>

      <main className="app-content">
        {error && <p className="hint">Ошибка: {error}</p>}
        {tab === "today" && <TodayPage onLogged={refreshMe} />}
        {tab === "stats" && <StatsPage />}
        {tab === "plan" && <PlanPage />}
        {tab === "food" && <FoodPage />}
        {tab === "settings" && <SettingsPage />}
      </main>

      <NavBar active={tab} onChange={setTab} />
    </div>
  );
}
