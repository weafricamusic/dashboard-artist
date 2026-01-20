import * as React from "react";

export type LineChartPoint = { label: string; value: number };

export function LineChart({
  points,
  height = 96,
  stroke = "currentColor",
}: {
  points: LineChartPoint[];
  height?: number;
  stroke?: string;
}) {
  const width = 560;
  const padding = 8;

  const values = points.map((p) => p.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = Math.max(1, max - min);

  const stepX = (width - padding * 2) / Math.max(1, points.length - 1);

  const d = points
    .map((p, i) => {
      const x = padding + i * stepX;
      const y = padding + (height - padding * 2) * (1 - (p.value - min) / range);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label="Trend chart"
      className="text-zinc-900/70"
    >
      <path d={d} fill="none" stroke={stroke} strokeWidth={2.5} />
      <path
        d={`${d} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`}
        fill="currentColor"
        opacity={0.08}
      />
    </svg>
  );
}
