import "server-only";

import { getSupabaseAdminClient } from "../supabase/admin";
import { getLegalDocVersions } from "./documents";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as UnknownRecord;
}

function readInt(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function isMissingTableError(message: string, table: string): boolean {
  const m = message.toLowerCase();
  const t = table.toLowerCase();

  if (m.includes("column") && m.includes("does not exist")) return false;

  return (
    m.includes(`relation \"${t}\" does not exist`) ||
    m.includes(`relation \"public.${t}\" does not exist`) ||
    (m.includes("relation") && m.includes(t) && m.includes("does not exist")) ||
    (m.includes("could not find") && m.includes("schema cache") && m.includes(`public.${t}`))
  );
}

export async function hasAcceptedLatestLegal(artistUid: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  // If Supabase isn't configured, don't block dashboard access.
  if (!supabase) return true;

  const latest = await getLegalDocVersions();

  const res = await supabase
    .from("legal_acceptance")
    .select(
      "artist_uid,accepted_terms_version,accepted_platform_policy_version,accepted_copyright_policy_version",
    )
    .eq("artist_uid", artistUid)
    .maybeSingle();

  if (res.error) {
    const msg = res.error.message ?? "";
    // If the acceptance table isn't present yet, don't block.
    if (isMissingTableError(msg, "legal_acceptance")) return true;
    return false;
  }

  if (!res.data) return false;
  const row = asRecord(res.data);
  if (!row) return false;

  return (
    readInt(row.accepted_terms_version, 0) >= latest.terms &&
    readInt(row.accepted_platform_policy_version, 0) >= latest["platform-policy"] &&
    readInt(row.accepted_copyright_policy_version, 0) >= latest.copyright
  );
}

export async function recordLegalAcceptance(input: {
  artistUid: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const latest = await getLegalDocVersions();

  const payload = {
    artist_uid: input.artistUid,
    accepted_terms_version: latest.terms,
    accepted_platform_policy_version: latest["platform-policy"],
    accepted_copyright_policy_version: latest.copyright,
    accepted_at: new Date().toISOString(),
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
  };

  const res = await supabase.from("legal_acceptance").upsert(payload, { onConflict: "artist_uid" });
  if (res.error) {
    const msg = res.error.message ?? "Failed to record acceptance";
    if (isMissingTableError(msg, "legal_acceptance")) {
      return { ok: true };
    }
    return { ok: false, error: msg };
  }
  return { ok: true };
}
