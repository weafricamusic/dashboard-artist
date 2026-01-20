import { NextResponse, type NextRequest } from "next/server";

import { getFirebaseAdminAuth } from "../../../lib/firebase/admin";
import {
  getAuthCookieDomainForHost,
  getAuthCookieName,
  getAuthCookieSameSite,
  getAuthSessionMaxAgeSeconds,
} from "../../../lib/auth/config";
import { safeRedirectPath } from "../../../lib/auth/redirect";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const redirect = safeRedirectPath(url.searchParams.get("redirect"));

  if (!token) {
    return NextResponse.json(
      { error: "Missing token" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) {
    return NextResponse.json(
      {
        error:
          "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (or FIREBASE_SERVICE_ACCOUNT_JSON). See .env.local.example.",
      },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    // Verify the Firebase ID token first.
    await adminAuth.verifyIdToken(token, true);

    // Mint a Firebase session cookie and store it in the shared cookie.
    const expiresInMs = getAuthSessionMaxAgeSeconds() * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn: expiresInMs,
    });

    const response = NextResponse.redirect(new URL(redirect, request.url));

    response.cookies.set({
      name: getAuthCookieName(),
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: getAuthCookieSameSite(),
      path: "/",
      domain: getAuthCookieDomainForHost(
        request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
      ),
      maxAge: getAuthSessionMaxAgeSeconds(),
    });

    response.headers.set("cache-control", "no-store");
    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }
}
