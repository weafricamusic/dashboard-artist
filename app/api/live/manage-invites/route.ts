import { NextResponse } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import {
  getPendingInvites,
  acceptLiveInvite,
  declineLiveInvite,
} from "@/lib/live/invites";

export async function GET(request: Request) {
  try {
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

    const result = await getPendingInvites(uid);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      invites: result.invites,
    });
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unexpected error";
    console.error("[get-invites] Error:", errorMsg, error);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action: "accept" | "decline";
      inviteId: string;
    };
    const action = body?.action;
    const inviteId = String(body?.inviteId ?? "").trim();

    if (!action || !["accept", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'accept' or 'decline'." },
        { status: 400 }
      );
    }

    if (!inviteId) {
      return NextResponse.json(
        { error: "Missing inviteId" },
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

    // Verify the token for POST
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

    // Process the action
    if (action === "accept") {
      const result = await acceptLiveInvite(inviteId, uid);
      if (!result.ok) {
        return NextResponse.json(
          { error: result.message },
          { status: 400 }
        );
      }
      return NextResponse.json({
        ok: true,
        message: "Invite accepted",
        sessionId: result.sessionId,
        channelId: result.channelId,
      });
    } else {
      const result = await declineLiveInvite(inviteId, uid);
      if (!result.ok) {
        return NextResponse.json(
          { error: result.message },
          { status: 400 }
        );
      }
      return NextResponse.json({
        ok: true,
        message: "Invite declined",
      });
    }
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unexpected error";
    console.error("[manage-invites] Error:", errorMsg, error);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
