// Skeleton-заглушка вместо голого текста "Загрузка…" — держит примерный
// силуэт карточек, чтобы контент не "прыгал" при появлении данных.
export default function Loading({ lines = 3, cards = 1 }: { lines?: number; cards?: number }) {
  return (
    <div className="stack">
      {Array.from({ length: cards }, (_, c) => (
        <div className="card" key={c}>
          {Array.from({ length: lines }, (_, i) => (
            <div
              className="skeleton-line"
              key={i}
              style={{ width: i === 0 ? "50%" : `${85 - i * 8}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
