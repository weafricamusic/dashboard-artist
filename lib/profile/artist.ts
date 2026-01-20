import "server-only";

import { getSupabaseAdminClient } from "../supabase/admin";

export type ArtistProfile = {
  artistUid: string;

  name: string;
  stageName: string;
  bio: string;
  genres: string[];
  country: string;
  profilePhotoUrl: string | null;
  socials: Record<string, string>;

  // Admin-managed fields
  verificationBadge: boolean;
  featured: boolean;
  showOnHomepage: boolean;

  createdAt: string;
  updatedAt: string;
};

export type ProfileAuditLog = {
  id: string;
  artistUid: string;
  actorUid: string;
  action: "artist_update";
  changes: Record<string, { from: unknown; to: unknown }>;
  createdAt: string;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as UnknownRecord;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function readBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === 1) return true;
  return false;
}

function readStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => readString(v)).filter((s) => s.trim().length > 0);
  return [];
}

function readRecordOfStrings(value: unknown): Record<string, string> {
  const r = asRecord(value);
  if (!r) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(r)) {
    const s = readString(v).trim();
    if (s) out[k] = s;
  }
  return out;
}

function isMissingTableError(message: string, table: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("could not find") ||
    m.includes("unknown table") ||
    (m.includes("relation") && m.includes(table.toLowerCase()))
  );
}

function normalizeUrlOrEmpty(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  return v;
}

export async function getArtistProfile(
  artistUid: string,
): Promise<{ profile: ArtistProfile | null; source: "supabase" | "none"; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { profile: null, source: "none" };

  const res = await supabase
    .from("artist_profiles")
    .select(
      "artist_uid,name,stage_name,bio,genres,country,profile_photo_url,socials,verification_badge,featured,show_on_homepage,created_at,updated_at",
    )
    .eq("artist_uid", artistUid)
    .maybeSingle();

  if (res.error) {
    const msg = res.error.message ?? "Failed to load profile";
    if (isMissingTableError(msg, "artist_profiles")) {
      return { profile: null, source: "none", error: "Profile is not configured in Supabase yet (missing artist_profiles table)." };
    }
    return { profile: null, source: "none", error: msg };
  }

  if (!res.data) return { profile: null, source: "supabase" };

  const row = asRecord(res.data);
  if (!row) return { profile: null, source: "supabase" };

  const profile: ArtistProfile = {
    artistUid: readString(row.artist_uid) || artistUid,

    name: readString(row.name),
    stageName: readString(row.stage_name),
    bio: readString(row.bio),
    genres: readStringArray(row.genres),
    country: readString(row.country),
    profilePhotoUrl: readString(row.profile_photo_url) || null,
    socials: readRecordOfStrings(row.socials),

    verificationBadge: readBool(row.verification_badge),
    featured: readBool(row.featured),
    showOnHomepage: readBool(row.show_on_homepage),

    createdAt: readString(row.created_at) || new Date().toISOString(),
    updatedAt: readString(row.updated_at) || new Date().toISOString(),
  };

  return { profile, source: "supabase" };
}

export async function listProfileAuditLogs(
  artistUid: string,
  limit = 25,
): Promise<{ logs: ProfileAuditLog[]; source: "supabase" | "none"; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { logs: [], source: "none" };

  const res = await supabase
    .from("profile_audit_logs")
    .select("id,artist_uid,actor_uid,action,changes,created_at")
    .eq("artist_uid", artistUid)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (res.error) {
    const msg = res.error.message ?? "Failed to load audit logs";
    if (isMissingTableError(msg, "profile_audit_logs")) {
      return { logs: [], source: "none", error: "Audit logs are not configured in Supabase yet (missing profile_audit_logs table)." };
    }
    return { logs: [], source: "none", error: msg };
  }

  const rows = (res.data ?? []).map(asRecord).filter((r): r is UnknownRecord => r !== null);
  const logs: ProfileAuditLog[] = rows.map((r) => {
    const actionRaw = readString(r.action);
    const action: "artist_update" = actionRaw === "artist_update" ? "artist_update" : "artist_update";
    const changes = asRecord(r.changes) ?? {};

    return {
      id: readString(r.id),
      artistUid: readString(r.artist_uid) || artistUid,
      actorUid: readString(r.actor_uid),
      action,
      changes: changes as Record<string, { from: unknown; to: unknown }>,
      createdAt: readString(r.created_at) || new Date().toISOString(),
    };
  });

  return { logs, source: "supabase" };
}

