import { NextResponse, type NextRequest } from "next/server";

import { requireVerifiedArtistFromRequest } from "../../../../lib/auth/request";
import { createUploadRecord, type UploadType } from "../../../../lib/uploads/queue";

export const runtime = "nodejs";

function isPathForArtist(path: string, artistUid: string): boolean {
  // Must be under one of the original folders and scoped to the artist UID.
  return (
    path.startsWith(`original/songs/${artistUid}/`) ||
    path.startsWith(`original/videos/${artistUid}/`)
  );
}

export async function POST(request: NextRequest) {
  const verified = await requireVerifiedArtistFromRequest(request);
  if (!verified.ok) {
    return NextResponse.json(
      { error: verified.error },
      { status: verified.status, headers: { "cache-control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const type = (body as { type?: UploadType } | null)?.type;
  const originalPath = (body as { originalPath?: string } | null)?.originalPath;
  const title = (body as { title?: string } | null)?.title;

  if (type !== "song" && type !== "video") {
    return NextResponse.json(
      { error: "Invalid type (expected 'song' or 'video')" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  if (!originalPath || typeof originalPath !== "string") {
    return NextResponse.json(
      { error: "Missing originalPath" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  if (!isPathForArtist(originalPath, verified.artist.uid)) {
    return NextResponse.json(
      { error: "originalPath is not allowed" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const res = await createUploadRecord({
    artistUid: verified.artist.uid,
    type,
    title: typeof title === "string" && title.trim().length > 0 ? title.trim() : undefined,
    originalPath,
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: res.message },
      {
        status: res.reason === "not_configured" ? 500 : 500,
        headers: { "cache-control": "no-store" },
      },
    );
  }

  return NextResponse.json(
    { ok: true, uploadRecordId: res.id },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
