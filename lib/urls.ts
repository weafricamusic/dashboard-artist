import { getOptionalEnv } from "./env";

function normalizeUrl(raw: string, envName: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Invalid URL in env var ${envName}`);
  }

  // Strip trailing slash to make URL joins predictable.
  return parsed.toString().replace(/\/$/, "");
}

export function getArtistDashboardBaseUrl(): string | undefined {
  const weafricaValue = getOptionalEnv("WEAFRICA_ARTIST_DASHBOARD_URL");
  if (weafricaValue)
    return normalizeUrl(
      weafricaValue,
      "WEAFRICA_ARTIST_DASHBOARD_URL",
    );

  const value = getOptionalEnv("ARTIST_DASHBOARD_URL");
  if (value) return normalizeUrl(value, "ARTIST_DASHBOARD_URL");

  // On Vercel, `VERCEL_URL` is available and points at the current deployment.
  // This is especially useful for Preview deployments where the hostname changes.
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return normalizeUrl(`https://${vercelUrl}`, "VERCEL_URL");

  return undefined;
}

export function getConsumerAppConnectUrl(): string | undefined {
  const candidates: Array<[string, string | undefined]> = [
    ["CONSUMER_APP_CONNECT_URL", getOptionalEnv("CONSUMER_APP_CONNECT_URL")],
    // Common alias when folks assume it must be public.
    [
      "NEXT_PUBLIC_CONSUMER_APP_CONNECT_URL",
      getOptionalEnv("NEXT_PUBLIC_CONSUMER_APP_CONNECT_URL"),
    ],
    // Optional WeAfrica-prefixed alias (mirrors WEAFRICA_ARTIST_DASHBOARD_URL).
    [
      "WEAFRICA_CONSUMER_APP_CONNECT_URL",
      getOptionalEnv("WEAFRICA_CONSUMER_APP_CONNECT_URL"),
    ],
  ];

  for (const [envName, value] of candidates) {
    if (!value) continue;
    return normalizeUrl(value, envName);
  }

  return undefined;
}
