import { useEffect, useState } from "react";
import { api, ApiError } from "./api";
import NavBar, { type Tab } from "./components/NavBar";
import WeekStrip from "./components/WeekStrip";
import Loading from "./components/Loading";
import TodayPage from "./pages/TodayPage";
import StatsPage from "./pages/StatsPage";
import PlanPage from "./pages/PlanPage";
import FoodPage from "./pages/FoodPage";
import SettingsPage from "./pages/SettingsPage";
import Onboarding from "./pages/Onboarding";
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
        {me?.onboarded && (
          <>
            <div className="sub">
              {me.phase_name} · {me.start_weight} → {me.goal_weight} кг
            </div>
            <WeekStrip week={me.week} />
          </>
        )}
        {!isInsideTelegram() && (
          <div className="sub" style={{ color: "var(--accent-warning)", marginTop: 4 }}>
            ⚠️ Открыто вне Telegram — работает тестовый режим
          </div>
        )}
      </header>

      <main className="app-content">
        {error && <p className="hint">Ошибка: {error}</p>}
        {!me && !error && <Loading lines={2} />}
        {me && !me.onboarded && <Onboarding onDone={refreshMe} />}
        {me?.onboarded && tab === "today" && <TodayPage me={me} onLogged={refreshMe} />}
        {me?.onboarded && tab === "stats" && <StatsPage />}
        {me?.onboarded && tab === "plan" && <PlanPage />}
        {me?.onboarded && tab === "food" && <FoodPage />}
        {me?.onboarded && tab === "settings" && <SettingsPage onProfileChanged={refreshMe} />}
      </main>

      {me?.onboarded && <NavBar active={tab} onChange={setTab} />}
    </div>
  );
}
