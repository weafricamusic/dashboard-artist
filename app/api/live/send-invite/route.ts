import { NextResponse } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { sendLiveInvite } from "@/lib/live/invites";
import { getArtistProfile } from "@/lib/profile/artist";

interface SendInviteRequest {
  toArtistUid: string;
  sessionId: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendInviteRequest;
    const toArtistUid = String(body?.toArtistUid ?? "").trim();
    const sessionId = String(body?.sessionId ?? "").trim();

    if (!toArtistUid || !sessionId) {
      return NextResponse.json(
        { error: "Missing toArtistUid or sessionId" },
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

    // Get the inviter's name
    const profileResult = await getArtistProfile(uid);
    const artistName = profileResult.profile?.stageName || profileResult.profile?.name || "An artist";

    // Send the invite
    const result = await sendLiveInvite(uid, toArtistUid, sessionId, artistName);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      inviteId: result.inviteId,
      message: "Invite sent successfully",
    });
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unexpected error";
    console.error("[send-invite] Error:", errorMsg, error);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
