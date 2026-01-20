import { NextResponse } from "next/server";
import { getFirebaseClientApp } from "@/lib/firebase/client";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
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

  return NextResponse.json({
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
