"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "./Card";
import { IconArrowRight } from "./IconSet";

export function EarningsCard({
  totalCoins,
  pendingCoins,
  mwkRate,
  currency = "MWK",
}: {
  totalCoins: number | null;
  pendingCoins: number | null;
  mwkRate: number | null;
  currency?: string;
}) {
  const coinToMWK = (coins: number | null) => {
    if (coins === null || mwkRate === null) return "—";
    return (coins * mwkRate).toLocaleString("en-US", {
      maximumFractionDigits: 0,
    });
  };

  return (
    <Card className="border-amber-900/30 bg-gradient-to-br from-amber-950/30 to-zinc-950/40">
      <CardHeader>
        <CardTitle>Earnings Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="rounded-lg bg-zinc-900/50 p-3">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Total Balance
            </p>
            <p className="mt-2 text-2xl font-bold text-amber-300">
              {totalCoins?.toLocaleString() ?? "—"} coins
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              ≈ {coinToMWK(totalCoins)} {currency}
            </p>
          </div>

          {pendingCoins !== null && pendingCoins > 0 && (
            <div className="rounded-lg bg-zinc-800/30 p-3 border border-zinc-700/50">
              <p className="text-xs font-medium text-zinc-400">Pending</p>
              <p className="mt-1 text-lg font-semibold text-zinc-300">
                {pendingCoins.toLocaleString()} coins
              </p>
            </div>
          )}

          <Link
            href="/artist/dashboard/earnings"
            className="flex items-center justify-between rounded-lg border border-amber-800/30 bg-amber-900/10 p-3 text-sm font-medium text-amber-300 transition hover:border-amber-700/50 hover:bg-amber-900/20"
          >
            <span>Convert to cash</span>
            <IconArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
