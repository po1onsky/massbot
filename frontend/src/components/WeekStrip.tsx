import type { WeekDay } from "../types";

// Не однобуквенные — "Пн"/"Пт" и "Вт"/"Вс" иначе неразличимы.
const LETTERS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/** Полоска из 7 кубиков текущей календарной недели — где сегодня, какие дни
 * тренировочные, какие уже отмечены. Заменяет абстрактный "неделя N из M". */
export default function WeekStrip({ week }: { week: WeekDay[] }) {
  return (
    <div className="week-strip">
      {week.map((d) => {
        const cls = ["week-cube"];
        if (d.is_today) cls.push("today");
        else if (d.done) cls.push("done");
        else if (d.is_training) cls.push("training");
        else cls.push("rest");
        return (
          <div key={d.date} className={cls.join(" ")}>
            {LETTERS[d.weekday]}
          </div>
        );
      })}
    </div>
  );
}
