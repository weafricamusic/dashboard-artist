import "server-only";

import { getSupabaseAdminClient } from "../supabase/admin";
import {
  isMissingTableError,
  missingTableFixMessage,
  type SupabaseLikeError,
} from "../supabase/errors";

export type UploadType = "song" | "video";
export type UploadStatus = "processing" | "published" | "rejected";

export type UploadRecord = {
  id: string;
  artistUid: string;
  type: UploadType;
  title: string | null;
  originalPath: string;
  processedPath: string | null;
  status: UploadStatus;
  rejectionReason: string | null;
  errorMessage: string | null;
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
};

export async function createUploadRecord(input: {
  id?: string;
  artistUid: string;
  type: UploadType;
  title?: string;
  originalPath: string;
}): Promise<
  | { ok: true; id: string }
  | { ok: false; reason: "not_configured" | "unknown"; message: string }
> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const res = await supabase
    .from("uploads")
    .insert({
      id: input.id ?? undefined,
      artist_uid: input.artistUid,
      type: input.type,
      title: input.title ?? null,
      original_path: input.originalPath,
      status: "processing",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .limit(1)
    .maybeSingle();

  if (res.error || !res.data) {
    const err = res.error as SupabaseLikeError | null;
    if (isMissingTableError(err, "uploads")) {
      return {
        ok: false,
        reason: "unknown",
        message: missingTableFixMessage({
          table: "uploads",
          migrationPath: "supabase/migrations/20260120_0010_create_uploads.sql",
        }),
      };
    }
    return {
      ok: false,
      reason: "unknown",
      message: res.error?.message ?? "Failed to create upload record.",
    };
  }

  return { ok: true, id: String(res.data.id) };
}

export async function updateUploadRecord(
  uploadId: string,
  patch: Partial<{
    processedPath: string | null;
    status: UploadStatus;
    rejectionReason: string | null;
    errorMessage: string | null;
    durationSeconds: number | null;
  }>,
): Promise<
  | { ok: true }
  | { ok: false; reason: "not_configured" | "unknown"; message: string }
> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const res = await supabase
    .from("uploads")
    .update({
      processed_path: patch.processedPath ?? undefined,
      status: patch.status ?? undefined,
      rejection_reason: patch.rejectionReason ?? undefined,
      error_message: patch.errorMessage ?? undefined,
      duration_seconds: patch.durationSeconds ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", uploadId);

  if (res.error) {
    const err = res.error as SupabaseLikeError | null;
    if (isMissingTableError(err, "uploads")) {
      return {
        ok: false,
        reason: "unknown",
        message: missingTableFixMessage({
          table: "uploads",
          migrationPath: "supabase/migrations/20260120_0010_create_uploads.sql",
        }),
      };
    }
    return {
      ok: false,
      reason: "unknown",
      message: res.error.message ?? "Failed to update upload record.",
    };
  }

  return { ok: true };
}
