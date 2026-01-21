import { NextResponse, type NextRequest } from "next/server";

import { requireVerifiedArtistFromRequest } from "../../../../lib/auth/request";
import { getSupabaseAdminClient } from "../../../../lib/supabase/admin";
import { getSupabaseStorageBucket, getUploadIngestMaxBytes } from "../../../../lib/uploads/config";
import {
  getExtFromFilename,
  isAllowedUpload,
  originalStoragePathForUpload,
  sanitizeFilename,
  type UploadType,
} from "../../../../lib/uploads/validate";
import { createUploadRecord } from "../../../../lib/uploads/queue";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const verified = await requireVerifiedArtistFromRequest(request);
  if (!verified.ok) {
    return NextResponse.json(
      { error: verified.error },
      { status: verified.status, headers: { "cache-control": "no-store" } },
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }

  const form = await request.formData();

  const typeRaw = form.get("type");
  const type: UploadType | null =
    typeRaw === "song" || typeRaw === "video" ? (typeRaw as UploadType) : null;

  const titleRaw = form.get("title");
  const title = typeof titleRaw === "string" && titleRaw.trim().length > 0 ? titleRaw.trim() : undefined;

  const file = form.get("file");
  if (!type) {
    return NextResponse.json(
      { error: "Invalid type (expected 'song' or 'video')" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing file (expected multipart field 'file')" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const maxBytes = getUploadIngestMaxBytes();
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large (max ${maxBytes} bytes)` },
      { status: 413, headers: { "cache-control": "no-store" } },
    );
  }

  const fileName = sanitizeFilename(file.name || "file");
  const ext = getExtFromFilename(fileName) ?? "";
  const contentType = file.type || null;

  if (!ext || !isAllowedUpload(type, ext, contentType)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${fileName}` },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const uploadId = crypto.randomUUID();
  const storagePath = originalStoragePathForUpload({
    type,
    artistUid: verified.artist.uid,
    uploadId,
    fileName,
  });

  const bucket = getSupabaseStorageBucket();

  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, bytes, {
    contentType: contentType ?? undefined,
    upsert: false,
  });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message || "Failed to upload file" },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }

  const record = await createUploadRecord({
    artistUid: verified.artist.uid,
    type,
    title,
    originalPath: storagePath,
  });

  if (!record.ok) {
    return NextResponse.json(
      { error: record.message },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      bucket,
      originalPath: storagePath,
      uploadRecordId: record.id,
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
