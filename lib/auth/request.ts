import "server-only";

import type { NextRequest } from "next/server";

import { getFirebaseAdminAuth } from "../firebase/admin";
import { getAuthCookieName } from "./config";
import type { ArtistStatus } from "./artist";

export type VerifiedArtist = {
  uid: string;
  role?: string;
  status: ArtistStatus;
  claims: Record<string, unknown>;
};

function parseBearerToken(header: string | null): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  return token.trim() || null;
}

function coerceArtistStatus(raw: unknown): ArtistStatus {
  return raw === "pending" || raw === "approved" || raw === "suspended" || raw === "premium"
    ? raw
    : "approved";
}

export async function requireVerifiedArtistFromRequest(
  request: NextRequest,
): Promise<
  | { ok: true; artist: VerifiedArtist }
  | {
      ok: false;
      status: 401 | 403 | 500;
      error: string;
    }
> {
  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) {
    return {
      ok: false,
      status: 500,
      error:
        "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (or FIREBASE_SERVICE_ACCOUNT_JSON).",
    };
  }

  const bearer = parseBearerToken(request.headers.get("authorization"));
  const sessionCookie = request.cookies.get(getAuthCookieName())?.value ?? null;

  if (!bearer && !sessionCookie) {
    return {
      ok: false,
      status: 401,
      error: "Missing auth (set Authorization: Bearer <FirebaseIDToken> or provide a session cookie).",
    };
  }

  try {
    const decoded = bearer
      ? await adminAuth.verifyIdToken(bearer, true)
      : await adminAuth.verifySessionCookie(sessionCookie!, true);

    const role = (decoded as unknown as { role?: string }).role;
    if (role && role !== "artist") {
      return { ok: false, status: 403, error: "Forbidden" };
    }

    const statusRaw =
      (decoded as unknown as { artistStatus?: string }).artistStatus ??
      (decoded as unknown as { status?: string }).status;

    return {
      ok: true,
      artist: {
        uid: decoded.uid,
        role,
        status: coerceArtistStatus(statusRaw),
        claims: decoded as unknown as Record<string, unknown>,
      },
    };
  } catch {
    return { ok: false, status: 401, error: "Invalid or expired token" };
  }
}
