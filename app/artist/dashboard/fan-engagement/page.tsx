import Link from "next/link";

import { requireArtistSession } from "../../../../lib/auth/artist";
import {
  getAudienceInsightsForArtist,
  getGeoBreakdownForArtist,
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
  return `${(value * 100).toFixed(1)}%`;
}

function signedPct(value: number | null): string {
  if (value === null) return "—";
  const abs = Math.abs(value * 100).toFixed(0);
  return `${value >= 0 ? "+" : "-"}${abs}%`;
}

function formatFanName(fanId: string): string {
  if (!fanId) return "Unknown fan";
  return fanId.startsWith("@") ? fanId : `@${fanId}`;
}

function supportBadge(coins: number): string {
  if (coins >= 5000) return "🥇 Gold";
  if (coins >= 2000) return "🥈 Silver";
  if (coins >= 500) return "🥉 Bronze";
  return "Supporter";
}

function engagementScoreLabel(score: number): string {
  if (score >= 75) return "🔥 Above average for your genre";
  if (score >= 50) return "📈 Solid momentum — keep posting consistently";
  return "⚡ Early-stage score — upload more and activate fans";
}

type WindowKey = "7d" | "30d" | "all";

function readWindow(value: string | string[] | undefined): WindowKey {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "7d" || raw === "all") return raw;
  return "30d";
}

function windowToDays(windowKey: WindowKey): number | null {
  if (windowKey === "7d") return 7;
  if (windowKey === "all") return null;
  return 30;
}

function windowLabel(windowKey: WindowKey): string {
  if (windowKey === "7d") return "7 days";
  if (windowKey === "all") return "All time";
  return "30 days";
}

