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

function wantsJson(request: NextRequest): boolean {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("application/json");
}

function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token =
    url.searchParams.get("token") ??
    url.searchParams.get("idToken") ??
    url.searchParams.get("id_token") ??
    url.searchParams.get("access_token") ??
    url.searchParams.get("accessToken") ??
    getBearerToken(request);
  let redirect = safeRedirectPath(url.searchParams.get("redirect"));

  // Ensure artists land on the dashboard after logging in via the consumer app.
  // Keep explicit dashboard deep-links working, but block non-dashboard redirects.
  if (!redirect.startsWith("/artist/dashboard")) {
    redirect = "/artist/dashboard/overview";
  } else if (redirect === "/artist/dashboard") {
    redirect = "/artist/dashboard/overview";
  }

  if (!token) {
    const queryKeys = Array.from(url.searchParams.keys());
    const hasAuthHeader = Boolean(request.headers.get("authorization"));
    console.info("/auth/consume missing token", {
      path: url.pathname,
      queryKeys,
      hasAuthHeader,
    });

    const existingSession = request.cookies.get(getAuthCookieName())?.value;
    if (existingSession) {
      const response = NextResponse.redirect(new URL(redirect, request.url));
      response.headers.set("cache-control", "no-store");
      return response;
    }

    if (wantsJson(request)) {
      return NextResponse.json(
        {
          error: "Missing token",
          receivedQueryKeys: queryKeys,
          hint: "Consumer app must open /auth/consume with token=<FirebaseIDToken> as a query param (not a #fragment).",
        },
        { status: 400, headers: { "cache-control": "no-store" } },
      );
    }

    const connectUrl = new URL("/auth/connect", request.url);
    connectUrl.searchParams.set("redirect", redirect);
    const response = NextResponse.redirect(connectUrl);
    response.headers.set("cache-control", "no-store");
    return response;
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
