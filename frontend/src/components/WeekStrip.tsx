import type { WeekDay } from "../types";

// Не однобуквенные — "Пн"/"Пт" и "Вт"/"Вс" иначе неразличимы.
const LETTERS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/** Полоска из 7 кубиков текущей календарной недели — где сегодня, какие дни
 * тренировочные, какие уже отмечены. Заменяет абстрактный "неделя N из M".
 * onDayClick, если задан, делает кубики кнопками — превью плана на день. */
export default function WeekStrip({
  week,
  selected,
  onDayClick,
}: {
  week: WeekDay[];
  selected?: string | null;
  onDayClick?: (date: string) => void;
}) {
  return (
    <div className="week-strip">
      {week.map((d) => {
        const cls = ["week-cube"];
        if (d.is_today) cls.push("today");
        else if (d.done) cls.push("done");
        else if (d.is_training) cls.push("training");
        else cls.push("rest");
        if (onDayClick && d.date === selected) cls.push("picked");
        const Tag = onDayClick ? "button" : "div";
        return (
          <Tag key={d.date} className={cls.join(" ")} onClick={onDayClick ? () => onDayClick(d.date) : undefined}>
            {LETTERS[d.weekday]}
          </Tag>
        );
      })}
    </div>
  );
}
