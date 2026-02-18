import { requireArtistSession } from "../../../../lib/auth/artist";
import { getArtistSubscriptionStatus } from "../../../../lib/subscriptions/artist";
import { getFeatureInt, hasFeature } from "../../../../lib/subscriptions/features";

function formatLimit(value: number, label: string): string {
  if (value < 0) return `${label}: Unlimited`;
  if (value === 0) return `${label}: Not allowed`;
  return `${label}: ${value}`;
}

export default async function SubscriptionPage() {
  const session = await requireArtistSession();
  const sub = await getArtistSubscriptionStatus(session.user.uid);

  const maxSongs = getFeatureInt(sub.features, "limits.maxSongs", 0);
  const maxVideos = getFeatureInt(sub.features, "limits.maxVideos", 0);
  const canHostLive = hasFeature(sub.features, "live.canHost", false);
  const aiMonthlyLimit = getFeatureInt(sub.features, "ai.monthlyLimit", 0);
  const aiMaxLengthMinutes = getFeatureInt(sub.features, "ai.maxLengthMinutes", 0);
  const advancedAnalytics = hasFeature(sub.features, "analytics.advanced", false);
  const priorityAiQueue = hasFeature(sub.features, "ai.priorityQueue", false);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-white">Subscription</h1>
      <p className="mt-2 text-sm text-zinc-300">
        Your plan is read from Supabase. The dashboard uses it to unlock/lock features.
      </p>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
        <div className="text-sm font-semibold text-white">Current Plan</div>
        <div className="mt-2 text-sm text-zinc-200">
          {sub.planName} <span className="text-zinc-400">({sub.planCode})</span>
        </div>
        {sub.expiresAt ? <div className="mt-1 text-sm text-zinc-300">Expiry: {sub.expiresAt}</div> : null}
        {sub.error ? <div className="mt-2 text-sm text-amber-200/90">{sub.error}</div> : null}
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
        <div className="text-sm font-semibold text-white">Plan Features</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="text-xs font-semibold text-zinc-300">Uploads</div>
            <div className="mt-2 space-y-1 text-sm text-zinc-200">
              <div>{formatLimit(maxSongs, "Max songs")}</div>
              <div>{formatLimit(maxVideos, "Max videos")}</div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="text-xs font-semibold text-zinc-300">Live</div>
            <div className="mt-2 text-sm text-zinc-200">Can host live: {canHostLive ? "Yes" : "No"}</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="text-xs font-semibold text-zinc-300">AI</div>
            <div className="mt-2 space-y-1 text-sm text-zinc-200">
              <div>{aiMonthlyLimit < 0 ? "Monthly limit: Unlimited" : `Monthly limit: ${aiMonthlyLimit}`}</div>
              <div>{aiMaxLengthMinutes > 0 ? `Max length: ${aiMaxLengthMinutes} min` : "Max length: —"}</div>
              <div>Priority queue: {priorityAiQueue ? "Yes" : "No"}</div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="text-xs font-semibold text-zinc-300">Analytics</div>
            <div className="mt-2 text-sm text-zinc-200">Advanced analytics: {advancedAnalytics ? "Yes" : "No"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
