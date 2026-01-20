import * as React from "react";

export type BarDatum = { label: string; value: number };

export function BarChart({
  data,
  height = 160,
}: {
  data: BarDatum[];
  height?: number;
}) {
  const width = 560;
  const padding = 10;
  const gap = 6;

  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth =
    data.length === 0
      ? 0
      : (width - padding * 2 - gap * (data.length - 1)) / data.length;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label="Bar chart"
      className="text-zinc-900/70"
    >
      <rect x={0} y={0} width={width} height={height} fill="transparent" />
      {data.map((d, i) => {
        const h = ((height - padding * 2) * d.value) / max;
        const x = padding + i * (barWidth + gap);
        const y = height - padding - h;
        return (
          <g key={d.label}>
            <rect
              x={x}
              y={y}
              width={Math.max(1, barWidth)}
              height={h}
              rx={6}
              fill="currentColor"
              opacity={0.18}
            />
            <rect
              x={x}
              y={y}
              width={Math.max(1, barWidth)}
              height={Math.min(3, h)}
              rx={6}
              fill="currentColor"
              opacity={0.35}
            />
          </g>
        );
      })}
    </svg>
  );
}
