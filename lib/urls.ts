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
  const value = getOptionalEnv("ARTIST_DASHBOARD_URL");
  if (value) return normalizeUrl(value, "ARTIST_DASHBOARD_URL");

  // On Vercel, `VERCEL_URL` is available and points at the current deployment.
  // This is especially useful for Preview deployments where the hostname changes.
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return normalizeUrl(`https://${vercelUrl}`, "VERCEL_URL");

  return undefined;
}

export function getConsumerAppConnectUrl(): string | undefined {
  const value = getOptionalEnv("CONSUMER_APP_CONNECT_URL");
  return value ? normalizeUrl(value, "CONSUMER_APP_CONNECT_URL") : undefined;
}
