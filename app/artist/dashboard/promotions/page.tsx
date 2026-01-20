import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireArtistSession } from "../../../../lib/auth/artist";
import {
  createPromotionCampaignForArtist,
  getPromotionLimits,
  listPromotionCampaignsForArtist,
  type PromotionContentType,
} from "../../../../lib/promotions/campaigns";

function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function computeRoi(spendCoins: number, revenueCoins: number): string {
  if (!spendCoins) return "—";
  const roi = (revenueCoins - spendCoins) / spendCoins;
  const pct = roi * 100;
  return `${pct.toFixed(0)}%`;
}

export default async function ArtistPromotionsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await requireArtistSession();

  async function createPromotion(formData: FormData) {
    "use server";

    const session = await requireArtistSession();

    const contentType = String(formData.get("contentType") ?? "song") as PromotionContentType;
    const contentId = String(formData.get("contentId") ?? "").trim();
    const contentLabel = String(formData.get("contentLabel") ?? "").trim();
    const countries = String(formData.get("countries") ?? "").trim();

    const budgetCoins = Number(String(formData.get("budgetCoins") ?? "0").trim());
    const dailyBudgetCoinsRaw = String(formData.get("dailyBudgetCoins") ?? "").trim();
    const dailyBudgetCoins = dailyBudgetCoinsRaw ? Number(dailyBudgetCoinsRaw) : undefined;

    const startsAtLocal = String(formData.get("startsAt") ?? "").trim();
    const endsAtLocal = String(formData.get("endsAt") ?? "").trim();
    const startsAtIso = startsAtLocal ? new Date(startsAtLocal).toISOString() : undefined;
    const endsAtIso = endsAtLocal ? new Date(endsAtLocal).toISOString() : undefined;

    const res = await createPromotionCampaignForArtist(session.user.uid, {
      contentType,
      contentId,
      contentLabel: contentLabel || undefined,
      targetCountriesCsv: countries,
      budgetCoins,
      dailyBudgetCoins,
      startsAtIso,
      endsAtIso,
    });

    if (!res.ok) {
      redirect(`/artist/dashboard/promotions?promo_error=${encodeURIComponent(res.message)}`);
    }

    revalidatePath("/artist/dashboard/promotions");
    redirect("/artist/dashboard/promotions?promo_created=1");
  }

  const [limitsRes, campaignsRes] = await Promise.all([
    getPromotionLimits(),
    listPromotionCampaignsForArtist(session.user.uid, 25),
  ]);

  const promoError = typeof searchParams?.promo_error === "string" ? searchParams.promo_error : null;
  const promoCreated = typeof searchParams?.promo_created === "string" ? searchParams.promo_created : null;

  const limits = limitsRes.limits;
  const configured = campaignsRes.source === "supabase";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Promotions</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Boost songs/videos/live events with country targeting and coin budgets.
        </p>
      </div>

      {campaignsRes.error ? (
        <div className="rounded-2xl border border-amber-900/40 bg-amber-950/40 p-4 text-sm text-amber-200">
          {campaignsRes.error}
        </div>
      ) : null}

      {limitsRes.error ? (
        <div className="rounded-2xl border border-amber-900/40 bg-amber-950/40 p-4 text-sm text-amber-200">
          {limitsRes.error}
        </div>
      ) : null}

      {promoError ? (
        <div className="rounded-2xl border border-rose-900/40 bg-rose-950/40 p-4 text-sm text-rose-200">
          {promoError}
        </div>
      ) : null}

      {promoCreated ? (
        <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          Promotion submitted for review.
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-white">Create boost</div>
            <div className="mt-1 text-sm text-zinc-400">Admin-controlled limits apply. Track reach and ROI.</div>
            <div className="mt-2 text-xs text-zinc-500">
              Limits: {limits.minBudgetCoins}–{limits.maxBudgetCoins} coins · up to {limits.maxCountries} countries · up to {limits.maxActiveCampaigns} active/pending campaigns
            </div>
          </div>
        </div>

        {!configured && !campaignsRes.error ? (
          <div className="mt-3 text-sm text-zinc-400">
            Promotions are not configured yet. Set Supabase env vars in <span className="font-mono">.env.local</span> and run the migration.
          </div>
        ) : null}

        {configured ? (
          <form action={createPromotion} className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <div className="text-sm font-medium text-zinc-200">Boost type</div>
              <select
                name="contentType"
                defaultValue="song"
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
              >
                <option value="song">Song</option>
                <option value="video">Video</option>
                <option value="live">Live event</option>
              </select>
            </label>

            <label className="block">
              <div className="text-sm font-medium text-zinc-200">Content ID</div>
              <input
                name="contentId"
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
                placeholder="e.g. songId / videoId"
                required
              />
              <div className="mt-1 text-xs text-zinc-500">Tip: this matches the ID in your dashboard URLs.</div>
            </label>

            <label className="block md:col-span-2">
              <div className="text-sm font-medium text-zinc-200">Campaign name (optional)</div>
              <input
                name="contentLabel"
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
                placeholder="January push"
              />
            </label>

            <label className="block md:col-span-2">
              <div className="text-sm font-medium text-zinc-200">Target countries (comma separated)</div>
              <input
                name="countries"
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
                placeholder="MW, ZA, TZ"
                required
              />
            </label>

            <label className="block">
              <div className="text-sm font-medium text-zinc-200">Total budget (coins)</div>
              <input
                name="budgetCoins"
                type="number"
                min={limits.minBudgetCoins}
                max={limits.maxBudgetCoins}
                step={1}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
                placeholder="500"
                required
              />
            </label>

            <label className="block">
              <div className="text-sm font-medium text-zinc-200">Daily budget (optional)</div>
              <input
                name="dailyBudgetCoins"
                type="number"
                min={1}
                step={1}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
                placeholder="100"
              />
            </label>

            <label className="block">
              <div className="text-sm font-medium text-zinc-200">Start date/time (optional)</div>
              <input
                name="startsAt"
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
              />
            </label>

            <label className="block">
              <div className="text-sm font-medium text-zinc-200">End date/time (optional)</div>
              <input
                name="endsAt"
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
              />
            </label>

            <div className="flex items-center justify-end md:col-span-2">
              <button className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">
                New Promotion
              </button>
            </div>
          </form>
        ) : null}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
        <div className="text-sm font-medium text-white">Campaigns</div>
        {campaignsRes.campaigns.length === 0 ? (
          <div className="mt-2 text-sm text-zinc-400">No promotions yet.</div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-zinc-500">
                <tr className="border-b border-zinc-800">
                  <th className="py-2 pr-3 font-medium">Created</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Content</th>
                  <th className="py-2 pr-3 font-medium">Countries</th>
                  <th className="py-2 pr-3 font-medium">Budget</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Reach</th>
                  <th className="py-2 pr-3 font-medium">Spend</th>
                  <th className="py-2 font-medium">ROI</th>
                </tr>
              </thead>
              <tbody>
                {campaignsRes.campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-zinc-900">
                    <td className="py-2 pr-3 text-zinc-300">{formatDateTime(c.createdAt)}</td>
                    <td className="py-2 pr-3 text-zinc-300">{c.contentType}</td>
                    <td className="py-2 pr-3 text-white">
                      <div className="font-medium">{c.contentLabel ?? c.contentId}</div>
                      <div className="text-xs text-zinc-500">{c.contentId}</div>
                    </td>
                    <td className="py-2 pr-3 text-zinc-300">{c.targetCountries.join(", ")}</td>
                    <td className="py-2 pr-3 text-zinc-300">{formatInt(c.budgetCoins)} coins</td>
                    <td className="py-2 pr-3 text-zinc-300">{c.status}</td>
                    <td className="py-2 pr-3 text-zinc-300">{formatInt(c.impressions)}</td>
                    <td className="py-2 pr-3 text-zinc-300">{formatInt(c.spendCoins)} coins</td>
                    <td className="py-2 text-zinc-300">{computeRoi(c.spendCoins, c.revenueCoins)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
