import { requireArtistSession } from "../../../../lib/auth/artist";
import { getArtistSubscriptionStatus } from "../../../../lib/subscriptions/artist";

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default async function SubscriptionPage() {
  const session = await requireArtistSession();
  const sub = await getArtistSubscriptionStatus(session.user.uid);

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
        <pre className="mt-3 overflow-auto rounded-xl bg-black/40 p-3 text-xs text-zinc-200">
{prettyJson(sub.features)}
        </pre>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-300">
        Upgrades are typically handled by admin/payment integration. If you don’t have a paid plan yet, you’ll see Free.
      </div>
    </div>
  );
}
