import * as React from "react";

export type PieSlice = { label: string; value: number };

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    `M ${cx} ${cy}`,
    `L ${start.x.toFixed(2)} ${start.y.toFixed(2)}`,
    `A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

export function PieChart({
  slices,
  size = 168,
}: {
  slices: PieSlice[];
  size?: number;
}) {
  const total = slices.reduce((acc, s) => acc + s.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) * 0.9;

  const palette = [
    "rgba(24,24,27,0.28)",
    "rgba(24,24,27,0.18)",
    "rgba(24,24,27,0.12)",
    "rgba(24,24,27,0.08)",
  ];

  let angle = 0;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Pie chart"
      className="text-zinc-900"
    >
      {total <= 0 ? (
        <circle cx={cx} cy={cy} r={r} fill="rgba(24,24,27,0.08)" />
      ) : (
        slices
          .filter((s) => s.value > 0)
          .map((s, idx) => {
            const start = angle;
            const delta = (s.value / total) * 360;
            const end = angle + delta;
            angle = end;
            return (
              <path
                key={s.label}
                d={arcPath(cx, cy, r, start, end)}
                fill={palette[idx % palette.length]}
                stroke="rgba(24,24,27,0.12)"
              />
            );
          })
      )}
      <circle cx={cx} cy={cy} r={r * 0.58} fill="white" stroke="rgba(24,24,27,0.08)" />
    </svg>
  );
}