function percentOf(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${((part / total) * 100).toFixed(0)}%`;
}

function formatCountry(label: string): string {
  const country = label.trim().toLowerCase();
  if (country === "malawi") return "🇲🇼 Malawi";
  if (country === "south africa") return "🇿🇦 South Africa";
  if (country === "zambia") return "🇿🇲 Zambia";
  return label;
}

export default async function ArtistFanEngagementPage({
  searchParams,
}: {
  searchParams?: Promise<{ window?: string | string[] }>;
}) {
  const session = await requireArtistSession();
  const params = (await searchParams) ?? {};
  const supportersWindow = readWindow(params.window);
  const supportersDays = windowToDays(supportersWindow);

  const [songs, videos, supportersRes, supporters30d, subs, perContent, geo, audience] = await Promise.all([
    listSongs(session.user.uid),
    listVideos(session.user.uid),
    getTopSupportersForArtist(session.user.uid, supportersDays),
    getTopSupportersForArtist(session.user.uid, 30),
    getSubscriberStatsForArtist(session.user.uid),
    getPerContentStatsForArtist(session.user.uid, 30),
    getGeoBreakdownForArtist(session.user.uid, 30),
    getAudienceInsightsForArtist(session.user.uid, 30),
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
    .sort((a, b) => {
      const aRate = a.rate ?? -1;
      const bRate = b.rate ?? -1;
      if (bRate !== aRate) return bRate - aRate;
      return b.streams - a.streams;
    })
    .slice(0, 10);

  const interactionRanked = content
    .map((c) => ({
      ...c,
      rate: c.streams > 0 ? c.interactions / c.streams : null,
    }))
    .filter((c) => c.rate !== null)
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));

  const totalStreams = content.reduce((sum, c) => sum + c.streams, 0);
  const totalInteractions = content.reduce((sum, c) => sum + c.interactions, 0);
  const overallInteractionRate = totalStreams > 0 ? totalInteractions / totalStreams : null;

  const bestContent = interactionRanked[0] ?? null;
  const worstContent = interactionRanked[interactionRanked.length - 1] ?? null;

  const supportersCoins30d = supporters30d.supporters.reduce((sum, row) => sum + row.coins, 0);
  const engagementRaw = (overallInteractionRate ?? 0) * totalStreams + supportersCoins30d;
  const engagementScore = Math.min(100, Math.round((engagementRaw / 5000) * 100));

  const hasAnySubscribers = (subs.totalActiveSubscribers ?? 0) > 0;
  const subscriberMessage =
    !hasAnySubscribers
      ? "⚡ Upload your first song or go live to start gaining subscribers."
      : subs.growthRate7d !== null
        ? `📈 ${signedPct(subs.growthRate7d)} vs last week`
        : (subs.newSubscribers7d ?? 0) > 0
          ? `📈 You gained ${formatInt(subs.newSubscribers7d)} subscribers this week`
          : "⚡ Upload more content to increase subscribers.";

  const countryTotal = geo.countries.reduce((sum, row) => sum + row.count, 0);
  const topCities = geo.cities.slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Fan Engagement</h1>
        <p className="mt-1 text-sm text-zinc-400">
          See who supports you, how fans interact, and where your audience is growing.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm">
        <div className="text-sm font-medium text-white">Subscribers Growth</div>
        <div className="mt-1 text-xs text-zinc-400">Track subscriber momentum and what to do next.</div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="text-sm text-zinc-400">New subscribers (7d)</div>
            <div className="mt-1 text-2xl font-semibold text-white">{formatInt(subs.newSubscribers7d)}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="text-sm text-zinc-400">New subscribers (30d)</div>
            <div className="mt-1 text-2xl font-semibold text-white">{formatInt(subs.newSubscribers30d)}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="text-sm text-zinc-400">Total active subscribers</div>
            <div className="mt-1 text-2xl font-semibold text-white">{formatInt(subs.totalActiveSubscribers)}</div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-100">
          {subscriberMessage}
        </div>

        {!hasAnySubscribers ? (
          <div className="mt-2 text-xs text-zinc-300">💡 Artists who post weekly often grow faster.</div>
        ) : null}

        {(subs.previousSubscribers7d ?? 0) > 0 ? (
          <div className="mt-2 text-xs text-zinc-400">
            Previous 7 days: {formatInt(subs.previousSubscribers7d)} new subscribers
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm md:col-span-3">
          <div className="text-sm font-medium text-white">Top Supporters (Coins Leaderboard)</div>
          <div className="mt-1 text-xs text-zinc-400">Create healthy fan competition with visible coin rankings.</div>

          <div className="mt-3 flex flex-wrap gap-2">
            {([
              { key: "7d", label: "7 days" },
              { key: "30d", label: "30 days" },
              { key: "all", label: "All time" },
            ] as const).map((w) => {
              const active = supportersWindow === w.key;
              return (
                <Link
                  key={w.key}
                  href={`/artist/dashboard/fan-engagement?window=${w.key}`}
                  className={
                    "rounded-lg border px-3 py-1.5 text-sm " +
                    (active
                      ? "border-violet-500 bg-violet-500/20 text-violet-100"
                      : "border-white/10 bg-black/20 text-zinc-300 hover:bg-white/5")
                  }
                >
                  {w.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-3 text-xs text-zinc-500">Current window: {windowLabel(supportersWindow)}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm">
          <div className="text-sm font-medium text-white">Leaderboard</div>
          <div className="mt-1 text-xs text-zinc-400">Rank • Fan name • Coins sent • Badge</div>

          {supportersRes.supporters.length === 0 ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-300">
              <div>💰 Fans who send you coins will appear here.</div>
              <div className="mt-1 text-zinc-400">🎁 Encourage supporters during live battles to climb the leaderboard.</div>
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-zinc-400">
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-3 font-medium">Rank</th>
                    <th className="py-2 pr-3 font-medium">Fan</th>
                    <th className="py-2 pr-3 text-right font-medium">Coins Sent</th>
                    <th className="py-2 text-right font-medium">Badge</th>
                  </tr>
                </thead>
                <tbody>
                  {supportersRes.supporters.map((s, idx) => (
                    <tr key={s.fanId} className="border-b border-white/10">
                      <td className="py-2 pr-3 text-zinc-100">#{idx + 1}</td>
                      <td className="py-2 pr-3">
                        <div className="truncate font-medium text-white">{formatFanName(s.fanId)}</div>
                        <div className="text-xs text-zinc-400">
                          Last seen: {s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleString() : "—"}
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-right text-zinc-100">{formatInt(s.coins)}</td>
                      <td className="py-2 text-right text-zinc-100">{supportBadge(s.coins)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 text-xs text-zinc-400">Badge tiers: 🥇 Gold (5000+) • 🥈 Silver (2000+) • 🥉 Bronze (500+)</div>

          {supportersRes.truncated ? (
            <div className="mt-2 text-xs text-amber-300/90">Note: results truncated for performance.</div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm">
          <div className="text-sm font-medium text-white">Interaction Rate</div>
          <div className="mt-1 text-xs text-zinc-400">
            (likes + comments + shares) / streams (Supabase events if available; otherwise Firestore counters)
          </div>

          {overallInteractionRate === null ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-400">
              🎵 Upload music or videos to unlock engagement analytics.
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="text-xs text-emerald-100/80">Overall interaction rate</div>
              <div className="mt-1 text-xl font-semibold text-emerald-100">{pct(overallInteractionRate)}</div>
              <div className="mt-1 text-xs text-emerald-100/80">
                {formatInt(totalInteractions)} interactions from {formatInt(totalStreams)} streams
              </div>
            </div>
          )}

          {bestContent && worstContent ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Best performing content</div>
                <div className="mt-1 text-sm font-medium text-zinc-100">{bestContent.title || "Untitled"}</div>
                <div className="text-xs text-zinc-400">{formatInt(bestContent.streams)} streams • {pct(bestContent.rate)}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Lowest performing content</div>
                <div className="mt-1 text-sm font-medium text-zinc-100">{worstContent.title || "Untitled"}</div>
                <div className="text-xs text-zinc-400">{formatInt(worstContent.streams)} streams • {pct(worstContent.rate)}</div>
              </div>
            </div>
          ) : null}

          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
            🎯 Tip: Songs above 8% engagement usually grow faster.
          </div>

          {interactionTable.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-400">🎵 Upload music or videos to unlock engagement analytics.</div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-zinc-400">
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-3 font-medium">Title</th>
                    <th className="py-2 pr-3 font-medium">Type</th>
                    <th className="py-2 pr-3 text-right font-medium">Streams</th>
                    <th className="py-2 text-right font-medium">Engagement Rate</th>
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
            <div className="text-sm font-medium text-white">Audience Insights (Advanced)</div>
            <div className="mt-1 text-sm text-zinc-400">Top commenters, top likers, loyal fans, and geo breakdown.</div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Top commenters</div>
                {audience.source === "none" ? (
                  <div className="mt-1 text-sm text-zinc-200">Requires analytics events with fan IDs and comment events.</div>
                ) : null}
                {audience.topCommenter ? (
                  <div className="mt-1 text-sm text-zinc-200">
                    🏆 Most active commenter this month: {formatFanName(audience.topCommenter.fanId)} ({formatInt(audience.topCommenter.count)} comments)
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-zinc-200">No commenter insights yet.</div>
                )}
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Top likers</div>
                {audience.topLiker ? (
                  <div className="mt-1 text-sm text-zinc-200">
                    ❤️ Biggest engager: {formatFanName(audience.topLiker.fanId)} ({formatInt(audience.topLiker.count)} likes)
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-zinc-200">No liker insights yet.</div>
                )}
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Most loyal listeners</div>
                {audience.mostLoyalListener ? (
                  <div className="mt-1 text-sm text-zinc-200">
                    🔁 Most loyal listener: {formatFanName(audience.mostLoyalListener.fanId)} ({formatInt(audience.mostLoyalListener.count)} streams)
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-zinc-200">No listener loyalty insights yet.</div>
                )}
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Geographic breakdown (30d)</div>
                {geo.countries.length === 0 ? (
                  <div className="mt-1 text-sm text-zinc-200">🌍 Listener locations will appear once streams are recorded.</div>
                ) : (
                  <div className="mt-1 space-y-1 text-sm text-zinc-200">
                    {geo.countries.slice(0, 3).map((country) => (
                      <div key={country.label} className="flex items-center justify-between gap-3">
                        <span className="truncate">{formatCountry(country.label)}</span>
                        <span>{percentOf(country.count, countryTotal)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {topCities.length > 0 ? (
                  <div className="mt-2 text-xs text-zinc-400">
                    Top cities: {topCities.map((city) => city.label).join(", ")}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-zinc-300">
              Required advanced schema: `analytics_events(id, artist_id, fan_id, content_id, event_type, geo_country, geo_city, created_at)`
            </div>

            <div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/10 p-3">
              <div className="text-xs text-violet-100/80">WeAfrica Engagement Score (Beta)</div>
              <div className="mt-1 text-2xl font-semibold text-violet-100">{formatInt(engagementScore)}/100</div>
              <div className="mt-1 text-xs text-violet-100/80">
                Formula: (Engagement rate × Streams) + Coins received (30d)
              </div>
              <div className="mt-1 text-xs text-violet-100/80">{engagementScoreLabel(engagementScore)}</div>
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
