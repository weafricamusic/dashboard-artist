import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireArtistSession } from "../../../../lib/auth/artist";
import { getEarningsSummaryForArtist } from "../../../../lib/analytics/insights";
import {
  createPayoutRequestForArtist,
  listPayoutRequestsForArtist,
  type PayoutMethod,
} from "../../../../lib/payouts/requests";
import { BarChart } from "../_components/charts/BarChart";
import { LineChart } from "../_components/charts/LineChart";

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

function StatCard({
  title,
  primary,
  secondary,
}: {
  title: string;
  primary: string;
  secondary?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
      <div className="text-sm text-zinc-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-white">{primary}</div>
      {secondary ? <div className="mt-1 text-xs text-zinc-500">{secondary}</div> : null}
    </div>
  );
}

export default async function ArtistEarningsPage() {
  const session = await requireArtistSession();

  async function requestPayout(formData: FormData) {
    "use server";

    const session = await requireArtistSession();

    const method = String(formData.get("method") ?? "mobile_money") as PayoutMethod;
    const amountCoins = Number(String(formData.get("amountCoins") ?? "0").trim());

    const phone = String(formData.get("phone") ?? "").trim();
    const bankName = String(formData.get("bankName") ?? "").trim();
    const accountNumber = String(formData.get("accountNumber") ?? "").trim();
    const accountName = String(formData.get("accountName") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    const res = await createPayoutRequestForArtist(session.user.uid, {
      method,
      amountCoins,
      phone: phone || undefined,
      bankName: bankName || undefined,
      accountNumber: accountNumber || undefined,
      accountName: accountName || undefined,
      notes: notes || undefined,
    });

    if (!res.ok) {
      const msg = encodeURIComponent(res.message);
      redirect(`/artist/dashboard/earnings?payout_error=${msg}`);
    }

    revalidatePath("/artist/dashboard/earnings");
    redirect("/artist/dashboard/earnings?payout_requested=1");
  }

  const [earnings, payoutHistory] = await Promise.all([
    getEarningsSummaryForArtist(session.user.uid),
    listPayoutRequestsForArtist(session.user.uid, 20),
  ]);

  const points = earnings.dailyCoinsLast30d.map((p) => ({
    label: p.day.slice(5),
    value: p.value,
  }));

  const coinToMwkConfigured = Boolean(earnings.coinToMwkRate);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Earnings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Coins earned and a transparent conversion to MWK (Malawi Kwacha).
        </p>
      </div>

      {coinToMwkConfigured ? null : (
        <div className="rounded-2xl border border-amber-900/40 bg-amber-950/40 p-4 text-sm text-amber-200">
          MWK conversion is not configured. Set <span className="font-mono">COIN_TO_MWK_RATE</span> in
          your <span className="font-mono">.env.local</span> to show MWK values.
        </div>
      )}

      {/** Payout request banner (via redirect search params) */}
      {(
        // Next server components don't receive URLSearchParams automatically unless declared,
        // but Next still injects them into the route. We keep this section future-proof by
        // showing backend/config errors via history loader too.
        payoutHistory.error ? (
          <div className="rounded-2xl border border-amber-900/40 bg-amber-950/40 p-4 text-sm text-amber-200">
            {payoutHistory.error}
          </div>
        ) : null
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today"
          primary={`${formatInt(earnings.coins.today)} coins`}
          secondary={formatMoney(earnings.mwk.today, earnings.currency)}
        />
        <StatCard
          title="Last 7 days"
          primary={`${formatInt(earnings.coins.week)} coins`}
          secondary={formatMoney(earnings.mwk.week, earnings.currency)}
        />
        <StatCard
          title="Last 30 days"
          primary={`${formatInt(earnings.coins.month)} coins`}
          secondary={formatMoney(earnings.mwk.month, earnings.currency)}
        />
        <StatCard
          title="All-time (best-effort)"
          primary={`${formatInt(earnings.coins.allTime)} coins`}
          secondary={formatMoney(earnings.mwk.allTime, earnings.currency)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-white">Daily coins trend</div>
              <div className="mt-1 text-xs text-zinc-500">Last 30 days</div>
            </div>
            <div className="text-sm text-zinc-300">{formatInt(earnings.coins.month)} coins</div>
          </div>
          <div className="mt-3">
            <LineChart points={points} />
          </div>
          {earnings.truncated ? (
            <div className="mt-2 text-xs text-amber-300">
              Note: results truncated for performance.
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
          <div className="text-sm font-medium text-white">Earnings breakdown</div>
          <div className="mt-1 text-xs text-zinc-500">By transaction type (last 30 days)</div>
          {earnings.byTypeCoinsLast30d.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-400">No earnings data yet.</div>
          ) : (
            <>
              <div className="mt-3">
                <BarChart
                  data={earnings.byTypeCoinsLast30d.map((t) => ({
                    label: t.type,
                    value: t.coins,
                  }))}
                />
              </div>
              <div className="mt-3 space-y-1 text-sm">
                {earnings.byTypeCoinsLast30d.map((t) => (
                  <div key={t.type} className="flex items-center justify-between gap-3">
                    <div className="truncate text-zinc-300">{t.type}</div>
                    <div className="text-white">{formatInt(t.coins)} coins</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
        <div>
          <div className="text-sm font-medium text-white">Request payout</div>
          <div className="mt-1 text-sm text-zinc-400">
            Mobile money / bank. Requests go to admin for approval.
          </div>

          {payoutHistory.source === "none" && !payoutHistory.error ? (
            <div className="mt-3 text-sm text-zinc-400">
              Payout requests are not configured yet. Set Supabase env vars in <span className="font-mono">.env.local</span>
              to enable this.
            </div>
          ) : null}

          {payoutHistory.source === "supabase" ? (
            <form action={requestPayout} className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <div className="text-sm font-medium text-zinc-200">Method</div>
                <select
                  name="method"
                  defaultValue="mobile_money"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
                >
                  <option value="mobile_money">Mobile money</option>
                  <option value="bank">Bank transfer</option>
                </select>
              </label>

              <label className="block">
                <div className="text-sm font-medium text-zinc-200">Amount (coins)</div>
                <input
                  name="amountCoins"
                  type="number"
                  min={1}
                  step={1}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
                  placeholder="100"
                  required
                />
                <div className="mt-1 text-xs text-zinc-500">
                  {coinToMwkConfigured ? "MWK value is computed using COIN_TO_MWK_RATE." : "Set COIN_TO_MWK_RATE to show MWK conversions."}
                </div>
              </label>

              <label className="block md:col-span-2">
                <div className="text-sm font-medium text-zinc-200">Mobile money phone (if mobile money)</div>
                <input
                  name="phone"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
                  placeholder="e.g. +265..."
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-zinc-200">Bank name (if bank)</div>
                <input
                  name="bankName"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
                  placeholder="e.g. National Bank"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-zinc-200">Account number (if bank)</div>
                <input
                  name="accountNumber"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
                  placeholder="..."
                />
              </label>

              <label className="block md:col-span-2">
                <div className="text-sm font-medium text-zinc-200">Account name (if bank)</div>
                <input
                  name="accountName"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
                  placeholder="Account holder"
                />
              </label>

              <label className="block md:col-span-2">
                <div className="text-sm font-medium text-zinc-200">Notes (optional)</div>
                <textarea
                  name="notes"
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
                  placeholder="Anything the admin should know"
                />
              </label>

              <div className="md:col-span-2 flex items-center justify-end">
                <button className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">
                  Submit request
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
        <div className="text-sm font-medium text-white">Payout history</div>
        {payoutHistory.requests.length === 0 ? (
          <div className="mt-2 text-sm text-zinc-400">No payouts yet.</div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-zinc-500">
                <tr className="border-b border-zinc-800">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Method</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 text-right font-medium">Coins</th>
                  <th className="py-2 text-right font-medium">MWK</th>
                </tr>
              </thead>
              <tbody>
                {payoutHistory.requests.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-900">
                    <td className="py-2 pr-3 text-zinc-300">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-3 text-zinc-300">{r.method}</td>
                    <td className="py-2 pr-3 text-zinc-300">{r.status}</td>
                    <td className="py-2 pr-3 text-right text-white">{formatInt(r.amountCoins)}</td>
                    <td className="py-2 text-right text-white">
                      {formatMoney(r.amountMwk, earnings.currency)}
                    </td>
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
