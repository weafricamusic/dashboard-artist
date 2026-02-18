import "server-only";

import { getSupabaseAdminClient } from "../supabase/admin";

export type LiveSessionStatus = "scheduled" | "live" | "ended" | "cancelled";

export type LiveSession = {
  publicId: string;
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

type SupabaseResult<TData> = {
  data: TData | null;
  error: { message?: string } | null;
};

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as UnknownRecord;
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : value == null ? null : String(value);
}

function isMissingTableError(message: string): boolean {
  const m = message.toLowerCase();

  if (m.includes("column") && m.includes("does not exist")) {
    return false;
  }

  return (
    m.includes('relation "live_sessions" does not exist') ||
    m.includes('relation "public.live_sessions" does not exist') ||
    (m.includes("relation") && m.includes("live_sessions") && m.includes("does not exist")) ||
    ((m.includes("could not find") || m.includes("unknown table") || m.includes("table")) &&
      m.includes("live_sessions") &&
      m.includes("does not exist"))
  );
}

function isMissingPublicCodeError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("public_code") && m.includes("does not exist");
}

function readSessionPublicId(row: UnknownRecord): string {
  return readString(row.public_code) ?? readString(row.id) ?? "";
}

function toStatus(value: unknown): LiveSessionStatus {
  const statusRaw = readString(value)?.toLowerCase() ?? "scheduled";
  return statusRaw === "live" || statusRaw === "ended" || statusRaw === "cancelled"
    ? statusRaw
    : "scheduled";
}

