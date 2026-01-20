import { getOptionalEnv, parseOptionalInt } from "../env";
import { getDomain } from "tldts";

export function getAuthCookieName(): string {
  return getOptionalEnv("AUTH_SESSION_COOKIE_NAME") ?? "weafrica_session";
}

export function getAuthCookieDomain(): string | undefined {
  return getOptionalEnv("AUTH_COOKIE_DOMAIN");
}

export function getAuthCookieDomainForHost(hostHeader: string | null): string | undefined {
  const configured = getAuthCookieDomain();
  if (configured) return configured;

  if (!hostHeader) return undefined;
  const host = hostHeader.split(":")[0]?.trim().toLowerCase();
  if (!host) return undefined;

  // Don't attempt to set a cookie domain for localhost/dev hosts.
  if (host === "localhost" || host.endsWith(".localhost")) return undefined;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return undefined; // IPv4
  if (host.includes(":")) return undefined; // IPv6-ish

  const domain = getDomain(host);
  if (!domain) return undefined;
  return `.${domain}`;
}

export function getAuthSessionMaxAgeSeconds(): number {
  return (
    parseOptionalInt(getOptionalEnv("AUTH_SESSION_MAX_AGE_SECONDS")) ??
    60 * 60 * 24 * 5
  );
}

export function getAuthCookieSameSite(): "lax" | "strict" | "none" {
  const value = (getOptionalEnv("AUTH_COOKIE_SAMESITE") ?? "lax").toLowerCase();
  if (value === "strict" || value === "none" || value === "lax") return value;
  return "lax";
}
