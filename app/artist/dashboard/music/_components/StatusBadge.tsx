import { type ContentStatus } from "../../../../../lib/content/types";

export function StatusBadge({ status }: { status: ContentStatus }) {
  const style =
    status === "published"
      ? "border-emerald-900/40 bg-emerald-950/40 text-emerald-200"
      : status === "pending"
        ? "border-amber-900/40 bg-amber-950/40 text-amber-200"
        : "border-zinc-800 bg-zinc-950/30 text-zinc-200";

  const label =
    status === "published" ? "Published" : status === "pending" ? "Pending" : "Draft";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${style}`}>
      {label}
    </span>
  );
}
