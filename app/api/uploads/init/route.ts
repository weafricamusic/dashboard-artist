import { NextResponse, type NextRequest } from "next/server";

import { requireVerifiedArtistFromRequest } from "../../../../lib/auth/request";
import { getSupabaseAdminClient } from "../../../../lib/supabase/admin";
import { getSupabaseStorageBucket } from "../../../../lib/uploads/config";
import { ensureStorageBucketExists } from "../../../../lib/uploads/storage";
import {
  getExtFromFilename,
  isAllowedUpload,
  originalStoragePathForUpload,
  sanitizeFilename,
  type UploadType,
} from "../../../../lib/uploads/validate";

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const type = (body as { type?: UploadType } | null)?.type;
  const fileNameRaw = (body as { fileName?: string } | null)?.fileName;
  const contentType = (body as { contentType?: string } | null)?.contentType ?? null;

  if (type !== "song" && type !== "video") {
    return NextResponse.json(
      { error: "Invalid type (expected 'song' or 'video')" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  if (!fileNameRaw || typeof fileNameRaw !== "string") {
    return NextResponse.json(
      { error: "Missing fileName" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const fileName = sanitizeFilename(fileNameRaw);
  const ext = getExtFromFilename(fileName) ?? "";

  if (!ext || !isAllowedUpload(type, ext, contentType)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${fileName}` },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const id = crypto.randomUUID();
  const storagePath = originalStoragePathForUpload({
    type,
    artistUid: verified.artist.uid,
    uploadId: id,
    fileName,
  });

  const bucket = getSupabaseStorageBucket();

  const ensured = await ensureStorageBucketExists(supabase, bucket);
  if (!ensured.ok) {
    return NextResponse.json(
      { error: ensured.message },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create signed upload URL" },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      uploadId: id,
      bucket,
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
