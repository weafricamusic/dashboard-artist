import "server-only";

import { getSupabaseAdminClient } from "../supabase/admin";

export type SubscriptionPlanCode = "free" | "pro" | "elite" | "premium" | "platinum";

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

function deepMergeRecords(base: UnknownRecord, override: UnknownRecord): UnknownRecord {
  const out: UnknownRecord = { ...base };

  for (const [key, overrideValue] of Object.entries(override)) {
    const baseValue = out[key];

    const baseRec = asRecord(baseValue);
    const overrideRec = asRecord(overrideValue);

    if (baseRec && overrideRec) {
      out[key] = deepMergeRecords(baseRec, overrideRec);
      continue;
    }

    out[key] = overrideValue;
  }

  return out;
}

function normalizePlanFeatures(
  defaults: Record<SubscriptionPlanCode, { name: string; features: Record<string, unknown> }>,
  planCode: SubscriptionPlanCode,
  rawFeatures: Record<string, unknown>,
): Record<string, unknown> {
  const base = (defaults[planCode]?.features ?? {}) as UnknownRecord;
  const override = normalizeFlatPlanFeatures(((rawFeatures ?? {}) as UnknownRecord) ?? {});
  return deepMergeRecords(base, override);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : value == null ? null : String(value);
}

function coercePlanCode(raw: unknown): SubscriptionPlanCode {
  const v = readString(raw).toLowerCase();
  if (v === "pro" || v === "elite" || v === "premium" || v === "platinum") return v;
  return "free";
}

function isMissingTableError(message: string, table: string): boolean {
  const m = message.toLowerCase();
  const t = table.toLowerCase();

  if (m.includes("column") && m.includes("does not exist")) {
    return false;
  }

  return (
    m.includes(`relation \"${t}\" does not exist`) ||
    m.includes(`relation \"public.${t}\" does not exist`) ||
    (m.includes("relation") && m.includes(t) && m.includes("does not exist")) ||
    ((m.includes("could not find") || m.includes("unknown table") || m.includes("table")) &&
      m.includes(t) &&
      m.includes("does not exist"))
  );
}

function isMissingColumnError(message: string, column: string): boolean {
  const m = message.toLowerCase();
  const c = column.toLowerCase();
  return m.includes("column") && m.includes(c) && m.includes("does not exist");
}

function isLegacyPlanColumnMissingError(message: string): boolean {
  return isMissingColumnError(message, "subscriptions.code") || isMissingColumnError(message, "code");
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
      name: "Starter",
      features: {
        tier: "free",
        uploads: { songs: true, videos: true },
        limits: { maxSongs: 3, maxVideos: 2 },
        live: { canHost: false },
        ai: { monthlyLimit: 1, maxLengthMinutes: 1 },
        analytics: { advanced: false },
      },
    },
    pro: {
      name: "Pro",
      features: {
        tier: "pro",
        uploads: { songs: true, videos: true },
        limits: { maxSongs: -1, maxVideos: -1 },
        live: { canHost: true },
        ai: { monthlyLimit: 30, maxLengthMinutes: 3 },
        analytics: { advanced: true },
      },
    },
    elite: {
      name: "Elite",
      features: {
        tier: "elite",
        uploads: { songs: true, videos: true },
        limits: { maxSongs: -1, maxVideos: -1 },
        live: { canHost: true },
        ai: { monthlyLimit: -1, maxLengthMinutes: 5, priorityQueue: true },
        analytics: { advanced: true },
      },
    },
    premium: {
      name: "Premium",
      features: {
        tier: "premium",
        uploads: { songs: true, videos: true },
        limits: { maxSongs: 100, maxVideos: 50 },
        live: { canHost: true },
        ai: { monthlyLimit: 30, maxLengthMinutes: 3 },
        analytics: { advanced: true },
      },
    },
    platinum: {
      name: "Platinum",
      features: {
        tier: "platinum",
        uploads: { songs: true, videos: true },
        limits: { maxSongs: 1000, maxVideos: 500 },
        live: { canHost: true },
        ai: { monthlyLimit: -1, maxLengthMinutes: 5, priorityQueue: true },
        analytics: { advanced: true },
        boost: { featuredPlacement: true },
      },
    },
  };
}

function readNullableNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === 1) return true;
  if (value === "false" || value === "0" || value === 0) return false;
  return null;
}

function normalizeFlatPlanFeatures(raw: UnknownRecord): UnknownRecord {
  const out: UnknownRecord = { ...raw };

  const maxSongs = readNullableNumber(raw.max_songs);
  const maxVideos = readNullableNumber(raw.max_videos);
  const canHostLive = readBool(raw.can_host_live);
  const aiMonthlyLimit = readNullableNumber(raw.ai_monthly_limit);
  const aiMaxLengthMinutes = readNullableNumber(raw.ai_max_length_minutes);
  const advancedAnalytics = readBool(raw.advanced_analytics);
  const priorityAiQueue = readBool(raw.priority_ai_queue);
  const prioritySupport = readBool(raw.priority_support);
  const homepageFeature = readBool(raw.homepage_feature);

  if (maxSongs != null) {
    const limits = asRecord(out.limits) ?? {};
    out.limits = { ...limits, maxSongs };
    const uploads = asRecord(out.uploads) ?? {};
    out.uploads = { ...uploads, songs: maxSongs !== 0 };
  }

  if (maxVideos != null) {
    const limits = asRecord(out.limits) ?? {};
    out.limits = { ...limits, maxVideos };
    const uploads = asRecord(out.uploads) ?? {};
    out.uploads = { ...uploads, videos: maxVideos !== 0 };
  }

  if (canHostLive != null) {
    const live = asRecord(out.live) ?? {};
    out.live = { ...live, canHost: canHostLive };
  }

  if (aiMonthlyLimit != null || aiMaxLengthMinutes != null || priorityAiQueue != null) {
    const ai = asRecord(out.ai) ?? {};
    out.ai = {
      ...ai,
      ...(aiMonthlyLimit != null ? { monthlyLimit: aiMonthlyLimit } : null),
      ...(aiMaxLengthMinutes != null ? { maxLengthMinutes: aiMaxLengthMinutes } : null),
      ...(priorityAiQueue != null ? { priorityQueue: priorityAiQueue } : null),
    };
  }

  if (advancedAnalytics != null) {
    const analytics = asRecord(out.analytics) ?? {};
    out.analytics = { ...analytics, advanced: advancedAnalytics };
  }

  if (prioritySupport != null) {
    const support = asRecord(out.support) ?? {};
    out.support = { ...support, priority: prioritySupport };
  }

  if (homepageFeature != null) {
    const boost = asRecord(out.boost) ?? {};
    out.boost = { ...boost, homepageFeature };
  }

  // Remove the flat keys so consumers/UI see a consistent shape.
  delete out.max_songs;
  delete out.max_videos;
  delete out.can_host_live;
  delete out.ai_monthly_limit;
  delete out.ai_max_length_minutes;
  delete out.advanced_analytics;
  delete out.priority_ai_queue;
  delete out.priority_support;
  delete out.homepage_feature;

  return out;
}

async function getPlanByCodeFromPlansTable(
  planCode: SubscriptionPlanCode,
): Promise<
  | { ok: true; planCode: SubscriptionPlanCode; planName: string; features: Record<string, unknown> }
  | { ok: false; error: string; missing?: true }
