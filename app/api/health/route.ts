import { NextResponse, type NextRequest } from "next/server";
import { getFirebaseClientApp } from "@/lib/firebase/client";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import {
  getAuthCookieDomainForHost,
  getAuthCookieName,
} from "@/lib/auth/config";
import { getArtistDashboardBaseUrl, getConsumerAppConnectUrl } from "@/lib/urls";
import { getUploadIngestMaxBytes } from "@/lib/uploads/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeHostFromHeaders(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-host");
  const host = forwarded ?? request.headers.get("host");
  if (!host) return null;
  return host.split(",")[0]?.trim() ?? null;
}

function pickEnv(names: string[]): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const name of names) out[name] = process.env[name] ?? null;
  return out;
}

export async function GET(request: NextRequest) {
  const clientRequiredKeys = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ];

  const clientConfigured = clientRequiredKeys.every((k) => Boolean(process.env[k]));

  let clientInitialized = false;
  let clientError: string | null = null;
  if (clientConfigured) {
    try {
      const app = getFirebaseClientApp();
      clientInitialized = Boolean(app);
    } catch (e) {
      clientError = e instanceof Error ? e.message : "Unknown error";
    }
  }

  const adminConfigured = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      (process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY),
  );

  let adminInitialized = false;
  let adminError: string | null = null;
  try {
    const auth = getFirebaseAdminAuth();
    adminInitialized = Boolean(auth);
  } catch (e) {
    adminError = e instanceof Error ? e.message : "Unknown error";
  }

  const hostHeader = safeHostFromHeaders(request);
  let cookieDomain: string | undefined;
  try {
    cookieDomain = getAuthCookieDomainForHost(hostHeader);
  } catch {
    cookieDomain = undefined;
  }

  let artistDashboardBaseUrl: string | undefined;
  let consumerConnectUrl: string | undefined;
  try {
    artistDashboardBaseUrl = getArtistDashboardBaseUrl();
  } catch {
    artistDashboardBaseUrl = undefined;
  }

  try {
    consumerConnectUrl = getConsumerAppConnectUrl();
  } catch {
    consumerConnectUrl = undefined;
  }

  return NextResponse.json({
    deployment: {
      ...pickEnv([
        "NODE_ENV",
        "VERCEL",
        "VERCEL_ENV",
        "VERCEL_URL",
        "VERCEL_REGION",
        "VERCEL_GIT_PROVIDER",
        "VERCEL_GIT_REPO_SLUG",
        "VERCEL_GIT_REPO_OWNER",
        "VERCEL_GIT_COMMIT_SHA",
        "VERCEL_GIT_COMMIT_REF",
      ]),
    },
    request: {
      hostHeader,
      derivedCookieDomain: cookieDomain ?? null,
      authCookieName: getAuthCookieName(),
    },
    config: {
      firebase: {
        publicProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null,
        adminProjectId: process.env.FIREBASE_PROJECT_ID ?? null,
      },
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
        bucket: process.env.SUPABASE_STORAGE_BUCKET ?? "media",
      },
      urls: {
        artistDashboardBaseUrl: artistDashboardBaseUrl ?? null,
        consumerAppConnectUrlConfigured: Boolean(consumerConnectUrl),
      },
      uploads: {
        ingestMaxBytes: getUploadIngestMaxBytes(),
      },
    },
    client: {
      configured: clientConfigured,
      initialized: clientInitialized,
      error: clientError,
    },
    admin: {
      configured: adminConfigured,
      initialized: adminInitialized,
      error: adminError,
    },
    timestamp: new Date().toISOString(),
  });
}