export type UpdateArtistProfileInput = {
  name: string;
  stageName: string;
  bio: string;
  genres: string[];
  country: string;
  profilePhotoUrl: string;
  socials: Record<string, string>;
};

function diffEditable(prev: ArtistProfile | null, next: UpdateArtistProfileInput) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  const set = (key: keyof UpdateArtistProfileInput, from: unknown, to: unknown) => {
    const f = JSON.stringify(from ?? null);
    const t = JSON.stringify(to ?? null);
    if (f !== t) changes[String(key)] = { from, to };
  };

  set("name", prev?.name ?? "", next.name);
  set("stageName", prev?.stageName ?? "", next.stageName);
  set("bio", prev?.bio ?? "", next.bio);
  set("genres", prev?.genres ?? [], next.genres);
  set("country", prev?.country ?? "", next.country);
  set("profilePhotoUrl", prev?.profilePhotoUrl ?? "", next.profilePhotoUrl);
  set("socials", prev?.socials ?? {}, next.socials);

  return changes;
}

export async function updateArtistProfileEditable(
  artistUid: string,
  actorUid: string,
  input: UpdateArtistProfileInput,
): Promise<
  | { ok: true }
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

  const name = input.name.trim();
  const stageName = input.stageName.trim();
  const bio = input.bio.trim();
  const country = input.country.trim();
  const genres = input.genres.map((g) => g.trim()).filter(Boolean).slice(0, 12);

  if (!name && !stageName) {
    return { ok: false, reason: "invalid", message: "Provide at least a name or stage name." };
  }

  const profilePhotoUrl = normalizeUrlOrEmpty(input.profilePhotoUrl);

  const socials: Record<string, string> = {};
  for (const [k, v] of Object.entries(input.socials)) {
    const key = k.trim();
    const val = normalizeUrlOrEmpty(v);
    if (key && val) socials[key] = val;
  }

  const current = await getArtistProfile(artistUid);
  if (current.error && current.error.includes("missing artist_profiles")) {
    return { ok: false, reason: "table_missing", message: current.error };
  }

  const changes = diffEditable(current.profile, {
    name,
    stageName,
    bio,
    genres,
    country,
    profilePhotoUrl,
    socials,
  });

  const upsertPayload = {
    artist_uid: artistUid,
    name,
    stage_name: stageName,
    bio,
    genres,
    country,
    profile_photo_url: profilePhotoUrl || null,
    socials,
    updated_at: new Date().toISOString(),
  };

  const upsert = await supabase
    .from("artist_profiles")
    .upsert(upsertPayload, { onConflict: "artist_uid" });

  if (upsert.error) {
    const msg = upsert.error.message ?? "Failed to update profile";
    if (isMissingTableError(msg, "artist_profiles")) {
      return { ok: false, reason: "table_missing", message: "Profile is not configured in Supabase yet (missing artist_profiles table)." };
    }
    return { ok: false, reason: "unknown", message: msg };
  }

  // Log changes (best-effort).
  if (Object.keys(changes).length > 0) {
    const logRes = await supabase.from("profile_audit_logs").insert({
      artist_uid: artistUid,
      actor_uid: actorUid,
      action: "artist_update",
      changes,
    });

    if (logRes.error) {
      const msg = logRes.error.message ?? "";
      if (!isMissingTableError(msg, "profile_audit_logs")) {
        // ignore non-fatal logging errors
      }
    }
  }

  return { ok: true };
}
