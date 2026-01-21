import "server-only";

import { getSupabaseAdminClient } from "../supabase/admin";
import { getSupabaseStorageBucket } from "./config";
import { ensureStorageBucketExists } from "./storage";
import {
  originalStoragePathForUpload,
  sanitizeFilename,
  type UploadType,
} from "./validate";

export async function uploadOriginalToStorage(input: {
  artistUid: string;
  type: UploadType;
  file: File;
  uploadId?: string;
}): Promise<
  | { ok: true; bucket: string; originalPath: string }
  | { ok: false; reason: "not_configured" | "unknown"; message: string }
> {
  function looksLikeBucketNotFound(err: unknown): boolean {
    if (!err || typeof err !== "object") return false;
    const anyErr = err as { message?: unknown; statusCode?: unknown; status?: unknown };
    const msg = String(anyErr.message ?? "").toLowerCase();
    const statusCode = Number(anyErr.statusCode ?? anyErr.status ?? NaN);

    return (
      statusCode === 404 ||
      msg.includes("not_found") ||
      msg.includes("not found") ||
      msg.includes("bucket")
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "not_configured",
      message:
        "Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const fileName = sanitizeFilename(input.file.name || "file");
  const uploadId = input.uploadId ?? crypto.randomUUID();
  const originalPath = originalStoragePathForUpload({
    type: input.type,
    artistUid: input.artistUid,
    uploadId,
    fileName,
  });

  const bucket = getSupabaseStorageBucket();

  const ensured = await ensureStorageBucketExists(supabase, bucket);
  if (!ensured.ok) {
    return { ok: false, reason: "unknown", message: ensured.message };
  }

  const bytes = Buffer.from(await input.file.arrayBuffer());

  const { error } = await supabase.storage.from(bucket).upload(originalPath, bytes, {
    contentType: input.file.type || undefined,
    upsert: false,
  });

  if (error) {
    if (looksLikeBucketNotFound(error)) {
      return {
        ok: false,
        reason: "unknown",
        message:
          `Supabase Storage bucket "${bucket}" was not found. Create it in Supabase (Storage → Buckets) ` +
          `or run: npm run create-storage-bucket.`,
      };
    }

    return {
      ok: false,
      reason: "unknown",
      message:
        error.message ||
        `Failed to upload file to Supabase Storage bucket "${bucket}".`,
    };
  }

  return { ok: true, bucket, originalPath };
}
