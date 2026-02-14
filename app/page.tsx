import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAuthCookieName } from "@/lib/auth/config";
import { getConsumerAppConnectUrl } from "@/lib/urls";

type SearchParams = Record<string, string | string[] | undefined>;

function safeRedirectParam(searchParams?: SearchParams): string {
  const value = searchParams?.redirect;
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "/artist/dashboard/overview";
  if (!raw.startsWith("/")) return "/artist/dashboard/overview";
  if (raw.startsWith("//")) return "/artist/dashboard/overview";
  return raw;
}

export default async function Home({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const cookieName = getAuthCookieName();
  const cookieStore = await cookies();
  const hasSessionCookie = Boolean(cookieStore.get(cookieName)?.value);
  if (hasSessionCookie) redirect("/artist/dashboard");

  let consumerConnectConfigured = false;
  try {
    consumerConnectConfigured = Boolean(getConsumerAppConnectUrl());
  } catch {
    consumerConnectConfigured = false;
  }

  const redirectTo = safeRedirectParam(searchParams);
  const connectHref = `/auth/connect?mode=login&redirect=${encodeURIComponent(
    redirectTo,
  )}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-14">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">WeAfrica Artist Dashboard</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Sign in happens in the WeAfrica Music mobile app. Once you’re signed in, you’ll be
          redirected back here automatically.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {consumerConnectConfigured ? (
            <Link
              href={connectHref}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Continue in mobile app
            </Link>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
              Mobile app connect is not configured (missing or invalid
              <code className="mx-1">CONSUMER_APP_CONNECT_URL</code>).
            </div>
          )}
          <Link
            href="/auth/me"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Check session
          </Link>
        </div>
      </div>
    </main>
  );
}
