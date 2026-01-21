import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "../../../lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = String(searchParams.get("userId") ?? "").trim();
    const role = "artist";

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("live_sessions")
      .select("id,title,starts_at,status")
      .eq("artist_uid", userId)
      .eq("status", "scheduled")
      .order("starts_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message ?? "Failed to fetch scheduled" }, { status: 500 });
    }

    const streams = (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      start_time: row.starts_at,
      status: row.status,
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
