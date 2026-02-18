import React from "react";
import { Card, CardHeader, CardContent } from "./Card";

interface MetricValue {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  trend?: {
    direction: "up" | "down" | "stable";
    value: string;
  };
}

interface MetricCardProps {
  title: string;
  subtitle?: string;
  metrics: MetricValue[];
  action?: React.ReactNode;
}

const TrendIcon = ({ direction }: { direction: "up" | "down" | "stable" }) => {
  if (direction === "up") {
    return (
      <svg className="h-4 w-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
        <path d="M3 10a1 1 0 011-1h5V5a1 1 0 011-1 1 1 0 01.894.553l7 14a1 1 0 11-1.788.894l-1.447-2.894h-6.518L8.553 17.447a1 1 0 01-1.788-.894l7-14z" />
      </svg>
    );
  }
  if (direction === "down") {
    return (
      <svg className="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
        <path d="M17 10a1 1 0 01-1 1h-5v4a1 1 0 01-1 1 1 1 0 01-.894-.553l-7-14a1 1 0 111.788-.894l1.447 2.894h6.518l-1.447-2.894a1 1 0 111.788-.894l7 14z" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4 text-zinc-400" fill="currentColor" viewBox="0 0 20 20">
      <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
    </svg>
  );
};

export function MetricCard({ title, subtitle, metrics, action }: MetricCardProps) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} action={action} />
      <CardContent>
        <div className="grid gap-3">
          {metrics.map((metric, idx) => (
            <div key={idx} className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-950/40 p-2">
              <div className="flex items-center gap-2 min-w-0">
                {metric.icon && <div className="flex-shrink-0 text-zinc-300">{metric.icon}</div>}
                <div className="min-w-0">
                  <div className="text-xs text-zinc-400">{metric.label}</div>
                  <div className="font-semibold text-white">{metric.value}</div>
                </div>
              </div>
              {metric.trend && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <TrendIcon direction={metric.trend.direction} />
                  <span className="text-xs text-zinc-400">{metric.trend.value}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
