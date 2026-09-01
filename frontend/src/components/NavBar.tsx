import { IconFood, IconPlan, IconSettings, IconStats, IconToday } from "./NavIcons";
import type { ComponentType, SVGProps } from "react";

export type Tab = "today" | "stats" | "plan" | "food" | "settings";

const ITEMS: { tab: Tab; icon: ComponentType<SVGProps<SVGSVGElement>>; label: string }[] = [
  { tab: "today", icon: IconToday, label: "Сегодня" },
  { tab: "stats", icon: IconStats, label: "Статистика" },
  { tab: "plan", icon: IconPlan, label: "План" },
  { tab: "food", icon: IconFood, label: "Питание" },
  { tab: "settings", icon: IconSettings, label: "Настройки" },
];

export default function NavBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="navbar">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.tab}
            className={item.tab === active ? "active" : ""}
            onClick={() => onChange(item.tab)}
          >
            <span className="icon">
              <Icon />
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
