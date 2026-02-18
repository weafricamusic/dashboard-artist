import { NextRequest, NextResponse } from "next/server";

import { generateAgoraToken } from "../../../lib/agora";
import { getSupabaseAdminClient } from "../../../lib/supabase/admin";
import { requireVerifiedArtistFromRequest } from "../../../lib/auth/request";

export async function POST(request: NextRequest) {
  try {
    const verified = await requireVerifiedArtistFromRequest(request);
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: verified.status });
    }

    const body = await request.json();
    const title = String(body?.title ?? "").trim();
    const description = String(body?.description ?? "").trim();
    const userId = verified.artist.uid;
    const role = "artist";

    if (!title) {
      return NextResponse.json({ error: "Missing title" }, { status: 400 });
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

    const { data, error } = await supabase
      .from("live_sessions")
      .insert(payload)
      .select("public_code,title,status,starts_at,event_url")
      .single();
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Failed to start live" }, { status: 500 });
    }

    const channelName = (data as unknown as { public_code?: string }).public_code;
    if (!channelName) {
      return NextResponse.json({ error: "Failed to allocate public session code" }, { status: 500 });
    }
    const token = generateAgoraToken({ channelName, uid: userId });

    return NextResponse.json({
      liveSession: {
        id: channelName,
        title: (() => {
          const rec = data as unknown as Record<string, unknown>;
          return typeof rec.title === "string" ? rec.title : title;
        })(),
        status: (() => {
          const rec = data as unknown as Record<string, unknown>;
          return typeof rec.status === "string" ? rec.status : "live";
        })(),
        start_time: (() => {
          const rec = data as unknown as Record<string, unknown>;
          return typeof rec.starts_at === "string" ? rec.starts_at : new Date().toISOString();
        })(),
        event_url: (() => {
          const rec = data as unknown as Record<string, unknown>;
          return typeof rec.event_url === "string" ? rec.event_url : null;
        })(),
      },
      token,
      role,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
