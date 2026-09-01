// Иконки нижней навигации — штриховые SVG вместо эмодзи, в цвет текста
// кнопки (currentColor), чтобы совпадали со стилем "Кованая сталь"
// (см. styles.css) вместо разномастных смайликов у разных ОС/шрифтов.
import type { SVGProps } from "react";

function Base(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

export function IconToday(props: SVGProps<SVGSVGElement>) {
  // гантель
  return (
    <Base {...props}>
      <circle cx="4.2" cy="12" r="2.4" />
      <circle cx="19.8" cy="12" r="2.4" />
      <line x1="6.6" y1="12" x2="17.4" y2="12" />
    </Base>
  );
}

export function IconStats(props: SVGProps<SVGSVGElement>) {
  // столбики роста
  return (
    <Base {...props}>
      <rect x="3.5" y="12.5" width="3.2" height="6" rx="0.6" />
      <rect x="10.4" y="7" width="3.2" height="11.5" rx="0.6" />
      <rect x="17.3" y="10" width="3.2" height="8.5" rx="0.6" />
    </Base>
  );
}

export function IconPlan(props: SVGProps<SVGSVGElement>) {
  // календарь недели
  return (
    <Base {...props}>
      <rect x="3" y="5" width="18" height="15.5" rx="1.6" />
      <line x1="3" y1="9.5" x2="21" y2="9.5" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </Base>
  );
}

export function IconFood(props: SVGProps<SVGSVGElement>) {
  // тарелка
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </Base>
  );
}

export function IconSettings(props: SVGProps<SVGSVGElement>) {
  // ползунки настройки
  return (
    <Base {...props}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <circle cx="9.5" cy="7" r="1.9" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <circle cx="15" cy="12" r="1.9" />
      <line x1="4" y1="17" x2="20" y2="17" />
      <circle cx="11" cy="17" r="1.9" />
    </Base>
  );
}
