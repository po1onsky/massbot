import { useRef, useState, type ReactNode } from "react";
import { haptic } from "../telegram";

const SWIPE_THRESHOLD = 70;
const PEEK_DEPTH = 2;

/**
 * Стопка карточек внахлёст (вкладка "План") — свайпом влево/вправо листаешь
 * блоки периодизации, текущий блок сверху. Плюс стрелки/точки под стопкой —
 * подстраховка для тех, кто не догадается свайпнуть, и для тестирования без
 * тача. Тянем только верхнюю карточку через pointer events (работают и для
 * тача, и для мыши) — библиотека жестов тут ни к чему, драг простой.
 */
export default function CardStack({
  count,
  index,
  onIndexChange,
  renderCard,
}: {
  count: number;
  index: number;
  onIndexChange: (i: number) => void;
  renderCard: (i: number) => ReactNode;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<"left" | "right" | null>(null);
  const startX = useRef(0);
  const pointerId = useRef<number | null>(null);

  const canPrev = index > 0;
  const canNext = index < count - 1;

  function onPointerDown(e: React.PointerEvent) {
    if (leaving) return;
    pointerId.current = e.pointerId;
    startX.current = e.clientX;
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (pointerId.current !== e.pointerId) return;
    let dx = e.clientX - startX.current;
    if ((dx > 0 && !canPrev) || (dx < 0 && !canNext)) dx *= 0.3; // резина на краях стопки
    setDragX(dx);
  }

  function commit(dir: "left" | "right") {
    haptic("light");
    setLeaving(dir);
    setDragging(false);
    window.setTimeout(() => {
      onIndexChange(index + (dir === "left" ? 1 : -1));
      setLeaving(null);
      setDragX(0);
    }, 200);
  }

  function endDrag() {
    if (dragX <= -SWIPE_THRESHOLD && canNext) {
      commit("left");
    } else if (dragX >= SWIPE_THRESHOLD && canPrev) {
      commit("right");
    } else {
      setDragging(false);
      setDragX(0);
    }
    pointerId.current = null;
  }

  const peeks = Array.from({ length: PEEK_DEPTH }, (_, i) => i + 1).filter((o) => index + o < count);

  const frontTransform = leaving
    ? `translateX(${leaving === "left" ? -260 : 260}px) rotate(${leaving === "left" ? -10 : 10}deg)`
    : `translateX(${dragX}px) rotate(${dragX / 24}deg)`;

  return (
    <div>
      <div className="card-stack">
        {peeks
          .slice()
          .reverse()
          .map((o) => {
            const scale = 1 - o * 0.045;
            // translateY в % — это % от высоты САМОЙ карточки (так резолвит
            // transform), а она равна высоте текущей (inset:0 от контейнера,
            // чья высота задаётся текущей карточкой) — поэтому взлёт всегда
            // компенсирует потерю высоты от scale() независимо от того,
            // насколько разнится контент между блоками. Видна только эта
            // полоска снизу (остальное перекрыто верхней карточкой), поэтому
            // её делаем контрастной, а не полупрозрачной "тенью".
            const revealPx = 10 + o * 12;
            return (
              <div
                key={index + o}
                className="card-stack-item peek"
                style={{
                  transform: `translateY(calc(${(1 - scale) * 100}% + ${revealPx}px)) scale(${scale})`,
                  opacity: 1 - o * 0.16,
                  zIndex: 100 - o,
                }}
              >
                {renderCard(index + o)}
              </div>
            );
          })}
        <div
          className={`card-stack-item front ${dragging ? "dragging" : ""} ${leaving ? "leaving" : ""}`}
          style={{ transform: frontTransform, opacity: leaving ? 0 : 1 }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {renderCard(index)}
        </div>
      </div>
      {count > 1 && (
        <div className="card-stack-nav">
          <button
            className="card-stack-arrow"
            disabled={!canPrev}
            onClick={() => {
              haptic("light");
              onIndexChange(index - 1);
            }}
          >
            ‹
          </button>
          <div className="card-stack-dots">
            {Array.from({ length: count }, (_, i) => (
              <button
                key={i}
                className={`card-stack-dot ${i === index ? "active" : ""}`}
                onClick={() => onIndexChange(i)}
                aria-label={`Блок ${i + 1}`}
              />
            ))}
          </div>
          <button
            className="card-stack-arrow"
            disabled={!canNext}
            onClick={() => {
              haptic("light");
              onIndexChange(index + 1);
            }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
