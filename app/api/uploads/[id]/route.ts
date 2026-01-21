import { NextResponse, type NextRequest } from "next/server";

import { requireVerifiedArtistFromRequest } from "../../../../lib/auth/request";
import { getSupabaseAdminClient } from "../../../../lib/supabase/admin";
import {
  isMissingTableError,
  missingTableFixMessage,
  type SupabaseLikeError,
} from "../../../../lib/supabase/errors";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { error: "Missing upload id" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const { data, error } = await supabase
    .from("uploads")
    .select(
      "id,artist_uid,type,title,original_path,processed_path,status,rejection_reason,error_message,duration_seconds,created_at,updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    const err = error as SupabaseLikeError | null;
    if (isMissingTableError(err, "uploads")) {
      return NextResponse.json(
        {
          error: missingTableFixMessage({
            table: "uploads",
            migrationPath: "supabase/migrations/20260120_0010_create_uploads.sql",
          }),
        },
        { status: 500, headers: { "cache-control": "no-store" } },
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to load upload" },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }

  if (!data || data.artist_uid !== verified.artist.uid) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: { "cache-control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      upload: {
        id: String(data.id),
        type: data.type,
        title: data.title,
        status: data.status,
        originalPath: data.original_path,
        processedPath: data.processed_path,
        rejectionReason: data.rejection_reason,
        errorMessage: data.error_message,
        durationSeconds: data.duration_seconds,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
