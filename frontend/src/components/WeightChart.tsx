import { useState } from "react";
import type { PlotPayload } from "../types";

const WIDTH = 640;
const HEIGHT = 260;
const PAD_L = 34;
const PAD_R = 10;
const PAD_T = 12;
const PAD_B = 24;

function toTs(d: string): number {
  return new Date(d + "T00:00:00").getTime();
}

export default function WeightChart({ data }: { data: PlotPayload }) {
  const [active, setActive] = useState<number | null>(null);

  if (data.dates.length < 2) {
    return <p className="hint">Нужно минимум 2 взвешивания, чтобы построить график.</p>;
  }

  const allTs = [...data.dates.map(toTs), ...data.plan_dates.map(toTs)];
  const allWeights = [...data.weights, ...data.plan_weights, data.goal_weight];
  const minTs = Math.min(...allTs);
  const maxTs = Math.max(...allTs);
  const minW = Math.min(...allWeights) - 1;
  const maxW = Math.max(...allWeights) + 1;

  const x = (ts: number) =>
    PAD_L + ((ts - minTs) / (maxTs - minTs || 1)) * (WIDTH - PAD_L - PAD_R);
  const y = (w: number) =>
    HEIGHT - PAD_B - ((w - minW) / (maxW - minW || 1)) * (HEIGHT - PAD_T - PAD_B);

  const planPath = data.plan_dates
    .map((d, i) => `${i === 0 ? "M" : "L"} ${x(toTs(d))} ${y(data.plan_weights[i])}`)
    .join(" ");

  const rollPath = data.dates
    .map((d, i) => `${i === 0 ? "M" : "L"} ${x(toTs(d))} ${y(data.rolling_avg[i])}`)
    .join(" ");

  const areaPath =
    rollPath +
    ` L ${x(toTs(data.dates[data.dates.length - 1]))} ${HEIGHT - PAD_B}` +
    ` L ${x(toTs(data.dates[0]))} ${HEIGHT - PAD_B} Z`;

  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => minW + ((maxW - minW) * i) / yTicks);

  const tip = active != null ? { x: x(toTs(data.dates[active])), y: y(data.weights[active]) } : null;
  const tipLabel = active != null ? `${data.weights[active]} кг · ${data.dates[active].slice(5)}` : "";
  const tipWidth = 96;
  const tipX = tip ? Math.min(Math.max(tip.x - tipWidth / 2, PAD_L), WIDTH - PAD_R - tipWidth) : 0;
  const tipAbove = tip ? tip.y - PAD_T > 26 : true;
  const tipY = tip ? (tipAbove ? tip.y - 30 : tip.y + 10) : 0;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" role="img" aria-label="График веса">
        <defs>
          <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--tg-link)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--tg-link)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD_L}
              x2={WIDTH - PAD_R}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--tg-section-separator)"
              strokeWidth={1}
            />
            <text x={2} y={y(t) + 4} fontSize={10} fill="var(--tg-hint)">
              {t.toFixed(0)}
            </text>
          </g>
        ))}

        <path d={planPath} fill="none" stroke="var(--tg-hint)" strokeWidth={1.5} strokeDasharray="4 4" />

        <path d={areaPath} fill="url(#weightFill)" stroke="none" />
        <path d={rollPath} fill="none" stroke="var(--tg-link)" strokeWidth={2.4} strokeLinejoin="round" />

        {data.dates.map((d, i) => (
          <g key={d}>
            {/* невидимая увеличенная область тапа поверх маленькой точки — удобнее попасть пальцем */}
            <circle
              cx={x(toTs(d))}
              cy={y(data.weights[i])}
              r={10}
              fill="transparent"
              onClick={() => setActive((prev) => (prev === i ? null : i))}
              style={{ cursor: "pointer" }}
            />
            <circle
              cx={x(toTs(d))}
              cy={y(data.weights[i])}
              r={active === i ? 4 : 2}
              fill={active === i ? "var(--tg-link)" : "var(--tg-hint)"}
              opacity={active === i ? 1 : 0.55}
              style={{ pointerEvents: "none" }}
            />
          </g>
        ))}

        <line
          x1={PAD_L}
          x2={WIDTH - PAD_R}
          y1={y(data.goal_weight)}
          y2={y(data.goal_weight)}
          stroke="var(--accent-success)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />

        {tip && (
          <g>
            <rect x={tipX} y={tipY} width={tipWidth} height={20} rx={6} className="chart-tooltip-bg" />
            <text
              x={tipX + tipWidth / 2}
              y={tipY + 14}
              fontSize={11}
              textAnchor="middle"
              className="chart-tooltip-text"
            >
              {tipLabel}
            </text>
          </g>
        )}
      </svg>
      <div className="btn-row" style={{ fontSize: 12, color: "var(--tg-hint)", marginTop: 4 }}>
        <span>● среднее за 7 дней</span>
        <span>┄ план</span>
        <span>┄ цель {data.goal_weight} кг</span>
      </div>
    </div>
  );
}
