import Link from "next/link";

import { requireArtistSession } from "../../../../lib/auth/artist";
import { GoLiveSection } from "../_components/GoLiveSection";
import { MetricDisplay } from "../_components/MetricDisplay";
import { Card, CardHeader, CardTitle, CardContent } from "../_components/Card";
import { ContentOverviewCard } from "../_components/ContentOverviewCard";
import { EarningsCard } from "../_components/EarningsCard";
import { EngagementCard } from "../_components/EngagementCard";
import { DashboardGrid } from "../_components/DashboardGrid";
import { SectionHeader } from "../_components/SectionHeader";
import {
  IconMusic,
  IconPlay,
  IconHeart,
  IconMessage,
  IconCoin,
  IconTrendingUp,
} from "../_components/IconSet";
import {
  getContentStats,
  getEarningsStats,
  getTopContent,
  getAudienceDemographics,
  getEngagementMetrics,
} from "../_lib/dashboardService";

function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)}%`;
}

function formatMwk(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

export default async function ArtistOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  void searchParams;
  const session = await requireArtistSession();
  const artistUid = session.user.uid;

  // Fetch all dashboard data in parallel
  const [
    contentData,
    earningsData,
    topContent,
    demographics,
    engagement,
  ] = await Promise.all([
    getContentStats(artistUid),
    getEarningsStats(artistUid),
    getTopContent(artistUid, 7),
    getAudienceDemographics(artistUid, 5),
    getEngagementMetrics(artistUid),
  ]);

  const displayName = session.user.name ?? session.user.email ?? "Artist";
  const mwkRateRaw = process.env.COIN_TO_MWK_RATE;
  const mwkRateNum = mwkRateRaw ? Number(mwkRateRaw) : null;
  const mwkRate = Number.isFinite(mwkRateNum) && (mwkRateNum ?? 0) > 0 ? (mwkRateNum as number) : null;
  const totalCoins = earningsData?.totalCoins ?? null;
  const totalMwk = mwkRate && totalCoins !== null ? totalCoins * mwkRate : null;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-950/40 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {displayName}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Track your streams, engagement, earnings, and grow your fanbase.
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-4">
          {session.user.picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.picture}
              alt="Profile"
              className="h-12 w-12 rounded-lg border border-zinc-800 object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-800 text-sm font-semibold text-white">
              {(displayName[0] ?? "A").toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics Overview */}
      <section className="space-y-4">
        <SectionHeader
          title="Key Metrics"
          description="Your performance at a glance."
        />
        <DashboardGrid columns="4col">
          <MetricDisplay
            label="Plays (7d)"
            value={formatInt(engagement?.plays7d)}
            subtext="Last 7 days"
            icon={<IconPlay className="w-5 h-5" />}
          />
          <MetricDisplay
            label="Plays (30d)"
            value={formatInt(engagement?.plays30d)}
            subtext="Last 30 days"
            icon={<IconPlay className="w-5 h-5" />}
          />
          <MetricDisplay
            label="Likes (30d)"
            value={formatInt(engagement?.likes30d)}
            subtext="Last 30 days"
            icon={<IconHeart className="w-5 h-5" />}
          />
          <MetricDisplay
            label="Comments (30d)"
            value={formatInt(engagement?.comments30d)}
            subtext="Last 30 days"
            icon={<IconMessage className="w-5 h-5" />}
          />
        </DashboardGrid>
      </section>

      {/* Performance (Read-Only) */}
      <section className="space-y-4">
        <SectionHeader
          title="Performance"
          description="Read-only totals calculated from your songs, videos, and analytics."
        />
        <DashboardGrid columns="4col">
          <MetricDisplay
            label="Total Songs"
            value={formatInt(contentData?.totalSongs)}
            subtext="All-time"
            icon={<IconMusic className="w-5 h-5" />}
          />
          <MetricDisplay
            label="Total Videos"
            value={formatInt(contentData?.totalVideos)}
            subtext="All-time"
            icon={<IconPlay className="w-5 h-5" />}
          />
          <MetricDisplay
            label="Total Plays"
            value={formatInt(contentData?.totalPlays)}
            subtext={
              contentData?.liveViewsAllTime === null || contentData?.liveViewsAllTime === undefined
                ? "Songs + videos"
                : "Songs + videos + live"
            }
            icon={<IconPlay className="w-5 h-5" />}
          />
          <MetricDisplay
            label="Total Likes"
            value={formatInt(contentData?.totalLikes)}
            subtext="Songs + videos"
            icon={<IconHeart className="w-5 h-5" />}
          />
          <MetricDisplay
            label="Total Earnings"
            value={formatInt(totalCoins)}
            subtext={totalMwk !== null ? `≈ MWK ${formatMwk(totalMwk)}` : "Coins"}
            icon={<IconCoin className="w-5 h-5" />}
          />
          <MetricDisplay
            label="Monthly Growth %"
            value={formatPct(engagement?.monthlyGrowthPct)}
            subtext="Last 30d vs previous 30d"
            icon={<IconTrendingUp className="w-5 h-5" />}
          />
        </DashboardGrid>
      </section>

      {/* Content & Earnings Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Content Overview - 2 cols */}
        <div className="lg:col-span-2">
          <section className="space-y-4">
            <SectionHeader title="Recent Content" />
            <ContentOverviewCard
              items={contentData?.items ?? []}
            />
          </section>
        </div>

        {/* Earnings - 1 col */}
        <section className="space-y-4">
          <SectionHeader title="Earnings" />
          <EarningsCard
            totalCoins={earningsData?.totalCoins ?? null}
            pendingCoins={earningsData?.pendingCoins ?? null}
            mwkRate={mwkRate}
            currency="MWK"
          />
        </section>
      </div>

      {/* Engagement & Demographics */}
      <section className="space-y-4">
        <SectionHeader title="Performance & Audience" />
        <div className="grid gap-6 lg:grid-cols-2">
          <EngagementCard
            topContent={topContent}
            audienceDemographics={demographics}
          />

          {/* Content Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Content Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="rounded-lg bg-zinc-900/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Total Songs</span>
                    <span className="text-lg font-semibold text-white">
                      {contentData ? contentData.totalSongs : "—"}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg bg-zinc-900/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Total Videos</span>
                    <span className="text-lg font-semibold text-white">
                      {contentData ? contentData.totalVideos : "—"}
                    </span>
                  </div>
                </div>
                <Link
                  href="/artist/dashboard/analytics"
                  className="flex items-center justify-between rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white"
                >
                  <span>View Analytics</span>
                  <span className="text-zinc-500">→</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Go Live CTA */}
      <section className="space-y-4">
        <SectionHeader title="Go Live" />
        <div className="rounded-lg border border-rose-900/30 bg-gradient-to-r from-rose-950/20 to-zinc-950 p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Stream live to your fans
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Connect with your audience in real-time, invite collaborators, and build engagement.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> HD streaming
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Artist collaborations
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Real-time chat
                </li>
              </ul>
            </div>
            <div className="flex flex-shrink-0">
              <GoLiveSection />
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="space-y-4">
        <SectionHeader title="Quick Actions" />
        <DashboardGrid columns="4col">
          <Link
            href="/artist/dashboard/music"
            className="group rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 transition hover:border-zinc-700 hover:bg-zinc-900/50"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-zinc-800/50 p-2 text-zinc-300 group-hover:bg-zinc-700">
                <IconMusic className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white group-hover:underline">
                  Upload Song
                </p>
                <p className="mt-1 text-xs text-zinc-400">Add new music</p>
              </div>
            </div>
          </Link>

          <Link
            href="/artist/dashboard/videos"
            className="group rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 transition hover:border-zinc-700 hover:bg-zinc-900/50"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-zinc-800/50 p-2 text-zinc-300 group-hover:bg-zinc-700">
                <IconPlay className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white group-hover:underline">
                  Upload Video
                </p>
                <p className="mt-1 text-xs text-zinc-400">Add clips</p>
              </div>
            </div>
          </Link>

          <Link
            href="/artist/dashboard/live"
            className="group rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 transition hover:border-zinc-700 hover:bg-zinc-900/50"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-zinc-800/50 p-2 text-zinc-300 group-hover:bg-zinc-700">
                <IconTrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white group-hover:underline">
                  Live Sessions
                </p>
                <p className="mt-1 text-xs text-zinc-400">Manage streams</p>
              </div>
            </div>
          </Link>

          <Link
            href="/artist/dashboard/earnings"
            className="group rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 transition hover:border-zinc-700 hover:bg-zinc-900/50"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-zinc-800/50 p-2 text-zinc-300 group-hover:bg-zinc-700">
                <IconCoin className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white group-hover:underline">
                  Earnings
                </p>
                <p className="mt-1 text-xs text-zinc-400">Manage payouts</p>
              </div>
            </div>
          </Link>
        </DashboardGrid>
      </section>

      {/* Profile & Support */}
      <section className="space-y-4">
        <SectionHeader title="Account" />
        <DashboardGrid columns="2col">
          <Link
            href="/artist/dashboard/profile"
            className="group rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 transition hover:border-zinc-700 hover:bg-zinc-900/50"
          >
            <p className="font-medium text-white group-hover:underline">
              Edit Profile
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Update your name, bio, and photo
            </p>
          </Link>

          <Link
            href="/artist/dashboard/support"
            className="group rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 transition hover:border-zinc-700 hover:bg-zinc-900/50"
          >
            <p className="font-medium text-white group-hover:underline">
              Support & Help
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              FAQ and contact support
            </p>
          </Link>
        </DashboardGrid>
      </section>
    </div>
  );
}
