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

  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => minW + ((maxW - minW) * i) / yTicks);

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" role="img" aria-label="График веса">
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

        {data.dates.map((d, i) => (
          <circle key={d} cx={x(toTs(d))} cy={y(data.weights[i])} r={2} fill="var(--tg-hint)" opacity={0.55} />
        ))}

        <path d={rollPath} fill="none" stroke="var(--tg-link)" strokeWidth={2.4} strokeLinejoin="round" />

        <line
          x1={PAD_L}
          x2={WIDTH - PAD_R}
          y1={y(data.goal_weight)}
          y2={y(data.goal_weight)}
          stroke="#34c759"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      </svg>
      <div className="btn-row" style={{ fontSize: 12, color: "var(--tg-hint)", marginTop: 4 }}>
        <span>● среднее за 7 дней</span>
        <span>┄ план</span>
        <span>┄ цель {data.goal_weight} кг</span>
      </div>
    </div>
  );
}
