import { NextResponse, type NextRequest } from "next/server";

import { getFirebaseAdminAuth } from "../../../lib/firebase/admin";
import {
  getAuthCookieDomainForHost,
  getAuthCookieName,
  getAuthCookieSameSite,
  getAuthSessionMaxAgeSeconds,
} from "../../../lib/auth/config";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
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

  let idToken: string | undefined;
  try {
    const body = (await request.json()) as { idToken?: string };
    idToken = body.idToken;
  } catch {
    // ignore
  }

  if (!idToken) {
    return NextResponse.json(
      { error: "Missing idToken" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    await adminAuth.verifyIdToken(idToken, true);

    const expiresInMs = getAuthSessionMaxAgeSeconds() * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: expiresInMs,
    });

    const response = NextResponse.json(
      { ok: true },
      { status: 200, headers: { "cache-control": "no-store" } },
    );

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

    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }
}
