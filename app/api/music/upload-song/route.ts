import { NextResponse, type NextRequest } from "next/server";

import { requireVerifiedArtistFromRequest } from "../../../../lib/auth/request";
import { createSong } from "../../../../lib/content/songs";
import { createUploadRecord, updateUploadRecord } from "../../../../lib/uploads/queue";
import { uploadOriginalToStorage } from "../../../../lib/uploads/server";
import { originalStoragePathForUpload, sanitizeFilename } from "../../../../lib/uploads/validate";

export const runtime = "nodejs";

function isMp3Upload(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const byType = type === "audio/mpeg" || type === "audio/mp3";
  const byExt = name.endsWith(".mp3");
  return byType || (byExt && (type === "" || type === "application/octet-stream"));
}

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

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
  let uploadRecordId: string | null = null;

  try {
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
      const message =
        "Could not read uploaded form data. The file may be too large for the server.";
      console.error("upload-song: failed to parse formData:", err);
      return NextResponse.json(
        { error: message },
        { status: looksLikeBodyTooLarge(err) ? 413 : 400, headers: { "cache-control": "no-store" } },
      );
    }

    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const genre = String(form.get("genre") ?? "").trim();
    const audioFile = form.get("audioFile");

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400, headers: { "cache-control": "no-store" } },
      );
    }

    if (!(audioFile instanceof File)) {
      return NextResponse.json(
        { error: "Please select an MP3 file to upload." },
        { status: 400, headers: { "cache-control": "no-store" } },
      );
    }

    if (!isMp3Upload(audioFile)) {
      return NextResponse.json(
        { error: "Only MP3 files are supported." },
        { status: 400, headers: { "cache-control": "no-store" } },
      );
    }

    if (audioFile.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "Song must be under 20 MB." },
        { status: 400, headers: { "cache-control": "no-store" } },
      );
    }

    const uploadId = crypto.randomUUID();
    const fileName = sanitizeFilename(audioFile.name || "file");
    const originalPath = originalStoragePathForUpload({
      type: "song",
      artistUid: verified.artist.uid,
      uploadId,
      fileName,
    });

    const uploadRecord = await createUploadRecord({
      id: uploadId,
      artistUid: verified.artist.uid,
      type: "song",
      title,
      originalPath,
    });

    if (!uploadRecord.ok) {
      return NextResponse.json(
        { error: uploadRecord.message },
        { status: 500, headers: { "cache-control": "no-store" } },
      );
    }

    uploadRecordId = uploadRecord.id;

    const uploadRes = await uploadOriginalToStorage({
      artistUid: verified.artist.uid,
      type: "song",
      file: audioFile,
      uploadId,
    });

    if (!uploadRes.ok) {
      try {
        await updateUploadRecord(uploadRecordId, {
          status: "rejected",
          errorMessage: uploadRes.message,
        });
      } catch (updateErr) {
        console.error("upload-song: failed to mark upload as rejected after storage failure:", updateErr);
      }

      return NextResponse.json(
        { error: uploadRes.message },
        { status: 500, headers: { "cache-control": "no-store" } },
      );
    }

    const songId = await createSong(verified.artist.uid, {
      title,
      description: description || undefined,
      genre: genre || undefined,
      status: "pending",
    });

    return NextResponse.json(
      { ok: true, songId, uploadRecordId },
      { status: 200, headers: { "cache-control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("upload-song: unhandled error:", err);

    // Best-effort: mark any created upload record as rejected.
    if (uploadRecordId) {
      try {
        await updateUploadRecord(uploadRecordId, {
          status: "rejected",
          errorMessage: message,
        });
      } catch (updateErr) {
        console.error("upload-song: failed to mark upload as rejected:", updateErr);
      }
    }

    return NextResponse.json(
      { error: message },
      { status: looksLikeBodyTooLarge(err) ? 413 : 500, headers: { "cache-control": "no-store" } },
    );
  }
}
