export default function ProgressBar({ value, color }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, isFinite(value) ? value : 0)) * 100;
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${pct}%`, ...(color ? { background: color } : {}) }} />
    </div>
  );
}