function mapRowToLiveSession(r: UnknownRecord, fallbackArtistUid: string): LiveSession {
  return {
    publicId: readSessionPublicId(r),
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
    .select("id,public_code,artist_uid,status,title,starts_at,ends_at,event_url,notes,created_at")
    .eq("artist_uid", artistUid)
    .limit(limit);

  if (onlyUpcoming) {
    q = q
      .in("status", ["scheduled", "live"])
      .order("starts_at", { ascending: true });
  } else {
    q = q.order("starts_at", { ascending: false });
  }

  let res = (await q) as unknown as { data: unknown[] | null; error: { message?: string } | null };

  if (res.error && isMissingPublicCodeError(res.error.message ?? "")) {
    let legacyQ = supabase
      .from("live_sessions")
      .select("id,artist_uid,status,title,starts_at,ends_at,event_url,notes,created_at")
      .eq("artist_uid", artistUid)
      .limit(limit);

    if (onlyUpcoming) {
      legacyQ = legacyQ
        .in("status", ["scheduled", "live"])
        .order("starts_at", { ascending: true });
    } else {
      legacyQ = legacyQ.order("starts_at", { ascending: false });
    }

    res = (await legacyQ) as unknown as { data: unknown[] | null; error: { message?: string } | null };
  }

  if (res.error) {
    const msg = res.error.message ?? "Failed to load live sessions";
    if (isMissingTableError(msg) || isMissingPublicCodeError(msg)) {
      return {
        sessions: [],
        source: "none",
        error: "Live scheduling is not configured in Supabase yet (missing required live_sessions schema).",
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
    .select("id,public_code,artist_uid,status,title,starts_at,ends_at,event_url,created_at")
    .in("status", ["scheduled", "live"])
    .order("starts_at", { ascending: true })
    .limit(limit);

  let resolvedRes = res as unknown as { data: unknown[] | null; error: { message?: string } | null };

  if (resolvedRes.error && isMissingPublicCodeError(resolvedRes.error.message ?? "")) {
    resolvedRes = (await supabase
      .from("live_sessions")
      .select("id,artist_uid,status,title,starts_at,ends_at,event_url,created_at")
      .in("status", ["scheduled", "live"])
      .order("starts_at", { ascending: true })
      .limit(limit)) as unknown as { data: unknown[] | null; error: { message?: string } | null };
  }

  if (resolvedRes.error) {
    const msg = resolvedRes.error.message ?? "Failed to load live sessions";
    if (isMissingTableError(msg) || isMissingPublicCodeError(msg)) {
      return {
        sessions: [],
        source: "none",
        error: "Live scheduling is not configured in Supabase yet (missing required live_sessions schema).",
      };
    }
    return { sessions: [], source: "none", error: msg };
  }

  const rows = (resolvedRes.data ?? []).map(asRecord).filter((r): r is UnknownRecord => r !== null);
  const sessions: PublicLiveSession[] = rows.map((r) => {
    const artistUid = readString(r.artist_uid) ?? "";
    return {
      publicId: readSessionPublicId(r),
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

export async function getPublicLiveSessionByCode(
  publicCode: string,
): Promise<{ session: PublicLiveSession | null; source: "supabase" | "none"; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { session: null, source: "none" };

  const code = publicCode.trim();
  if (!code) return { session: null, source: "none", error: "Invalid session code." };

  const res = await supabase
    .from("live_sessions")
    .select("id,public_code,artist_uid,status,title,starts_at,ends_at,event_url,created_at")
    .eq("public_code", code)
    .limit(1)
    .maybeSingle();

  let resolvedRes = res as unknown as { data: unknown | null; error: { message?: string } | null };

  if (resolvedRes.error && isMissingPublicCodeError(resolvedRes.error.message ?? "")) {
    resolvedRes = (await supabase
      .from("live_sessions")
      .select("id,artist_uid,status,title,starts_at,ends_at,event_url,created_at")
      .eq("id", code)
      .limit(1)
      .maybeSingle()) as unknown as { data: unknown | null; error: { message?: string } | null };
  }

  if (resolvedRes.error) {
    const msg = resolvedRes.error.message ?? "Failed to load live session";
    if (isMissingTableError(msg) || isMissingPublicCodeError(msg)) {
      return {
        session: null,
        source: "none",
        error: "Live scheduling is not configured in Supabase yet (missing required live_sessions schema).",
      };
    }
    return { session: null, source: "none", error: msg };
  }

  if (!resolvedRes.data) return { session: null, source: "supabase" };

  const rec = asRecord(resolvedRes.data);
  if (!rec) return { session: null, source: "supabase" };

  const artistUid = readString(rec.artist_uid) ?? "";
  const session: PublicLiveSession = {
    publicId: readSessionPublicId(rec),
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

async function resolveInternalSessionIdForArtist(
  artistUid: string,
  sessionPublicId: string,
): Promise<
  | { ok: true; id: string }
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

  const code = sessionPublicId.trim();
  if (!code) return { ok: false, reason: "invalid", message: "Invalid session code." };

  const res = await supabase
    .from("live_sessions")
    .select("id")
    .eq("public_code", code)
    .eq("artist_uid", artistUid)
    .limit(1)
    .maybeSingle();

  let resolvedRes = res as unknown as SupabaseResult<unknown>;
  if (resolvedRes.error && isMissingPublicCodeError(resolvedRes.error.message ?? "")) {
    resolvedRes = (await supabase
      .from("live_sessions")
      .select("id")
      .eq("id", code)
      .eq("artist_uid", artistUid)
      .limit(1)
      .maybeSingle()) as unknown as SupabaseResult<unknown>;
  }

  if (resolvedRes.error) {
    return { ok: false, reason: "unknown", message: resolvedRes.error.message ?? "Failed to resolve session" };
  }
  if (!resolvedRes.data) return { ok: false, reason: "not_found", message: "Session not found." };

  const rec = asRecord(resolvedRes.data);
  const id = rec ? readString(rec.id) : null;
  if (!id) return { ok: false, reason: "unknown", message: "Failed to resolve session." };
  return { ok: true, id };
}

export async function updateLiveSessionStatusForArtist(
  artistUid: string,
  input: { sessionPublicId: string; status: LiveSessionStatus },
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

  const resolved = await resolveInternalSessionIdForArtist(artistUid, input.sessionPublicId);
  if (!resolved.ok) return resolved;
  const id = resolved.id;

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
  | { ok: true; publicId: string }
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

  const res = await supabase.from("live_sessions").insert(payload).select("id,public_code").single();

  let resolvedRes = res as unknown as SupabaseResult<unknown>;
  if (resolvedRes.error && isMissingPublicCodeError(resolvedRes.error.message ?? "")) {
    resolvedRes = (await supabase.from("live_sessions").insert(payload).select("id").single()) as unknown as SupabaseResult<unknown>;
  }

  if (resolvedRes.error) {
    const msg = resolvedRes.error.message ?? "Failed to start live session";
    if (isMissingTableError(msg) || isMissingPublicCodeError(msg)) {
      return {
        ok: false,
        reason: "table_missing",
        message: "Supabase live_sessions schema is missing required migrations. Apply Supabase migrations to enable live streaming.",
      };
    }
    return { ok: false, reason: "unknown", message: msg };
  }

  const rec = asRecord(resolvedRes.data);
  const publicId = rec ? readSessionPublicId(rec) : null;
  return { ok: true, publicId: publicId ?? "" };
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
  | { ok: true; publicId: string }
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

  const res = await supabase.from("live_sessions").insert(payload).select("id,public_code").single();

  let resolvedRes = res as unknown as SupabaseResult<unknown>;
  if (resolvedRes.error && isMissingPublicCodeError(resolvedRes.error.message ?? "")) {
    resolvedRes = (await supabase.from("live_sessions").insert(payload).select("id").single()) as unknown as SupabaseResult<unknown>;
  }

  if (resolvedRes.error) {
    const msg = resolvedRes.error.message ?? "Failed to schedule live session";
    if (isMissingTableError(msg) || isMissingPublicCodeError(msg)) {
      return {
        ok: false,
        reason: "table_missing",
        message: "Supabase live_sessions schema is missing required migrations. Apply Supabase migrations to enable scheduling.",
      };
    }
    return { ok: false, reason: "unknown", message: msg };
  }

  const rec = asRecord(resolvedRes.data);
  const publicId = rec ? readSessionPublicId(rec) : null;
  return { ok: true, publicId: publicId ?? "" };
}
