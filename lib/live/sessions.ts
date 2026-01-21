import "server-only";

import { getSupabaseAdminClient } from "../supabase/admin";

export type LiveSessionStatus = "scheduled" | "live" | "ended" | "cancelled";

export type LiveSession = {
  id: string;
  artistUid: string;
  status: LiveSessionStatus;
  title: string;
  startsAt: string;
  endsAt: string | null;
  eventUrl: string | null;
  notes: string | null;
  createdAt: string;
};

export type PublicLiveSession = Omit<LiveSession, "notes">;

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as UnknownRecord;
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : value == null ? null : String(value);
}

function isMissingTableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("could not find") ||
    m.includes("unknown table") ||
    (m.includes("relation") && m.includes("live_sessions"))
  );
}

function toStatus(value: unknown): LiveSessionStatus {
  const statusRaw = readString(value)?.toLowerCase() ?? "scheduled";
  return statusRaw === "live" || statusRaw === "ended" || statusRaw === "cancelled"
    ? statusRaw
    : "scheduled";
}

function mapRowToLiveSession(r: UnknownRecord, fallbackArtistUid: string): LiveSession {
  return {
    id: readString(r.id) ?? "",
    artistUid: readString(r.artist_uid) ?? fallbackArtistUid,
    status: toStatus(r.status),
    title: readString(r.title) ?? "",
    startsAt: readString(r.starts_at) ?? new Date().toISOString(),
    endsAt: readString(r.ends_at),
    eventUrl: readString(r.event_url),
    notes: readString(r.notes),
    createdAt: readString(r.created_at) ?? new Date().toISOString(),
  };
}

export async function listLiveSessionsForArtist(
  artistUid: string,
  opts?: { limit?: number; onlyUpcoming?: boolean },
): Promise<{ sessions: LiveSession[]; source: "supabase" | "none"; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { sessions: [], source: "none" };

  const limit = opts?.limit ?? 25;
  const onlyUpcoming = opts?.onlyUpcoming ?? false;

  let q = supabase
    .from("live_sessions")
    .select("id,artist_uid,status,title,starts_at,ends_at,event_url,notes,created_at")
    .eq("artist_uid", artistUid)
    .limit(limit);

  if (onlyUpcoming) {
    q = q
      .in("status", ["scheduled", "live"])
      .order("starts_at", { ascending: true });
  } else {
    q = q.order("starts_at", { ascending: false });
  }

  const res = await q;

  if (res.error) {
    const msg = res.error.message ?? "Failed to load live sessions";
    if (isMissingTableError(msg)) {
      return {
        sessions: [],
        source: "none",
        error: "Live scheduling is not configured in Supabase yet (missing live_sessions table).",
      };
    }
    return { sessions: [], source: "none", error: msg };
  }

  const rows = (res.data ?? []).map(asRecord).filter((r): r is UnknownRecord => r !== null);

  const sessions: LiveSession[] = rows.map((r) => mapRowToLiveSession(r, artistUid));

  return { sessions, source: "supabase" };
}

export async function listPublicLiveSessions(opts?: {
  limit?: number;
}): Promise<{ sessions: PublicLiveSession[]; source: "supabase" | "none"; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { sessions: [], source: "none" };

  const limit = opts?.limit ?? 20;

  const res = await supabase
    .from("live_sessions")
    .select("id,artist_uid,status,title,starts_at,ends_at,event_url,created_at")
    .in("status", ["scheduled", "live"])
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (res.error) {
    const msg = res.error.message ?? "Failed to load live sessions";
    if (isMissingTableError(msg)) {
      return {
        sessions: [],
        source: "none",
        error: "Live scheduling is not configured in Supabase yet (missing live_sessions table).",
      };
    }
    return { sessions: [], source: "none", error: msg };
  }

  const rows = (res.data ?? []).map(asRecord).filter((r): r is UnknownRecord => r !== null);
  const sessions: PublicLiveSession[] = rows.map((r) => {
    const artistUid = readString(r.artist_uid) ?? "";
    return {
      id: readString(r.id) ?? "",
      artistUid,
      status: toStatus(r.status),
      title: readString(r.title) ?? "",
      startsAt: readString(r.starts_at) ?? new Date().toISOString(),
      endsAt: readString(r.ends_at),
      eventUrl: readString(r.event_url),
      createdAt: readString(r.created_at) ?? new Date().toISOString(),
    };
  });

  return { sessions, source: "supabase" };
}

