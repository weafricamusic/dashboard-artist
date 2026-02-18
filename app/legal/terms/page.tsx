import { getLegalDocument } from "../../../lib/legal/documents";

function formatUpdatedAt(value: string | null): string | null {
  if (!value) return null;
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return value;
  return new Date(t).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function renderContent(content: string) {
  return (
    <div className="whitespace-pre-wrap text-sm text-zinc-200">
      {content || "These terms are not configured yet."}
    </div>
  );
}

export default async function TermsPage() {
  const doc = await getLegalDocument("terms");
  const updatedAt = formatUpdatedAt(doc.updatedAt);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <h1 className="text-2xl font-semibold text-white">Terms of Service</h1>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-white">{doc.title}</div>
          <div className="text-xs text-zinc-400">Version {doc.version}{updatedAt ? ` • Updated ${updatedAt}` : ""}</div>
        </div>
        <div className="mt-4">{renderContent(doc.content)}</div>
        {doc.error ? <div className="mt-4 text-xs text-amber-200/80">{doc.error}</div> : null}
      </div>
    </div>
  );
}
