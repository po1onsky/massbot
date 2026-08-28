// Иконка под ключ упражнения — покрывает и паттерны новой генерируемой
// программы (squat/hinge/push_h...), и ключи легаси-программы (bench/row/
// rdl...), чтобы старый пользователь тоже получил иконки.
const ICONS: Record<string, string> = {
  squat: "🦵",
  squat_light: "🦵",
  hinge: "🍑",
  rdl: "🍑",
  push_h: "💪",
  bench: "💪",
  bench_light: "💪",
  dbpress: "💪",
  push_v: "🙆",
  ohp: "🙆",
  pull_h: "🎯",
  row: "🎯",
  pull_v: "🧗",
  pullup: "🧗",
  pulldown: "🧗",
  legs_acc: "🦿",
  legpress: "🦿",
  lunge: "🦿",
  legcurl: "🦿",
  calf: "🦶",
  arms: "💪",
  biceps: "💪",
  curl: "💪",
  triceps: "🔻",
  chest_acc: "🫁",
  fly: "🫁",
  shoulder_acc: "🤸",
  core: "🧘",
  plank: "🧘",
};

export function exerciseIcon(key: string): string {
  return ICONS[key] ?? "🏋";
}
