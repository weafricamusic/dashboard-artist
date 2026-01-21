import { NextResponse, type NextRequest } from "next/server";

import { getAuthCookieName } from "./lib/auth/config";

export const config = {
  matcher: ["/artist/dashboard/:path*"],
};

export function middleware(request: NextRequest) {
  const cookieName = getAuthCookieName();
  const hasSessionCookie = Boolean(request.cookies.get(cookieName)?.value);
  if (hasSessionCookie) return NextResponse.next();

  const redirectTarget = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  const destination = request.nextUrl.clone();
  destination.pathname = "/auth/connect";
  destination.searchParams.set("redirect", redirectTarget);
  destination.searchParams.set("mode", "login");

  return NextResponse.redirect(destination);
}
