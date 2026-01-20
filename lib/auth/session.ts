import "server-only";

import { cookies } from "next/headers";
import { getFirebaseAdminAuth } from "../firebase/admin";
import { getAuthCookieName } from "./config";

export type SessionUser = {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
};

export type SessionClaims = Record<string, unknown>;

export type DecodedSession = {
  user: SessionUser;
  claims: SessionClaims;
};

export async function getDecodedSessionFromCookie(): Promise<DecodedSession | null> {
  const cookieName = getAuthCookieName();
  const cookieValue = (await cookies()).get(cookieName)?.value;
  if (!cookieValue) return null;

  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(cookieValue, true);
    return {
      user: {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      },
      claims: decoded as unknown as SessionClaims,
    };
  } catch {
    return null;
  }
}

export async function getUserFromSessionCookie(): Promise<SessionUser | null> {
  const decoded = await getDecodedSessionFromCookie();
  return decoded?.user ?? null;
}
