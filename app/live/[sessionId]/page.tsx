import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublicLiveSessionById } from "../../../lib/live/sessions";

export const runtime = "nodejs";

function statusTone(status: string): { label: string; className: string } {
  if (status === "live") {
    return {
      label: "LIVE",
      className: "border-rose-900/40 bg-rose-950/40 text-rose-200",
    };
  }
  if (status === "scheduled") {
    return {
      label: "UPCOMING",
      className: "border-amber-900/40 bg-amber-950/40 text-amber-200",
    };
  }
  if (status === "ended") {
    return {
      label: "ENDED",
      className: "border-zinc-800 bg-zinc-950/40 text-zinc-200",
    };
  }
  return {
    label: status.toUpperCase(),
    className: "border-zinc-800 bg-zinc-950/40 text-zinc-200",
  };
}

export default async function PublicLiveWatchPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const res = await getPublicLiveSessionById(sessionId);
  if (!res.session) notFound();

  const s = res.session;
  const tone = statusTone(s.status);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-white">{s.title}</h1>
            <span className={`rounded-full border px-2 py-0.5 text-xs ${tone.className}`}>{tone.label}</span>
          </div>
          <div className="mt-1 text-sm text-zinc-400">{new Date(s.startsAt).toLocaleString()}</div>
        </div>

        <Link className="text-sm text-zinc-300 underline" href="/live">
          All live
        </Link>
      </div>

      {s.status !== "live" ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-300">
          This session isn’t live yet. If you’re here to watch a battle, keep this page open and refresh once the artist goes live.
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
        <div className="text-sm font-medium text-white">Watch</div>
        <div className="mt-2 text-sm text-zinc-400">
          {s.eventUrl ? (
            <a className="text-zinc-200 underline" href={s.eventUrl} target="_blank" rel="noreferrer">
              Open stream link
            </a>
          ) : (
            "Stream link not set yet."
          )}
        </div>

        <div className="mt-4 text-xs text-zinc-500">
          Battle playback/overlays are not implemented in this dashboard yet; this page validates the consumer watch entry point.
        </div>
      </div>
    </div>
  );
}
