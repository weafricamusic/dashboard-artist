import { NextResponse } from "next/server";

import { generateAgoraToken } from "../../../lib/agora";
import { getSupabaseAdminClient } from "../../../lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body?.title ?? "").trim();
    const description = String(body?.description ?? "").trim();
    const userId = String(body?.userId ?? "").trim();
    const role = "artist";

    if (!title || !userId) {
      return NextResponse.json({ error: "Missing title or userId" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
    }

    const payload = {
      artist_uid: userId,
      status: "live",
      title,
      starts_at: new Date().toISOString(),
      notes: description || null,
      event_url: null,
    };

    const { data, error } = await supabase.from("live_sessions").insert(payload).select("*").single();
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Failed to start live" }, { status: 500 });
    }

    const channelName = data.id;
    const token = generateAgoraToken({ channelName, uid: userId });

    return NextResponse.json({ liveSession: data, token, role });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
