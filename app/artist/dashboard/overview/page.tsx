import Link from "next/link";

import { requireArtistSession } from "../../../../lib/auth/artist";
import { getSupabaseAdminClient } from "../../../../lib/supabase/admin";

type Trend = {
  label: string;
  points: number[];
};

function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function formatMoney(value: number | null | undefined, currency: string): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function Sparkline({ points }: { points: number[] }) {
  const width = 120;
  const height = 32;
  const padding = 2;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1, max - min);

  const stepX = (width - padding * 2) / Math.max(1, points.length - 1);
  const d = points
    .map((p, i) => {
      const x = padding + i * stepX;
      const y = padding + (height - padding * 2) * (1 - (p - min) / range);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="text-zinc-200/60"
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function MetricCard({
  title,
  value,
  caption,
  trend,
  icon,
}: {
  title: string;
  value: string;
  caption?: string;
  trend?: Trend;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-zinc-400">{title}</div>
          <div className="mt-1 truncate text-2xl font-semibold text-white">{value}</div>
          {caption ? <div className="mt-1 text-xs text-zinc-500">{caption}</div> : null}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/40">
          {icon}
        </div>
      </div>

      {trend ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-xs text-zinc-500">{trend.label}</div>
          <Sparkline points={trend.points} />
        </div>
      ) : null}
    </div>
  );
}

function ActionButton({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm transition hover:border-zinc-700"
    >
      <div className="text-sm font-medium text-white group-hover:underline">
        {title}
      </div>
      <div className="mt-1 text-sm text-zinc-400">{description}</div>
    </Link>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      className="text-zinc-100"
    >
      <path d={d} fill="currentColor" />
    </svg>
  );
}

async function getOverviewStats() {
  // Placeholder defaults (used if Supabase isn't configured).
  const base = {
    songsUploaded: null as number | null,
    totalPlaysAllTime: null as number | null,
    totalEarningsLocal: null as number | null,
    currency: "MWK",

    streams7d: null as number | null,
    streams30d: null as number | null,
    likesAndComments30d: null as number | null,
    earningsCoins30d: null as number | null,
    activeFans: null as number | null,

    alerts: {
      newFanMessages: null as number | null,
      pendingSongApprovals: null as number | null,
    },
  };

  return base;
}

async function getOverviewStatsFromSupabase(artistUid: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const now = new Date();
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Conventions from the backup project's Supabase schema:
  // - analytics_events: actor_type + actor_id can represent the artist.
  // - transactions: target_type='artist' and target_id is the artist identifier (Firebase UID).
  const [streams7d, streams30d, streamsAll, likesComments30d, coins30d, activeFans] =
    await Promise.all([
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_name", "play")
        .eq("actor_type", "artist")
        .eq("actor_id", artistUid)
        .gte("created_at", since7d),
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_name", "play")
        .eq("actor_type", "artist")
        .eq("actor_id", artistUid)
        .gte("created_at", since30d),
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_name", "play")
        .eq("actor_type", "artist")
        .eq("actor_id", artistUid),
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .in("event_name", ["like", "comment"])
        .eq("actor_type", "artist")
        .eq("actor_id", artistUid)
        .gte("created_at", since30d),
      supabase
        .from("transactions")
        .select("coins", { count: "exact" })
        .eq("target_type", "artist")
        .eq("target_id", artistUid)
        .in("type", ["gift", "battle_reward"])
        .gte("created_at", since30d)
        .limit(5000),
      supabase
        .from("transactions")
        .select("actor_id", { count: "exact" })
        .eq("target_type", "artist")
        .eq("target_id", artistUid)
        .eq("type", "subscription")
        .gte("created_at", since30d)
        .limit(5000),
    ]);

  if (
    streams7d.error ||
    streams30d.error ||
    streamsAll.error ||
    likesComments30d.error ||
    coins30d.error ||
    activeFans.error
  ) {
    return null;
  }

  const coinsSum30d = (coins30d.data ?? []).reduce(
    (acc, row) => acc + (typeof row.coins === "number" ? row.coins : Number(row.coins ?? 0)),
    0,
  );

  const distinctFans = new Set(
    (activeFans.data ?? [])
      .map((r) => r.actor_id)
      .filter((v): v is string => typeof v === "string" && v.length > 0),
  );

  return {
    songsUploaded: null as number | null,
    totalPlaysAllTime: streamsAll.count ?? null,
    totalEarningsLocal: null as number | null,
    currency: "MWK",

    streams7d: streams7d.count ?? null,
    streams30d: streams30d.count ?? null,
    likesAndComments30d: likesComments30d.count ?? null,
    earningsCoins30d: Number.isFinite(coinsSum30d) ? coinsSum30d : null,
    activeFans: distinctFans.size,

    alerts: {
      newFanMessages: null as number | null,
      pendingSongApprovals: null as number | null,
    },
  };
}

export default async function ArtistOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  void searchParams;
  const session = await requireArtistSession();
  const stats =
    (await getOverviewStatsFromSupabase(session.user.uid)) ?? (await getOverviewStats());

  const displayName = session.user.name ?? session.user.email ?? "Artist";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-3xl border border-zinc-800 bg-zinc-950/40 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold text-white">
            Welcome, {displayName}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Your artist dashboard snapshot: uploads, engagement, earnings, and growth.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
              <div className="text-xs text-zinc-500">Songs uploaded</div>
              <div className="mt-1 text-lg font-semibold text-white">
                {formatInt(stats.songsUploaded)}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
              <div className="text-xs text-zinc-500">Total plays</div>
              <div className="mt-1 text-lg font-semibold text-white">
                {formatInt(stats.totalPlaysAllTime)}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
              <div className="text-xs text-zinc-500">Total earnings</div>
              <div className="mt-1 text-lg font-semibold text-white">
                {formatMoney(stats.totalEarningsLocal, stats.currency)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {session.user.picture ? (
            // Using <img> (not next/image) to avoid domain allowlist setup.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.picture}
              alt="Profile"
              className="h-14 w-14 rounded-2xl border border-zinc-800 object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/40 text-sm font-semibold text-zinc-200">
              {(displayName[0] ?? "A").toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Key metrics</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Streams, engagement, earnings, and active fans.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total streams"
            value={formatInt(stats.streams7d)}
            caption="Last 7 days"
            trend={{ label: "7-day trend", points: [2, 3, 3, 5, 4, 6, 6] }}
            icon={<Icon d="M12 3l9 8-1.4 1.4L12 5.8 4.4 12.4 3 11z" />}
          />
          <MetricCard
            title="Total streams"
            value={formatInt(stats.streams30d)}
            caption="Last 30 days"
            trend={{ label: "30-day trend", points: [2, 2, 3, 2, 4, 4, 5] }}
            icon={<Icon d="M4 19h16v2H4zM6 3h2v14H6zM11 7h2v10h-2zM16 10h2v7h-2z" />}
          />
          <MetricCard
            title="Likes + comments"
            value={formatInt(stats.likesAndComments30d)}
            caption="Last 30 days"
            trend={{ label: "Engagement trend", points: [1, 1, 2, 3, 2, 3, 4] }}
            icon={<Icon d="M12 21s-7-4.6-9.5-8.5C.7 9.1 3 6 6.5 6c1.7 0 3.1.8 3.9 2 0.8-1.2 2.2-2 3.9-2C17.7 6 20 9.1 21.5 12.5 19 16.4 12 21 12 21z" />}
          />
          <MetricCard
            title="Earnings"
            value={`${formatInt(stats.earningsCoins30d)} coins`}
            caption="Last 30 days"
            trend={{ label: "Earnings trend", points: [1, 1, 1, 2, 2, 3, 3] }}
            icon={<Icon d="M12 1a11 11 0 100 22 11 11 0 000-22zm1 17.9V20h-2v-1.1a4.5 4.5 0 01-3.2-2.1l1.7-1a2.7 2.7 0 002.5 1.4c1.1 0 2-.5 2-1.5 0-1.1-1-1.5-2.6-1.9-1.8-.5-3.6-1.2-3.6-3.4 0-1.7 1.2-2.9 3.2-3.3V4h2v1.1c1.3.2 2.3.9 2.9 1.8l-1.7 1a2.5 2.5 0 00-2.3-1.2c-1.1 0-1.8.5-1.8 1.3 0 .9.8 1.2 2.4 1.6 2 .5 3.8 1.3 3.8 3.7 0 1.8-1.2 3.1-3.3 3.4z" />}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard
            title="Active fans"
            value={formatInt(stats.activeFans)}
            caption="Subscribers / followers"
            icon={<Icon d="M16 11c1.7 0 3-1.3 3-3S17.7 5 16 5s-3 1.3-3 3 1.3 3 3 3zM8 11c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0c-.3 0-.7 0-1.1.1 1.4.9 2.1 2 2.1 3.4V19h6v-2.5c0-2.3-4.7-3.5-7-3.5z" />}
          />
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
            <div className="text-sm font-medium text-white">All time</div>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="text-xs text-zinc-500">Streams</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {formatInt(stats.totalPlaysAllTime)}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="text-xs text-zinc-500">Songs</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {formatInt(stats.songsUploaded)}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="text-xs text-zinc-500">Earnings</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {formatMoney(stats.totalEarningsLocal, stats.currency)}
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-zinc-500">
              Tip: connect Firestore/analytics to replace placeholders.
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Quick actions</h2>
          <p className="mt-1 text-sm text-zinc-400">Common workflows to keep you moving.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ActionButton
            href="/artist/dashboard/music"
            title="Upload song"
            description="Add new audio and submit for approval."
          />
          <ActionButton
            href="/artist/dashboard/videos"
            title="Upload video"
            description="Post a music video or short clip."
          />
          <ActionButton
            href="/artist/dashboard/live"
            title="Start live stream"
            description="Go live and engage your fans."
          />
          <ActionButton
            href="/artist/dashboard/analytics"
            title="Check analytics"
            description="View streams, fans, and earnings trends."
          />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Alerts</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Important updates: messages, approvals, and account status.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
            <div className="text-sm text-zinc-500">New fan messages</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {formatInt(stats.alerts.newFanMessages)}
            </div>
            <div className="mt-2 text-sm text-zinc-400">
              Reply quickly to grow engagement.
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
            <div className="text-sm text-zinc-500">Pending song approvals</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {formatInt(stats.alerts.pendingSongApprovals)}
            </div>
            <div className="mt-2 text-sm text-zinc-400">
              You’ll be notified when approvals complete.
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
            <div className="text-sm text-zinc-500">Account status</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {session.status}
            </div>
            <div className="mt-2 text-sm text-zinc-400">
              Manage profile and preferences in Settings.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
