import "server-only";

import { getSupabaseAdminClient } from "../supabase/admin";

export type SubscriptionPlanCode = "free" | "premium" | "platinum";

export type ArtistSubscriptionStatus = {
  planCode: SubscriptionPlanCode;
  planName: string;
  expiresAt: string | null;
  features: Record<string, unknown>;
  source: "supabase" | "defaults" | "none";
  error?: string;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as UnknownRecord;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : value == null ? null : String(value);
}

function coercePlanCode(raw: unknown): SubscriptionPlanCode {
  const v = readString(raw).toLowerCase();
  if (v === "premium" || v === "platinum") return v;
  return "free";
}

function isMissingTableError(message: string, table: string): boolean {
  const m = message.toLowerCase();
  const t = table.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("could not find") ||
    m.includes("unknown table") ||
    (m.includes("relation") && m.includes(t))
  );
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt);
  if (!Number.isFinite(t)) return false;
  return t <= Date.now();
}

function defaultPlans(): Record<SubscriptionPlanCode, { name: string; features: Record<string, unknown> }> {
  return {
    free: {
      name: "Free",
      features: {
        tier: "free",
        uploads: { songs: true, videos: true },
        limits: { maxSongs: 10, maxVideos: 5 },
        support: { priority: false },
      },
    },
    premium: {
      name: "Premium",
      features: {
        tier: "premium",
        uploads: { songs: true, videos: true },
        limits: { maxSongs: 100, maxVideos: 50 },
        support: { priority: true },
      },
    },
    platinum: {
      name: "Platinum",
      features: {
        tier: "platinum",
        uploads: { songs: true, videos: true },
        limits: { maxSongs: 1000, maxVideos: 500 },
        support: { priority: true },
        boost: { featuredPlacement: true },
      },
    },
  };
}

async function getFreePlanFromSupabase(): Promise<
  | { ok: true; planCode: SubscriptionPlanCode; planName: string; features: Record<string, unknown> }
  | { ok: false; error: string }
> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const res = await supabase.from("subscriptions").select("code,name,features").eq("code", "free").maybeSingle();
  if (res.error) return { ok: false, error: res.error.message ?? "Failed to fetch free plan" };

  const row = asRecord(res.data);
  if (!row) return { ok: false, error: "Free plan record not found" };

  return {
    ok: true,
    planCode: coercePlanCode(row.code),
    planName: readString(row.name) || "Free",
    features: (asRecord(row.features) ?? (row.features as Record<string, unknown> | null) ?? {}) as Record<string, unknown>,
  };
}

export async function getArtistSubscriptionStatus(artistUid: string): Promise<ArtistSubscriptionStatus> {
  const defaults = defaultPlans();

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      planCode: "free",
      planName: defaults.free.name,
      expiresAt: null,
      features: defaults.free.features,
      source: "defaults",
      error: "Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const userRes = await supabase
    .from("user_subscriptions")
    .select("subscription_id,status,expires_at,created_at")
    .eq("artist_uid", artistUid)
    .maybeSingle();

  if (userRes.error) {
    const msg = userRes.error.message ?? "Failed to load subscription";
    if (isMissingTableError(msg, "user_subscriptions")) {
      return {
        planCode: "free",
        planName: defaults.free.name,
        expiresAt: null,
        features: defaults.free.features,
        source: "defaults",
        error: "Subscriptions are not configured in Supabase yet (missing user_subscriptions table).",
      };
    }
    return {
      planCode: "free",
      planName: defaults.free.name,
      expiresAt: null,
      features: defaults.free.features,
      source: "defaults",
      error: msg,
    };
  }

  const userRow = asRecord(userRes.data);
  const status = readString(userRow?.status).toLowerCase();
  const subscriptionId = readNullableString(userRow?.subscription_id);
  const expiresAt = readNullableString(userRow?.expires_at);

  const activePaid = status === "active" && !!subscriptionId && !isExpired(expiresAt);

  if (!activePaid) {
    // Best-effort: try to read the free plan definition from Supabase so admin changes apply.
    const freeRes = await getFreePlanFromSupabase();
    if (freeRes.ok) {
      return {
        planCode: freeRes.planCode,
        planName: freeRes.planName,
        expiresAt: null,
        features: freeRes.features,
        source: "supabase",
      };
    }

    return {
      planCode: "free",
      planName: defaults.free.name,
      expiresAt: null,
      features: defaults.free.features,
      source: "defaults",
      error: freeRes.error,
    };
  }

  const planRes = await supabase.from("subscriptions").select("code,name,features").eq("id", subscriptionId).maybeSingle();

  if (planRes.error) {
    const msg = planRes.error.message ?? "Failed to load plan";
    if (isMissingTableError(msg, "subscriptions")) {
      return {
        planCode: "free",
        planName: defaults.free.name,
        expiresAt,
        features: defaults.free.features,
        source: "defaults",
        error: "Subscriptions are not configured in Supabase yet (missing subscriptions table).",
      };
    }

    return {
      planCode: "free",
      planName: defaults.free.name,
      expiresAt,
      features: defaults.free.features,
      source: "defaults",
      error: msg,
    };
  }

  const planRow = asRecord(planRes.data);
  if (!planRow) {
    return {
      planCode: "free",
      planName: defaults.free.name,
      expiresAt,
      features: defaults.free.features,
      source: "defaults",
      error: "Plan record not found",
    };
  }

  const planCode = coercePlanCode(planRow.code);
  const planName = readString(planRow.name) || defaults[planCode].name;
  const features = (asRecord(planRow.features) ?? (planRow.features as Record<string, unknown> | null) ?? {}) as Record<
    string,
    unknown
  >;

  return {
    planCode,
    planName,
    expiresAt: expiresAt ?? null,
    features,
    source: "supabase",
  };
}
