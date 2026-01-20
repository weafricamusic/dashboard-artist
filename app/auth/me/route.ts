import { NextResponse } from "next/server";

import { getUserFromSessionCookie } from "../../../lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await getUserFromSessionCookie();
  return NextResponse.json({ user }, { headers: { "cache-control": "no-store" } });
}
