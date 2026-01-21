import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAutoCreateBucket } from "./config";

export async function ensureStorageBucketExists(
  supabase: SupabaseClient,
  bucket: string,
): Promise<
  | { ok: true }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.storage.getBucket(bucket);

  if (data && !error) return { ok: true };

  const autoCreate = getSupabaseAutoCreateBucket();
  if (!autoCreate) {
    return {
      ok: false,
      message:
        `Supabase Storage bucket "${bucket}" was not found. Create it in Supabase (Storage → Buckets) ` +
        `or set SUPABASE_STORAGE_BUCKET to an existing bucket.` ,
    };
  }

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: false,
  });

  // If it already exists (race / parallel request), treat it as OK.
  if (createError) {
    const msg = createError.message?.toLowerCase() ?? "";
    const alreadyExists = msg.includes("already exists") || msg.includes("duplicate") || msg.includes("exists");
    if (!alreadyExists) {
      return {
        ok: false,
        message:
          createError.message || `Failed to create Supabase Storage bucket "${bucket}".`,
      };
    }
  }

  return { ok: true };
}
