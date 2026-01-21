import { NextResponse } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { searchArtists } from "@/lib/live/invites";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

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

    const result = await searchArtists(query, uid, { limit: 15 });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      artists: result.artists,
    });
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unexpected error";
    console.error("[search-artists] Error:", errorMsg, error);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
