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
  return value ? normalizeUrl(value, "ARTIST_DASHBOARD_URL") : undefined;
}

export function getConsumerAppConnectUrl(): string | undefined {
  const value = getOptionalEnv("CONSUMER_APP_CONNECT_URL");
  return value ? normalizeUrl(value, "CONSUMER_APP_CONNECT_URL") : undefined;
}
