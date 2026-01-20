import Link from "next/link";

import { getArtistSubscriptionStatus, type ArtistSubscriptionStatus } from "../../../../lib/subscriptions/artist";

function formatExpiry(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const t = Date.parse(expiresAt);
  if (!Number.isFinite(t)) return expiresAt;
  return new Date(t).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export async function SubscriptionStatusBanner({
  artistUid,
  subscription,
}: {
  artistUid: string;
  subscription?: ArtistSubscriptionStatus;
}) {
  const sub = subscription ?? (await getArtistSubscriptionStatus(artistUid));

  const planLabel = sub.planName || sub.planCode;
  const expiry = sub.planCode === "free" ? null : formatExpiry(sub.expiresAt);

  const showUpgrade = sub.planCode === "free" || sub.planCode === "premium";
  const ctaLabel = sub.planCode === "free" ? "Upgrade" : "Upgrade to Platinum";

  return (
    <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">Subscription</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-300">
            <span>
              Current Plan: <span className="font-semibold text-zinc-100">{planLabel}</span>
            </span>
            {expiry ? <span>Expiry: {expiry}</span> : null}
          </div>
          {sub.error ? <div className="mt-2 text-xs text-amber-200/80">{sub.error}</div> : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/artist/dashboard/subscription"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 text-sm font-semibold text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
          >
            Manage
          </Link>

          {showUpgrade ? (
            <Link
              href="/artist/dashboard/subscription"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
            >
              {ctaLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
