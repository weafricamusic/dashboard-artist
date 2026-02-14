import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = "", onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function CardHeader({ title, subtitle, action, children }: CardHeaderProps) {
  if (children) {
    return <div className="flex items-start justify-between gap-3">{children}</div>;
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        {typeof title === "string" ? <h3 className="text-sm font-semibold">{title}</h3> : null}
        {subtitle ? <p className="mt-1 text-xs text-zinc-500">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex-shrink-0">{action}</div> : null}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className = "" }: CardTitleProps) {
  return <h3 className={`text-sm font-semibold ${className}`}>{children}</h3>;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return <div className={`mt-3 ${className}`}>{children}</div>;
}
