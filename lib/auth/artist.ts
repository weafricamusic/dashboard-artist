import "server-only";

import { redirect } from "next/navigation";
import {
  getDecodedSessionFromCookie,
  type SessionClaims,
  type SessionUser,
} from "./session";

export type ArtistStatus = "pending" | "approved" | "suspended" | "premium";

export type ArtistSession = {
  user: SessionUser;
  role?: string;
  status: ArtistStatus;
  claims: SessionClaims;
};

export async function getArtistSession(): Promise<ArtistSession | null> {
  const decoded = await getDecodedSessionFromCookie();
  if (!decoded) return null;

  const role = decoded.claims.role as string | undefined;
  const statusRaw =
    (decoded.claims.artistStatus as string | undefined) ??
    (decoded.claims.status as string | undefined);

  const status: ArtistStatus =
    statusRaw === "pending" ||
    statusRaw === "approved" ||
    statusRaw === "suspended" ||
    statusRaw === "premium"
      ? statusRaw
      : "approved";

  return {
    user: decoded.user,
    role,
    status,
    claims: decoded.claims,
  };
}

export async function requireArtistSession(): Promise<ArtistSession> {
  const session = await getArtistSession();
  if (!session) redirect("/artist/auth/login");

  // If role claims are configured, enforce them. If not, allow access but rely on
  // status banners/UI + backend authorization for sensitive actions.
  if (session.role && session.role !== "artist") redirect("/artist/auth/login");

  return session;
}
