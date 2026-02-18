import { NextRequest, NextResponse } from "next/server";
import { generateAgoraToken } from "../../../lib/agora";
import { getSupabaseAdminClient } from "../../../lib/supabase/admin";
import { requireVerifiedArtistFromRequest } from "../../../lib/auth/request";

interface GoLiveRequest {
  title: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GoLiveRequest;
    const title = String(body?.title ?? "").trim();
    const notes = String(body?.notes ?? "").trim();

    if (!title) {
      return NextResponse.json(
        { error: "Stream title is required" },
        { status: 400 }
      );
    }

    const verified = await requireVerifiedArtistFromRequest(request);
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: verified.status });
    }
    const uid = verified.artist.uid;

    // Create live session in Supabase
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const now = new Date();
    const payload = {
      artist_uid: uid,
      status: "live",
      title,
      starts_at: now.toISOString(),
      notes: notes || null,
      event_url: null,
    };

    const { data: sessionData, error: dbError } = await supabase
      .from("live_sessions")
      .insert(payload)
      .select("public_code")
      .single();

    if (dbError || !sessionData) {
      const errorMsg = dbError?.message ?? "Failed to create live session";
      return NextResponse.json(
        { error: errorMsg },
        { status: 500 }
      );
    }

    const channelId = (sessionData as unknown as { public_code?: string }).public_code;
    if (!channelId) {
      return NextResponse.json({ error: "Failed to allocate public session code" }, { status: 500 });
    }

    // Generate Agora token with the session ID as channel name
    const agoraToken = generateAgoraToken({
      channelName: channelId,
      uid: uid.slice(0, 32), // Agora uid has size limitations
    });

    return NextResponse.json({
      ok: true,
      session: {
        id: channelId,
        title,
        status: "live",
        channelId,
        agoraToken,
        uid,
        role: "broadcaster",
      },
    });
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unexpected error";
    console.error("[go-live] Error:", errorMsg, error);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
