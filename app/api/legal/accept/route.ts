import { NextResponse, type NextRequest } from "next/server";

import { getArtistSession } from "../../../../lib/auth/artist";
import { recordLegalAcceptance } from "../../../../lib/legal/acceptance";

export const runtime = "nodejs";

function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip");
}

export async function POST(request: NextRequest) {
  const session = await getArtistSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "cache-control": "no-store" } });
  }

  const body = await request.json().catch(() => ({} as unknown));
  const accepted = Boolean((body as { accepted?: unknown }).accepted);
  if (!accepted) {
    return NextResponse.json(
      { error: "You must accept the legal documents to continue." },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const result = await recordLegalAcceptance({
    artistUid: session.user.uid,
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500, headers: { "cache-control": "no-store" } });
  }

  return NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
}
