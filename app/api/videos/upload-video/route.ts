import { NextResponse, type NextRequest } from "next/server";

import { requireVerifiedArtistFromRequest } from "../../../../lib/auth/request";
import { createVideo } from "../../../../lib/content/videos";
import { createUploadRecord } from "../../../../lib/uploads/queue";
import { uploadOriginalToStorage } from "../../../../lib/uploads/server";

export const runtime = "nodejs";

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function isMp4OrMovUpload(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const byType = type === "video/mp4" || type === "video/quicktime";
  const byExt = name.endsWith(".mp4") || name.endsWith(".mov");
  return byType || (byExt && (type === "" || type === "application/octet-stream"));
}

function looksLikeBodyTooLarge(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  return (
    msg.includes("too large") ||
    msg.includes("body size") ||
    msg.includes("body limit") ||
    msg.includes("request entity")
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

  let form: FormData;
  try {
    form = await request.formData();
  } catch (err) {
    const message = "Could not read uploaded form data. The file may be too large for the server.";
    return NextResponse.json(
      { error: message },
      { status: looksLikeBodyTooLarge(err) ? 413 : 400, headers: { "cache-control": "no-store" } },
    );
  }

  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const videoFile = form.get("videoFile");

  if (!title) {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  if (!(videoFile instanceof File)) {
    return NextResponse.json(
      { error: "Please select an MP4 video to upload." },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  if (!isMp4OrMovUpload(videoFile)) {
    return NextResponse.json(
      { error: "Only MP4 or MOV videos are supported." },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  if (videoFile.size > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { error: "Video must be under 50 MB." },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const uploadRes = await uploadOriginalToStorage({
    artistUid: verified.artist.uid,
    type: "video",
    file: videoFile,
  });

  if (!uploadRes.ok) {
    return NextResponse.json(
      { error: uploadRes.message },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }

  const uploadRecord = await createUploadRecord({
    artistUid: verified.artist.uid,
    type: "video",
    title,
    originalPath: uploadRes.originalPath,
  });

  if (!uploadRecord.ok) {
    return NextResponse.json(
      { error: uploadRecord.message },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }

  const videoId = await createVideo(verified.artist.uid, {
    title,
    description: description || undefined,
    status: "pending",
  });

  return NextResponse.json(
    { ok: true, videoId, uploadRecordId: uploadRecord.id },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
