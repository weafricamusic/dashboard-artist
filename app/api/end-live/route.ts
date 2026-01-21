import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "../../../lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const liveId = String(body?.liveId ?? "").trim();

    if (!liveId) {
      return NextResponse.json({ error: "Missing liveId" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
    }

    const { error } = await supabase
      .from("live_sessions")
      .update({ status: "ended", ends_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", liveId);

    if (error) {
      return NextResponse.json({ error: error.message ?? "Failed to end live" }, { status: 500 });
    }

    return NextResponse.json({ message: "Live ended" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
