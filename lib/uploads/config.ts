import "server-only";

import { parseOptionalInt } from "../env";

export function getSupabaseStorageBucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || "media";
}

export function getSupabaseAutoCreateBucket(): boolean {
  const raw = process.env.SUPABASE_AUTO_CREATE_BUCKET;
  if (raw && raw.length > 0) {
    return raw.toLowerCase() === "true";
  }

  // Default-on for local dev convenience; default-off in production.
  return process.env.NODE_ENV !== "production";
}

export function getUploadIngestMaxBytes(): number {
  // One-call uploads pass through the Next.js server and should be capped.
  // Signed uploads (PUT to Storage) are recommended for large media.
  const configured = parseOptionalInt(process.env.UPLOAD_INGEST_MAX_BYTES);
  if (typeof configured === "number") return configured;

  // Vercel has a platform request body limit for Serverless Functions. Even if Next.js accepts
  // larger bodies, uploads may be rejected by the platform before reaching this handler.
  // Keep a conservative default to steer production deployments towards signed uploads.
  if (process.env.VERCEL) return 4 * 1024 * 1024;

  return 50 * 1024 * 1024;
}