> {
  const defaults = defaultPlans();
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const res = await supabase.from("plans").select("code,name,features").eq("code", planCode).maybeSingle();
  if (res.error) {
    const msg = res.error.message ?? "Failed to fetch plan";
    if (isMissingTableError(msg, "plans")) return { ok: false, error: msg, missing: true };
    return { ok: false, error: msg };
  }

  const row = asRecord(res.data);
  if (!row) return { ok: false, error: "Plan record not found" };

  const resolvedPlanCode = coercePlanCode(row.code);
  const rawFeatures =
    (asRecord(row.features) ?? (row.features as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;

  return {
    ok: true,
    planCode: resolvedPlanCode,
    planName: readString(row.name) || resolvedPlanCode,
    features: normalizePlanFeatures(defaults, resolvedPlanCode, rawFeatures),
  };
}

async function getPlanByIdFromPlansTable(
  planId: string,
): Promise<
  | { ok: true; planCode: SubscriptionPlanCode; planName: string; features: Record<string, unknown> }
  | { ok: false; error: string; missing?: true }
> {
  const defaults = defaultPlans();
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const res = await supabase.from("plans").select("code,name,features").eq("id", planId).maybeSingle();
  if (res.error) {
    const msg = res.error.message ?? "Failed to fetch plan";
    if (isMissingTableError(msg, "plans")) return { ok: false, error: msg, missing: true };
    return { ok: false, error: msg };
  }

  const row = asRecord(res.data);
  if (!row) return { ok: false, error: "Plan record not found" };

  const resolvedPlanCode = coercePlanCode(row.code);
  const rawFeatures =
    (asRecord(row.features) ?? (row.features as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;

  return {
    ok: true,
    planCode: resolvedPlanCode,
    planName: readString(row.name) || resolvedPlanCode,
    features: normalizePlanFeatures(defaults, resolvedPlanCode, rawFeatures),
  };
}

async function getFreePlanFromSupabase(): Promise<
  | { ok: true; planCode: SubscriptionPlanCode; planName: string; features: Record<string, unknown> }
  | { ok: false; error: string }
> {
  const defaults = defaultPlans();
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const plansRes = await getPlanByCodeFromPlansTable("free");
  if (plansRes.ok) {
    return plansRes;
  }
  if (!plansRes.missing && plansRes.error) {
    return { ok: false, error: plansRes.error };
  }

  const res = await supabase.from("subscriptions").select("code,name,features").eq("code", "free").maybeSingle();
  if (!res.error) {
    const row = asRecord(res.data);
    if (!row) return { ok: false, error: "Free plan record not found" };

    const planCode = coercePlanCode(row.code);
    const rawFeatures =
      (asRecord(row.features) ?? (row.features as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;

    return {
      ok: true,
      planCode,
      planName: readString(row.name) || "Free",
      features: normalizePlanFeatures(defaults, planCode, rawFeatures),
    };
  }

  const msg = res.error.message ?? "Failed to fetch free plan";
  if (!isLegacyPlanColumnMissingError(msg)) {
    return { ok: false, error: msg };
  }

  const legacyRes = await supabase
    .from("subscriptions")
    .select("code:plan_code,name:plan_name,features")
    .eq("plan_code", "free")
    .maybeSingle();
  if (legacyRes.error) return { ok: false, error: legacyRes.error.message ?? msg };

  const legacyRow = asRecord(legacyRes.data);
  if (!legacyRow) return { ok: false, error: "Free plan record not found" };

  const planCode = coercePlanCode(legacyRow.code);
  const rawFeatures =
    (asRecord(legacyRow.features) ?? (legacyRow.features as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;

  return {
    ok: true,
    planCode,
    planName: readString(legacyRow.name) || "Free",
    features: normalizePlanFeatures(defaults, planCode, rawFeatures),
  };
}

async function getPlanByCodeFromSupabase(
  planCode: SubscriptionPlanCode,
): Promise<
  | { ok: true; planCode: SubscriptionPlanCode; planName: string; features: Record<string, unknown> }
  | { ok: false; error: string }
> {
  const defaults = defaultPlans();
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const plansRes = await getPlanByCodeFromPlansTable(planCode);
  if (plansRes.ok) {
    return plansRes;
  }
  if (!plansRes.missing && plansRes.error) {
    return { ok: false, error: plansRes.error };
  }

  const res = await supabase.from("subscriptions").select("code,name,features").eq("code", planCode).maybeSingle();
  if (!res.error) {
    const row = asRecord(res.data);
    if (!row) return { ok: false, error: "Plan record not found" };

    const resolvedPlanCode = coercePlanCode(row.code);
    const rawFeatures =
      (asRecord(row.features) ?? (row.features as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;

    return {
      ok: true,
      planCode: resolvedPlanCode,
      planName: readString(row.name) || resolvedPlanCode,
      features: normalizePlanFeatures(defaults, resolvedPlanCode, rawFeatures),
    };
  }

  const msg = res.error.message ?? "Failed to fetch plan";
  if (!isLegacyPlanColumnMissingError(msg)) {
    return { ok: false, error: msg };
  }

  const legacyRes = await supabase
    .from("subscriptions")
    .select("code:plan_code,name:plan_name,features")
    .eq("plan_code", planCode)
    .maybeSingle();
  if (legacyRes.error) return { ok: false, error: legacyRes.error.message ?? msg };

  const legacyRow = asRecord(legacyRes.data);
  if (!legacyRow) return { ok: false, error: "Plan record not found" };

  const resolvedPlanCode = coercePlanCode(legacyRow.code);
  const rawFeatures =
    (asRecord(legacyRow.features) ??
      (legacyRow.features as Record<string, unknown> | null) ??
      {}) as Record<string, unknown>;

  return {
    ok: true,
    planCode: resolvedPlanCode,
    planName: readString(legacyRow.name) || resolvedPlanCode,
    features: normalizePlanFeatures(defaults, resolvedPlanCode, rawFeatures),
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

  // Preferred schema (new):
  // user_subscriptions(artist_uid text, subscription_id uuid, expires_at timestamptz)
  // Legacy schema (existing in some Supabase projects):
  // user_subscriptions(user_id text, plan_id text, ends_at timestamptz)
  // Alt schema (common/simple):
  // user_subscriptions(artist_uid text, plan_code text, expires_at timestamptz)
  let status = "";
  let subscriptionId: string | null = null;
  let planId: string | null = null;
  let planCode: string | null = null;
  let expiresAt: string | null = null;

  const preferredRes = await supabase
    .from("user_subscriptions")
    .select("subscription_id,status,expires_at,created_at")
    .eq("artist_uid", artistUid)
    .maybeSingle();

  if (preferredRes.error) {
    const msg = preferredRes.error.message ?? "Failed to load subscription";
    const needsLegacy =
      isMissingColumnError(msg, "artist_uid") ||
      isMissingColumnError(msg, "subscription_id") ||
      isMissingColumnError(msg, "expires_at");

    if (isMissingTableError(msg, "user_subscriptions")) {
      const altRes = await supabase
        .from("user_plans")
        .select("plan_code,status,expires_at,created_at")
        .eq("artist_uid", artistUid)
        .maybeSingle();

      if (altRes.error) {
        const altMsg = altRes.error.message ?? "Failed to load subscription";
        if (!isMissingTableError(altMsg, "user_plans")) {
          return {
            planCode: "free",
            planName: defaults.free.name,
            expiresAt: null,
            features: defaults.free.features,
            source: "defaults",
            error: altMsg,
          };
        }

        return {
          planCode: "free",
          planName: defaults.free.name,
          expiresAt: null,
          features: defaults.free.features,
          source: "defaults",
          error: "Subscriptions are not configured in Supabase yet (missing user_subscriptions/user_plans tables).",
        };
      }

      const altRow = asRecord(altRes.data);
      status = readString(altRow?.status).toLowerCase();
      planCode = readNullableString(altRow?.plan_code);
      expiresAt = readNullableString(altRow?.expires_at);
    }

    if (!needsLegacy) {
      return {
        planCode: "free",
        planName: defaults.free.name,
        expiresAt: null,
        features: defaults.free.features,
        source: "defaults",
        error: msg,
      };
    }

    const planCodeRes = await supabase
      .from("user_subscriptions")
      .select("plan_code,status,expires_at,created_at")
      .eq("artist_uid", artistUid)
      .maybeSingle();

    if (!planCodeRes.error) {
      const r = asRecord(planCodeRes.data);
      status = readString(r?.status).toLowerCase();
      planCode = readNullableString(r?.plan_code);
      expiresAt = readNullableString(r?.expires_at);
    } else {
      const legacyRes = await supabase
        .from("user_subscriptions")
        .select("plan_id,status,ends_at,created_at")
        .eq("user_id", artistUid)
        .maybeSingle();

      if (legacyRes.error) {
        const legacyMsg = legacyRes.error.message ?? "Failed to load subscription";
        return {
          planCode: "free",
          planName: defaults.free.name,
          expiresAt: null,
          features: defaults.free.features,
          source: "defaults",
          error: legacyMsg,
        };
      }

      const legacyRow = asRecord(legacyRes.data);
      status = readString(legacyRow?.status).toLowerCase();
      planId = readNullableString(legacyRow?.plan_id);
      expiresAt = readNullableString(legacyRow?.ends_at);
    }
  } else {
    const userRow = asRecord(preferredRes.data);
    status = readString(userRow?.status).toLowerCase();
    subscriptionId = readNullableString(userRow?.subscription_id);
    expiresAt = readNullableString(userRow?.expires_at);
  }

  const activePaid = status === "active" && (!isExpired(expiresAt));

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

  // Paid plan resolution
  // - New schema: subscription_id is a UUID that points to subscriptions(id)
  // - Legacy schema: plan_id is typically a string code (free|premium|platinum)
  let resolvedPlanCode: SubscriptionPlanCode | null = null;

  if (planCode) {
    resolvedPlanCode = coercePlanCode(planCode);
  }

  if (planId) {
    resolvedPlanCode = coercePlanCode(planId);
  }

  if (!resolvedPlanCode && subscriptionId) {
    const planFromPlans = await getPlanByIdFromPlansTable(subscriptionId);
    if (planFromPlans.ok) {
      return {
        planCode: planFromPlans.planCode,
        planName: planFromPlans.planName,
        expiresAt: expiresAt ?? null,
        features: planFromPlans.features,
        source: "supabase",
      };
    }

    let planRes = await supabase.from("subscriptions").select("code,name,features").eq("id", subscriptionId).maybeSingle();

    if (planRes.error && isLegacyPlanColumnMissingError(planRes.error.message ?? "")) {
      planRes = await supabase
        .from("subscriptions")
        .select("code:plan_code,name:plan_name,features")
        .eq("id", subscriptionId)
        .maybeSingle();
    }

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
    resolvedPlanCode = coercePlanCode(planRow?.code);
    const planName = readString(planRow?.name) || defaults[resolvedPlanCode].name;
    const rawFeatures = (asRecord(planRow?.features) ?? (planRow?.features as Record<string, unknown> | null) ?? {}) as Record<
      string,
      unknown
    >;
    const features = normalizePlanFeatures(defaults, resolvedPlanCode, rawFeatures);

    return {
      planCode: resolvedPlanCode,
      planName,
      expiresAt: expiresAt ?? null,
      features,
      source: "supabase",
    };
  }

  const finalPlanCode = resolvedPlanCode ?? "free";

  // Try to hydrate plan features from subscriptions table by code.
  const planByCode = await getPlanByCodeFromSupabase(finalPlanCode);
  if (planByCode.ok) {
    return {
      planCode: planByCode.planCode,
      planName: planByCode.planName,
      expiresAt: expiresAt ?? null,
      features: planByCode.features,
      source: "supabase",
    };
  }

  // Fallback: built-in defaults.
  const fallback = defaults[finalPlanCode];
  return {
    planCode: finalPlanCode,
    planName: fallback.name,
    expiresAt: expiresAt ?? null,
    features: fallback.features,
    source: "defaults",
    error: planByCode.error,
  };

  // unreachable
}
