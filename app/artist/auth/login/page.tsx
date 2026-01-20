import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LoginClient } from "./LoginClient";
import { getConsumerAppConnectUrl } from "../../../../lib/urls";

type SearchParams = Record<string, string | string[] | undefined>;

function getSafeRedirectParam(searchParams: SearchParams | undefined): string {
  const value = searchParams?.redirect;
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "/artist/dashboard/overview";
  if (!raw.startsWith("/")) return "/artist/dashboard/overview";
  if (raw.startsWith("//")) return "/artist/dashboard/overview";
  return raw;
}

export default function ArtistLoginPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  // The canonical flow is: login happens in the consumer (Flutter) app.
  // If configured, send users there immediately.
  if (getConsumerAppConnectUrl()) {
    const redirectTo = getSafeRedirectParam(searchParams);
    redirect(`/auth/connect?mode=login&redirect=${encodeURIComponent(redirectTo)}`);
  }

  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-sm text-zinc-600">Loading…</div>
          </div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
