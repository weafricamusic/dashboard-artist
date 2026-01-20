import Link from "next/link";

import { requireArtistSession } from "../../../../lib/auth/artist";
import {
  getEarningsSummaryForArtist,
  getGeoBreakdownForArtist,
  getPerContentStatsForArtist,
  getStreamsTrendForArtist,
} from "../../../../lib/analytics/insights";
import { listSongs } from "../../../../lib/content/songs";
import { listVideos } from "../../../../lib/content/videos";
import { BarChart } from "../_components/charts/BarChart";
import { LineChart } from "../_components/charts/LineChart";
import { PieChart } from "../_components/charts/PieChart";

function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

export default async function ArtistAnalyticsPage() {
  const session = await requireArtistSession();

  const [songs, videos, streamsTrend, earnings, geo, perContent] = await Promise.all([
    listSongs(session.user.uid),
    listVideos(session.user.uid),
    getStreamsTrendForArtist(session.user.uid, 30),
    getEarningsSummaryForArtist(session.user.uid),
    getGeoBreakdownForArtist(session.user.uid, 30),
    getPerContentStatsForArtist(session.user.uid, 30),
  ]);

  const topContent = [
    ...songs.map((s) => ({
      kind: "Song" as const,
      id: s.id,
      title: s.title,
      status: s.status,
      streams: perContent.songs[s.id]?.streams ?? s.plays,
      likes: perContent.songs[s.id]?.likes ?? s.likes,
      comments: perContent.songs[s.id]?.comments ?? s.comments,
      shares: perContent.songs[s.id]?.shares ?? s.shares,
      updatedAt: s.updatedAt,
    })),
    ...videos.map((v) => ({
      kind: "Video" as const,
      id: v.id,
      title: v.title,
      status: v.status,
      streams: perContent.videos[v.id]?.streams ?? v.views,
      likes: perContent.videos[v.id]?.likes ?? v.likes,
      comments: perContent.videos[v.id]?.comments ?? v.comments,
      shares: perContent.videos[v.id]?.shares ?? v.shares,
      updatedAt: v.updatedAt,
    })),
  ]
    .sort((a, b) => b.streams - a.streams)
    .slice(0, 8);

  const pieSlices = topContent
    .slice(0, 4)
    .map((c) => ({ label: c.title || "Untitled", value: c.streams }));

  const streamPoints = streamsTrend.series.map((p) => ({
    label: p.day.slice(5),
    value: p.value,
  }));

  const earningsPoints = earnings.dailyCoinsLast30d.map((p) => ({
    label: p.day.slice(5),
    value: p.value,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Analytics</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Streams, engagement, earnings, top content, and audience regions.
          </p>
        </div>
        <Link
          href="/artist/dashboard/earnings"
          className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
        >
          View earnings
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-white">Streams over time</div>
              <div className="mt-1 text-xs text-zinc-500">Last 30 days</div>
            </div>
            <div className="text-sm text-zinc-300">{formatInt(streamsTrend.total)} plays</div>
          </div>
          <div className="mt-3">
            <LineChart points={streamPoints} />
          </div>
          {streamsTrend.truncated ? (
            <div className="mt-2 text-xs text-amber-300">
              Note: results truncated for performance.
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-white">Earnings trend (coins)</div>
              <div className="mt-1 text-xs text-zinc-500">Last 30 days</div>
            </div>
            <div className="text-sm text-zinc-300">{formatInt(earnings.coins.month)} coins</div>
          </div>
          <div className="mt-3">
            <LineChart points={earningsPoints} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-white">Top content</div>
              <div className="mt-1 text-xs text-zinc-500">
                Based on streams/views (Supabase events if available; otherwise Firestore counters)
              </div>
            </div>
          </div>

          {topContent.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-400">
              No content yet. Add songs or videos to start tracking performance.
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-zinc-500">
                  <tr className="border-b border-zinc-800">
                    <th className="py-2 pr-3 font-medium">Title</th>
                    <th className="py-2 pr-3 font-medium">Type</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 text-right font-medium">Streams</th>
                    <th className="py-2 pr-3 text-right font-medium">Likes</th>
                    <th className="py-2 pr-3 text-right font-medium">Comments</th>
                    <th className="py-2 text-right font-medium">Shares</th>
                  </tr>
                </thead>
                <tbody>
                  {topContent.map((c) => {
                    const href =
                      c.kind === "Song"
                        ? `/artist/dashboard/music/${c.id}/edit`
                        : `/artist/dashboard/videos/${c.id}/edit`;
                    return (
                      <tr key={`${c.kind}:${c.id}`} className="border-b border-zinc-900">
                        <td className="py-2 pr-3">
                          <Link className="font-medium text-zinc-100 hover:underline" href={href}>
                            {c.title || "Untitled"}
                          </Link>
                        </td>
                        <td className="py-2 pr-3 text-zinc-300">{c.kind}</td>
                        <td className="py-2 pr-3 text-zinc-300">{c.status}</td>
                        <td className="py-2 pr-3 text-right text-zinc-100">{formatInt(c.streams)}</td>
                        <td className="py-2 pr-3 text-right text-zinc-100">{formatInt(c.likes)}</td>
                        <td className="py-2 pr-3 text-right text-zinc-100">{formatInt(c.comments)}</td>
                        <td className="py-2 text-right text-zinc-100">{formatInt(c.shares)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {perContent.source === "supabase" && perContent.usedColumns ? (
            <div className="mt-3 text-xs text-zinc-500">
              Using analytics_events columns: {perContent.usedColumns.kind === "pair"
                ? `${perContent.usedColumns.typeCol}, ${perContent.usedColumns.idCol}`
                : perContent.usedColumns.idCol}
              {perContent.truncated ? " (truncated)" : ""}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
          <div className="text-sm font-medium text-white">Top performers (share)</div>
          <div className="mt-1 text-xs text-zinc-500">Top 4 by streams/views</div>
          <div className="mt-4 flex items-center justify-center">
            <PieChart slices={pieSlices} />
          </div>
          {pieSlices.length === 0 ? (
            <div className="mt-3 text-center text-sm text-zinc-400">No data yet.</div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
          <div className="text-sm font-medium text-white">Geographic distribution (countries)</div>
          <div className="mt-1 text-xs text-zinc-500">Last 30 days</div>

          {geo.countries.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-400">
              Geo data not available yet. When your analytics source captures country/city,
              it will appear here.
            </div>
          ) : (
            <>
              <div className="mt-3">
                <BarChart data={geo.countries.map((c) => ({ label: c.label, value: c.count }))} />
              </div>
              <div className="mt-3 space-y-1 text-sm">
                {geo.countries.map((c) => (
                  <div key={c.label} className="flex items-center justify-between gap-3">
                    <div className="truncate text-zinc-300">{c.label}</div>
                    <div className="text-zinc-100">{formatInt(c.count)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
          <div className="text-sm font-medium text-white">Geographic distribution (cities)</div>
          <div className="mt-1 text-xs text-zinc-500">Last 30 days</div>

          {geo.cities.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-400">No city breakdown available.</div>
          ) : (
            <div className="mt-3 space-y-1 text-sm">
              {geo.cities.map((c) => (
                <div key={c.label} className="flex items-center justify-between gap-3">
                  <div className="truncate text-zinc-300">{c.label}</div>
                  <div className="text-zinc-100">{formatInt(c.count)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
        <div className="text-sm font-medium text-white">Audience demographics</div>
        <div className="mt-1 text-xs text-zinc-500">Age, gender, device, etc.</div>
        <div className="mt-3 text-sm text-zinc-400">
          Demographics will show once your analytics pipeline stores these fields.
        </div>
      </div>
    </div>
  );
}
