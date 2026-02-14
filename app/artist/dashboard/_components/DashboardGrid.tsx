import React from "react";

export function DashboardGrid({
  children,
  columns = "auto-fit",
}: {
  children: React.ReactNode;
  columns?: "auto-fit" | "2col" | "3col" | "4col";
}) {
  const colsClass = {
    "auto-fit": "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    "2col": "grid-cols-1 md:grid-cols-2",
    "3col": "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    "4col": "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  return (
    <div className={`grid gap-4 ${colsClass[columns]}`}>
      {children}
    </div>
  );
}
