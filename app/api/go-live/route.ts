import { NextResponse } from "next/server";
import { getFirebaseAdminAuth } from "../../../lib/firebase/admin";
import { generateAgoraToken } from "../../../lib/agora";
import { getSupabaseAdminClient } from "../../../lib/supabase/admin";

interface GoLiveRequest {
  title: string;
  notes?: string;
}

export async function POST(request: Request) {
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

    // Get the authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized: Missing or invalid bearer token" },
        { status: 401 }
      );
    }

    const idToken = authHeader.slice(7);

    // Verify the token
    let uid: string;
    try {
      const auth = getFirebaseAdminAuth();
      if (!auth) {
        return NextResponse.json(
          { error: "Firebase not configured" },
          { status: 500 }
        );
      }
      const decodedToken = await auth.verifyIdToken(idToken);
      uid = decodedToken.uid;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Invalid token";
      return NextResponse.json(
        { error: `Authentication failed: ${errorMsg}` },
        { status: 401 }
      );
    }

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
      .select("id")
      .single();

    if (dbError || !sessionData) {
      const errorMsg = dbError?.message ?? "Failed to create live session";
      return NextResponse.json(
        { error: errorMsg },
        { status: 500 }
      );
    }

    const channelId = sessionData.id;

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