export async function getPublicLiveSessionById(
  sessionId: string,
): Promise<{ session: PublicLiveSession | null; source: "supabase" | "none"; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { session: null, source: "none" };

  const id = sessionId.trim();
  if (!id) return { session: null, source: "none", error: "Invalid session id." };

  const res = await supabase
    .from("live_sessions")
    .select("id,artist_uid,status,title,starts_at,ends_at,event_url,created_at")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (res.error) {
    const msg = res.error.message ?? "Failed to load live session";
    if (isMissingTableError(msg)) {
      return {
        session: null,
        source: "none",
        error: "Live scheduling is not configured in Supabase yet (missing live_sessions table).",
      };
    }
    return { session: null, source: "none", error: msg };
  }

  if (!res.data) return { session: null, source: "supabase" };

  const rec = asRecord(res.data);
  if (!rec) return { session: null, source: "supabase" };

  const artistUid = readString(rec.artist_uid) ?? "";
  const session: PublicLiveSession = {
    id: readString(rec.id) ?? "",
    artistUid,
    status: toStatus(rec.status),
    title: readString(rec.title) ?? "",
    startsAt: readString(rec.starts_at) ?? new Date().toISOString(),
    endsAt: readString(rec.ends_at),
    eventUrl: readString(rec.event_url),
    createdAt: readString(rec.created_at) ?? new Date().toISOString(),
  };
  return { session, source: "supabase" };
}

export async function updateLiveSessionStatusForArtist(
  artistUid: string,
  input: { sessionId: string; status: LiveSessionStatus },
): Promise<
  | { ok: true }
  | { ok: false; reason: "not_configured" | "invalid" | "not_found" | "unknown"; message: string }
> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const id = input.sessionId.trim();
  if (!id) return { ok: false, reason: "invalid", message: "Invalid session id." };

  const status = input.status;
  if (status !== "scheduled" && status !== "live" && status !== "ended" && status !== "cancelled") {
    return { ok: false, reason: "invalid", message: "Invalid status." };
  }

  const patch: Record<string, string> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "ended") {
    patch.ends_at = new Date().toISOString();
  }

  const res = await supabase
    .from("live_sessions")
    .update(patch)
    .eq("id", id)
    .eq("artist_uid", artistUid)
    .select("id")
    .maybeSingle();

  if (res.error) {
    return { ok: false, reason: "unknown", message: res.error.message ?? "Failed to update status" };
  }

  if (!res.data) return { ok: false, reason: "not_found", message: "Session not found." };
  return { ok: true };
}

export async function createLiveNowForArtist(
  artistUid: string,
  input: {
    title: string;
    notes?: string;
  },
): Promise<
  | { ok: true; id: string }
  | { ok: false; reason: "not_configured" | "table_missing" | "invalid" | "unknown"; message: string }
> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const title = input.title.trim();
  if (!title) {
    return { ok: false, reason: "invalid", message: "Title is required." };
  }

  const payload = {
    artist_uid: artistUid,
    status: "live" satisfies LiveSessionStatus,
    title,
    starts_at: new Date().toISOString(),
    event_url: null,
    notes: input.notes?.trim() || null,
  };

  const res = await supabase.from("live_sessions").insert(payload).select("id").single();

  if (res.error) {
    const msg = res.error.message ?? "Failed to start live session";
    if (isMissingTableError(msg)) {
      return {
        ok: false,
        reason: "table_missing",
        message: "Supabase table live_sessions is missing. Create it to enable live streaming.",
      };
    }
    return { ok: false, reason: "unknown", message: msg };
  }

  const rec = asRecord(res.data);
  const id = rec ? readString(rec.id) : null;
  return { ok: true, id: id ?? "" };
}

export async function createLiveSessionForArtist(
  artistUid: string,
  input: {
    title: string;
    startsAtIso: string;
    eventUrl?: string;
    notes?: string;
  },
): Promise<
  | { ok: true; id: string }
  | { ok: false; reason: "not_configured" | "table_missing" | "invalid" | "unknown"; message: string }
> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const title = input.title.trim();
  if (!title) {
    return { ok: false, reason: "invalid", message: "Title is required." };
  }

  const startsAt = new Date(input.startsAtIso);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, reason: "invalid", message: "Start date/time is invalid." };
  }

  const payload = {
    artist_uid: artistUid,
    status: "scheduled" satisfies LiveSessionStatus,
    title,
    starts_at: startsAt.toISOString(),
    event_url: input.eventUrl?.trim() || null,
    notes: input.notes?.trim() || null,
  };

  const res = await supabase.from("live_sessions").insert(payload).select("id").single();

  if (res.error) {
    const msg = res.error.message ?? "Failed to schedule live session";
    if (isMissingTableError(msg)) {
      return {
        ok: false,
        reason: "table_missing",
        message: "Supabase table live_sessions is missing. Create it to enable scheduling.",
      };
    }
    return { ok: false, reason: "unknown", message: msg };
  }

  const rec = asRecord(res.data);
  const id = rec ? readString(rec.id) : null;
  return { ok: true, id: id ?? "" };
}
