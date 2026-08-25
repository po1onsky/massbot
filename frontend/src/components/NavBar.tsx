export type Tab = "today" | "stats" | "plan" | "food" | "settings";

const ITEMS: { tab: Tab; icon: string; label: string }[] = [
  { tab: "today", icon: "🏋", label: "Сегодня" },
  { tab: "stats", icon: "📊", label: "Статистика" },
  { tab: "plan", icon: "📋", label: "План" },
  { tab: "food", icon: "🍽", label: "Питание" },
  { tab: "settings", icon: "⚙️", label: "Настройки" },
];

export default function NavBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="navbar">
      {ITEMS.map((item) => (
        <button
          key={item.tab}
          className={item.tab === active ? "active" : ""}
          onClick={() => onChange(item.tab)}
        >
          <span className="icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
