import Link from "next/link";

import { listPublicLiveSessions } from "../../lib/live/sessions";

export const runtime = "nodejs";

function pillClass(status: string): string {
  if (status === "live") return "bg-rose-600/20 text-rose-200 border-rose-900/40";
  if (status === "scheduled") return "bg-amber-600/20 text-amber-200 border-amber-900/40";
  return "bg-zinc-700/20 text-zinc-200 border-zinc-700/40";
}

export default async function PublicLiveIndexPage() {
  const res = await listPublicLiveSessions({ limit: 25 });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-white">Live</h1>
        <p className="mt-1 text-sm text-zinc-400">Watch upcoming and live sessions.</p>
      </div>

      {res.error ? (
        <div className="rounded-2xl border border-amber-900/40 bg-amber-950/40 p-4 text-sm text-amber-200">
          {res.error}
        </div>
      ) : null}

      {res.sessions.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-300">
          No public live sessions right now.
        </div>
      ) : (
        <div className="space-y-2">
          {res.sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-white">{s.title}</div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs ${pillClass(s.status)}`}
                  >
                    {s.status.toUpperCase()}
                  </span>
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  {new Date(s.startsAt).toLocaleString()}
                </div>
              </div>
              <Link
                className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
                href={`/live/${s.id}`}
              >
                Watch
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-zinc-500">
        Tip: Artists can share the watch link from the dashboard Live page.
      </div>
    </div>
  );
}
