import "server-only";

import { getSupabaseAdminClient } from "../supabase/admin";

export type BattleCategory = "amapiano" | "dj" | "rnb" | "others";

export type Battle = {
  id: string;
  djId: string;
  title: string;
  category: string;
  country: string | null;
  isLive: boolean;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as UnknownRecord;
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : value == null ? null : String(value);
}

function readBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

function isMissingTableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("could not find") ||
    m.includes("unknown table") ||
    (m.includes("relation") && m.includes("battles"))
  );
}

function mapRowToBattle(r: UnknownRecord, fallbackDjId: string): Battle {
  return {
    id: readString(r.id) ?? "",
    djId: readString(r.dj_id) ?? fallbackDjId,
    title: readString(r.title) ?? "",
    category: readString(r.category) ?? "",
    country: readString(r.country),
    isLive: readBool(r.is_live),
    startedAt: readString(r.started_at),
    endedAt: readString(r.ended_at),
    createdAt: readString(r.created_at) ?? new Date().toISOString(),
  };
}

export async function listBattlesForArtist(
  djId: string,
  opts?: { limit?: number },
): Promise<{ battles: Battle[]; source: "supabase" | "none"; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { battles: [], source: "none", error: "Supabase is not configured." };

  const limit = opts?.limit ?? 50;

  const res = await supabase
    .from("battles")
    .select("id,title,category,country,is_live,started_at,ended_at,created_at,dj_id")
    .eq("dj_id", djId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (res.error) {
    const msg = res.error.message ?? "Failed to load battles";
    if (isMissingTableError(msg)) {
      return {
        battles: [],
        source: "none",
        error: "Battles are not configured in Supabase yet (missing battles table).",
      };
    }
    return { battles: [], source: "none", error: msg };
  }

  const rows = (res.data ?? []).map(asRecord).filter((r): r is UnknownRecord => r !== null);
  return { battles: rows.map((r) => mapRowToBattle(r, djId)), source: "supabase" };
}

export async function createBattleForArtist(
  djId: string,
  input: { title: string; category: BattleCategory; country?: string },
): Promise<
  | { ok: true; battleId: string }
  | { ok: false; reason: "not_configured" | "invalid" | "unknown"; message: string }
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
  if (!title) return { ok: false, reason: "invalid", message: "Title is required." };

  const category = input.category;
  if (category !== "amapiano" && category !== "dj" && category !== "rnb" && category !== "others") {
    return { ok: false, reason: "invalid", message: "Invalid category." };
  }

  const country = input.country?.trim();

  const res = await supabase
    .from("battles")
    .insert({
      dj_id: djId,
      title,
      category,
      country: country && country.length > 0 ? country : null,
      is_live: false,
      started_at: null,
      ended_at: null,
    })
    .select("id")
    .single();

  if (res.error) {
    return { ok: false, reason: "unknown", message: res.error.message ?? "Failed to create battle" };
  }

  const id = (res.data as unknown as { id?: unknown } | null)?.id;
  const battleId = typeof id === "string" ? id : String(id ?? "");
  return { ok: true, battleId };
}

export async function startBattleForArtist(
  djId: string,
  battleId: string,
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

  const id = battleId.trim();
  if (!id) return { ok: false, reason: "invalid", message: "Invalid battle id." };

  const res = await supabase
    .from("battles")
    .update({ is_live: true, started_at: new Date().toISOString(), ended_at: null })
    .eq("id", id)
    .eq("dj_id", djId)
    .select("id")
    .maybeSingle();

  if (res.error) {
    return { ok: false, reason: "unknown", message: res.error.message ?? "Failed to start battle" };
  }

  if (!res.data) return { ok: false, reason: "not_found", message: "Battle not found." };
  return { ok: true };
}

export async function endBattleForArtist(
  djId: string,
  battleId: string,
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

  const id = battleId.trim();
  if (!id) return { ok: false, reason: "invalid", message: "Invalid battle id." };

  const res = await supabase
    .from("battles")
    .update({ is_live: false, ended_at: new Date().toISOString() })
    .eq("id", id)
    .eq("dj_id", djId)
    .select("id")
    .maybeSingle();

  if (res.error) {
    return { ok: false, reason: "unknown", message: res.error.message ?? "Failed to end battle" };
  }

  if (!res.data) return { ok: false, reason: "not_found", message: "Battle not found." };
  return { ok: true };
}
