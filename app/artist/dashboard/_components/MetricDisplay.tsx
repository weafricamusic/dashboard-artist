import React from "react";
import { Card } from "./Card";

export function MetricDisplay({
  label,
  value,
  subtext,
  icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card
      className={`${
        accent
          ? "border-amber-900/30 bg-gradient-to-br from-amber-950/30 to-zinc-950/40"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-2 truncate text-2xl font-bold text-white">
            {value}
          </p>
          {subtext && (
            <p className="mt-1 text-xs text-zinc-500">{subtext}</p>
          )}
        </div>
        {icon && (
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
            accent ? "bg-amber-900/30 text-amber-400" : "bg-zinc-800/50 text-zinc-400"
          }`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
