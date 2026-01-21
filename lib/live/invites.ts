import "server-only";

import { getSupabaseAdminClient } from "../supabase/admin";

export type InviteStatus = "pending" | "accepted" | "declined" | "expired";

export type LiveInvite = {
  id: string;
  sessionId: string;
  fromArtistUid: string;
  toArtistUid: string;
  fromArtistName: string;
  status: InviteStatus;
  createdAt: string;
  respondedAt: string | null;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as UnknownRecord;
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : value == null ? null : String(value);
}

function toStatus(value: unknown): InviteStatus {
  const statusRaw = readString(value)?.toLowerCase() ?? "pending";
  return statusRaw === "accepted" ||
    statusRaw === "declined" ||
    statusRaw === "expired"
    ? statusRaw
    : "pending";
}

function isMissingTableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("could not find") ||
    m.includes("unknown table") ||
    (m.includes("relation") && m.includes("live_invites"))
  );
}

function mapRowToInvite(r: UnknownRecord): LiveInvite {
  return {
    id: readString(r.id) ?? "",
    sessionId: readString(r.session_id) ?? "",
    fromArtistUid: readString(r.from_artist_uid) ?? "",
    toArtistUid: readString(r.to_artist_uid) ?? "",
    fromArtistName: readString(r.from_artist_name) ?? "",
    status: toStatus(r.status),
    createdAt: readString(r.created_at) ?? new Date().toISOString(),
    respondedAt: readString(r.responded_at),
  };
}

/**
 * Search for artists by name or display name (excludes the current artist)
 */
export async function searchArtists(
  query: string,
  currentArtistUid: string,
  opts?: { limit?: number }
): Promise<
  | {
      ok: true;
      artists: Array<{ uid: string; displayName: string; avatarUrl: string | null }>;
    }
  | { ok: false; reason: string; message: string }
