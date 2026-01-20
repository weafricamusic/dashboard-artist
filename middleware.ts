import { NextResponse, type NextRequest } from "next/server";

import { getAuthCookieName } from "./lib/auth/config";
import { getOptionalEnv } from "./lib/env";

export const config = {
  matcher: ["/artist/dashboard/:path*"],
};

export function middleware(request: NextRequest) {
  const cookieName = getAuthCookieName();
  const hasSessionCookie = Boolean(request.cookies.get(cookieName)?.value);
  if (hasSessionCookie) return NextResponse.next();

  const redirectTarget = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  // If the consumer app connect URL is configured, prefer the SSO bridge.
  // This avoids re-auth when the user is already signed in in the consumer app.
  const hasConsumerConnect = Boolean(getOptionalEnv("CONSUMER_APP_CONNECT_URL"));

  const destination = request.nextUrl.clone();
  destination.pathname = hasConsumerConnect ? "/auth/connect" : "/artist/auth/login";
  destination.searchParams.set("redirect", redirectTarget);
  if (hasConsumerConnect) destination.searchParams.set("mode", "login");

  return NextResponse.redirect(destination);
}
