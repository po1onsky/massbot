export default function Stepper({
  value,
  onChange,
  min = 0,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: number;
  placeholder?: string;
}) {
  const n = parseInt(value, 10);
  const cur = isNaN(n) ? null : n;

  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper-btn"
        onClick={() => onChange(String(Math.max(min, (cur ?? min) - 1)))}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        className="stepper-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" className="stepper-btn" onClick={() => onChange(String((cur ?? min - 1) + 1))}>
        +
      </button>
    </div>
  );
}
