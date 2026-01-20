import { NextResponse, type NextRequest } from "next/server";

import {
  getAuthCookieDomainForHost,
  getAuthCookieName,
} from "../../../lib/auth/config";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set({
    name: getAuthCookieName(),
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: getAuthCookieDomainForHost(
      request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    ),
    maxAge: 0,
  });
  response.headers.set("cache-control", "no-store");
  return response;
}
