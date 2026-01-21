import { redirect } from "next/navigation";

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
  // Login should only happen in the consumer app.
  const redirectTo = getSafeRedirectParam(searchParams);
  redirect(`/auth/connect?mode=login&redirect=${encodeURIComponent(redirectTo)}`);
}