> {
  if (!query.trim()) {
    return {
      ok: true,
      artists: [],
    };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Supabase is not configured.",
    };
  }

  const limit = opts?.limit ?? 10;
  const searchTerm = `%${query.trim()}%`;

  try {
    const { data, error } = await supabase
      .from("artist_profiles")
      .select("id,display_name,avatar_url")
      .neq("id", currentArtistUid)
      .or(`display_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
      .limit(limit);

    if (error) {
      return {
        ok: false,
        reason: "query_error",
        message: error.message,
      };
    }

    const artists = (data ?? []).map((row: { id: string; display_name: string; avatar_url: string | null }) => ({
      uid: row.id,
      displayName: row.display_name || "Unknown Artist",
      avatarUrl: row.avatar_url,
    }));

    return { ok: true, artists };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return {
      ok: false,
      reason: "unknown",
      message: msg,
    };
  }
}

/**
 * Send a live invite to another artist for collaborative live streaming
 */
export async function sendLiveInvite(
  fromArtistUid: string,
  toArtistUid: string,
  sessionId: string,
  fromArtistName: string
): Promise<
  | { ok: true; inviteId: string }
  | {
      ok: false;
      reason: string;
      message: string;
    }
> {
  if (!toArtistUid.trim() || !sessionId.trim()) {
    return {
      ok: false,
      reason: "invalid",
      message: "Invalid artist or session.",
    };
  }

  if (fromArtistUid === toArtistUid) {
    return {
      ok: false,
      reason: "invalid",
      message: "Cannot invite yourself.",
    };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Supabase is not configured.",
    };
  }

  try {
    // Check if invite already exists
    const { data: existingInvite, error: checkError } = await supabase
      .from("live_invites")
      .select("id")
      .eq("session_id", sessionId)
      .eq("to_artist_uid", toArtistUid)
      .in("status", ["pending", "accepted"])
      .maybeSingle();

    if (!checkError && existingInvite) {
      return {
        ok: false,
        reason: "duplicate",
        message: "An active invite already exists.",
      };
    }

    // Create the invite
    const { data, error } = await supabase
      .from("live_invites")
      .insert({
        session_id: sessionId,
        from_artist_uid: fromArtistUid,
        to_artist_uid: toArtistUid,
        from_artist_name: fromArtistName,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !data) {
      const msg = error?.message ?? "Failed to send invite";
      if (isMissingTableError(msg)) {
        return {
          ok: false,
          reason: "table_missing",
          message:
            "Live invites table is not configured. Please contact support.",
        };
      }
      return {
        ok: false,
        reason: "unknown",
        message: msg,
      };
    }

    return { ok: true, inviteId: data.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return {
      ok: false,
      reason: "unknown",
      message: msg,
    };
  }
}

/**
 * Get pending invites for an artist
 */
export async function getPendingInvites(
  artistUid: string
): Promise<
  | {
      ok: true;
      invites: LiveInvite[];
    }
  | {
      ok: false;
      reason: string;
      message: string;
    }
> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Supabase is not configured.",
    };
  }

  try {
    const { data, error } = await supabase
      .from("live_invites")
      .select(
        "id,session_id,from_artist_uid,to_artist_uid,from_artist_name,status,created_at,responded_at"
      )
      .eq("to_artist_uid", artistUid)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      const msg = error.message ?? "Failed to load invites";
      if (isMissingTableError(msg)) {
        return {
          ok: true,
          invites: [],
        };
      }
      return {
        ok: false,
        reason: "query_error",
        message: msg,
      };
    }

    const invites = (data ?? [])
      .map(asRecord)
      .filter((r): r is UnknownRecord => r !== null)
      .map(mapRowToInvite);

    return { ok: true, invites };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return {
      ok: false,
      reason: "unknown",
      message: msg,
    };
  }
}

/**
 * Accept a live invite and join the collaborative stream
 */
export async function acceptLiveInvite(
  inviteId: string,
  artistUid: string
): Promise<
  | { ok: true; sessionId: string; channelId: string }
  | {
      ok: false;
      reason: string;
      message: string;
    }
> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Supabase is not configured.",
    };
  }

  try {
    // Get and validate the invite
    const { data: inviteData, error: inviteError } = await supabase
      .from("live_invites")
      .select("session_id,to_artist_uid,status")
      .eq("id", inviteId)
      .maybeSingle();

    if (inviteError || !inviteData) {
      return {
        ok: false,
        reason: "not_found",
        message: "Invite not found.",
      };
    }

    if (inviteData.to_artist_uid !== artistUid) {
      return {
        ok: false,
        reason: "forbidden",
        message: "You are not the recipient of this invite.",
      };
    }

    if (inviteData.status !== "pending") {
      return {
        ok: false,
        reason: "invalid",
        message: "This invite is no longer available.",
      };
    }

    const sessionId = inviteData.session_id;

    // Update invite status
    const { error: updateError } = await supabase
      .from("live_invites")
      .update({
        status: "accepted",
        responded_at: new Date().toISOString(),
      })
      .eq("id", inviteId);

    if (updateError) {
      return {
        ok: false,
        reason: "update_error",
        message: updateError.message,
      };
    }

    return { ok: true, sessionId, channelId: sessionId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return {
      ok: false,
      reason: "unknown",
      message: msg,
    };
  }
}

/**
 * Decline a live invite
 */
export async function declineLiveInvite(
  inviteId: string,
  artistUid: string
): Promise<
  | { ok: true }
  | {
      ok: false;
      reason: string;
      message: string;
    }
> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Supabase is not configured.",
    };
  }

  try {
    // Get and validate the invite
    const { data: inviteData, error: inviteError } = await supabase
      .from("live_invites")
      .select("to_artist_uid,status")
      .eq("id", inviteId)
      .maybeSingle();

    if (inviteError || !inviteData) {
      return {
        ok: false,
        reason: "not_found",
        message: "Invite not found.",
      };
    }

    if (inviteData.to_artist_uid !== artistUid) {
      return {
        ok: false,
        reason: "forbidden",
        message: "You are not the recipient of this invite.",
      };
    }

    if (inviteData.status !== "pending") {
      return {
        ok: false,
        reason: "invalid",
        message: "This invite is no longer available.",
      };
    }

    // Update invite status
    const { error: updateError } = await supabase
      .from("live_invites")
      .update({
        status: "declined",
        responded_at: new Date().toISOString(),
      })
      .eq("id", inviteId);

    if (updateError) {
      return {
        ok: false,
        reason: "update_error",
        message: updateError.message,
      };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return {
      ok: false,
      reason: "unknown",
      message: msg,
    };
  }
}
