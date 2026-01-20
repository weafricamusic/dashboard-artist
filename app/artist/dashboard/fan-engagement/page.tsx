import Link from "next/link";

import { requireArtistSession } from "../../../../lib/auth/artist";
import {
  getPerContentStatsForArtist,
  getSubscriberStatsForArtist,
  getTopSupportersForArtist,
} from "../../../../lib/analytics/insights";
import { listSongs } from "../../../../lib/content/songs";
import { listVideos } from "../../../../lib/content/videos";

function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function pct(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value * 100)}%`;
}

export default async function ArtistFanEngagementPage() {
  const session = await requireArtistSession();

  const [songs, videos, supportersRes, subs, perContent] = await Promise.all([
    listSongs(session.user.uid),
    listVideos(session.user.uid),
    getTopSupportersForArtist(session.user.uid, 30),
    getSubscriberStatsForArtist(session.user.uid),
    getPerContentStatsForArtist(session.user.uid, 30),
  ]);

  const content = [
    ...songs.map((s) => ({
      kind: "Song" as const,
      id: s.id,
      title: s.title,
      streams: perContent.songs[s.id]?.streams ?? s.plays,
      interactions:
        (perContent.songs[s.id]?.likes ?? s.likes) +
        (perContent.songs[s.id]?.comments ?? s.comments) +
        (perContent.songs[s.id]?.shares ?? s.shares),
    })),
    ...videos.map((v) => ({
      kind: "Video" as const,
      id: v.id,
      title: v.title,
      streams: perContent.videos[v.id]?.streams ?? v.views,
      interactions:
        (perContent.videos[v.id]?.likes ?? v.likes) +
        (perContent.videos[v.id]?.comments ?? v.comments) +
        (perContent.videos[v.id]?.shares ?? v.shares),
    })),
  ];

  const interactionTable = content
    .map((c) => ({
      ...c,
      rate: c.streams > 0 ? c.interactions / c.streams : null,
    }))
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Fan Engagement</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Top supporters, subscribers, and interaction rate by content.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm">
          <div className="text-sm text-zinc-400">New subscribers (7d)</div>
          <div className="mt-1 text-2xl font-semibold text-white">{formatInt(subs.newSubscribers7d)}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm">
          <div className="text-sm text-zinc-400">New subscribers (30d)</div>
          <div className="mt-1 text-2xl font-semibold text-white">{formatInt(subs.newSubscribers30d)}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm">
          <div className="text-sm text-zinc-400">Top supporters window</div>
          <div className="mt-1 text-2xl font-semibold text-white">30 days</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm">
          <div className="text-sm font-medium text-white">Top supporters (coins)</div>
          <div className="mt-1 text-xs text-zinc-400">Based on coins received (last 30 days)</div>

          {supportersRes.supporters.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-400">No supporter data yet.</div>
          ) : (
            <div className="mt-3 space-y-2">
              {supportersRes.supporters.map((s) => (
                <div
                  key={s.fanId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white">{s.fanId}</div>
                    <div className="text-xs text-zinc-400">
                      Last seen: {s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleString() : "—"}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-white">{formatInt(s.coins)} coins</div>
                </div>
              ))}
            </div>
          )}

          {supportersRes.truncated ? (
            <div className="mt-2 text-xs text-amber-300/90">Note: results truncated for performance.</div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm">
          <div className="text-sm font-medium text-white">Interaction rate</div>
          <div className="mt-1 text-xs text-zinc-400">
            (likes + comments + shares) / streams (Supabase events if available; otherwise Firestore counters)
          </div>

          {interactionTable.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-400">No content yet.</div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-zinc-400">
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-3 font-medium">Title</th>
                    <th className="py-2 pr-3 font-medium">Type</th>
                    <th className="py-2 pr-3 text-right font-medium">Streams</th>
                    <th className="py-2 pr-3 text-right font-medium">Interactions</th>
                    <th className="py-2 text-right font-medium">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {interactionTable.map((c) => {
                    const href =
                      c.kind === "Song"
                        ? `/artist/dashboard/music/${c.id}/edit`
                        : `/artist/dashboard/videos/${c.id}/edit`;
                    return (
                      <tr key={`${c.kind}:${c.id}`} className="border-b border-white/10">
                        <td className="py-2 pr-3">
                          <Link className="font-medium text-white hover:underline" href={href}>
                            {c.title || "Untitled"}
                          </Link>
                        </td>
                        <td className="py-2 pr-3 text-zinc-300">{c.kind}</td>
                        <td className="py-2 pr-3 text-right text-zinc-100">{formatInt(c.streams)}</td>
                        <td className="py-2 pr-3 text-right text-zinc-100">
                          {formatInt(c.interactions)}
                        </td>
                        <td className="py-2 text-right font-medium text-zinc-100">{pct(c.rate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {perContent.source === "supabase" && perContent.usedColumns ? (
            <div className="mt-3 text-xs text-zinc-400">
              Using analytics_events columns: {perContent.usedColumns.kind === "pair"
                ? `${perContent.usedColumns.typeCol}, ${perContent.usedColumns.idCol}`
                : perContent.usedColumns.idCol}
              {perContent.truncated ? " (truncated)" : ""}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-white">More engagement insights</div>
            <div className="mt-1 text-sm text-zinc-400">
              Want “top commenters / likers” and per-song geographic heatmaps? We can wire
              those once the analytics events include fan/user identifiers and geo fields.
            </div>
          </div>
          <Link
            href="/artist/dashboard/analytics"
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-100 hover:bg-white/5"
          >
            Back to analytics
          </Link>
        </div>
      </div>
    </div>
  );
}
