import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdminClient } from "../../../lib/supabase/admin";
import { requireVerifiedArtistFromRequest } from "../../../lib/auth/request";

export async function GET(request: NextRequest) {
  try {
    const verified = await requireVerifiedArtistFromRequest(request);
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: verified.status });
    }

    const userId = verified.artist.uid;
    const role = "artist";

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("live_sessions")
      .select("public_code,title,starts_at,status")
      .eq("artist_uid", userId)
      .eq("status", "scheduled")
      .order("starts_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message ?? "Failed to fetch scheduled" }, { status: 500 });
    }

    const streams = (data ?? []).map((row) => ({
      id: (() => {
        const rec = row as unknown as Record<string, unknown>;
        return typeof rec.public_code === "string" ? rec.public_code : "";
      })(),
      title: (row as unknown as Record<string, unknown>).title as string,
      start_time: (row as unknown as Record<string, unknown>).starts_at as string,
      status: (row as unknown as Record<string, unknown>).status as string,
      role,
    }));

    return NextResponse.json({ streams });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
