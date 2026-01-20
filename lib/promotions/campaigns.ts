import "server-only";

import { getSupabaseAdminClient } from "../supabase/admin";

export type PromotionContentType = "song" | "video" | "live";
export type PromotionStatus = "pending" | "approved" | "active" | "paused" | "ended" | "rejected";

export type PromotionLimits = {
  minBudgetCoins: number;
  maxBudgetCoins: number;
  maxCountries: number;
  maxActiveCampaigns: number;
};

export type PromotionCampaign = {
  id: string;
  artistUid: string;

  contentType: PromotionContentType;
  contentId: string;
  contentLabel: string | null;

  targetCountries: string[];

  budgetCoins: number;
  dailyBudgetCoins: number | null;

  status: PromotionStatus;

  impressions: number;
  clicks: number;
  spendCoins: number;
  revenueCoins: number;

  startsAt: string | null;
  endsAt: string | null;
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

function readNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => readString(v) ?? "").map((s) => s.trim()).filter(Boolean);
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

function parsePositiveInt(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

function normalizeCountries(raw: string): string[] {
  // Input: comma-separated ISO country codes (or names). Keep simple.
  return raw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => c.toUpperCase());
}

export async function getPromotionLimits(): Promise<
  { limits: PromotionLimits; source: "supabase" | "defaults"; error?: string }
> {
  const defaults: PromotionLimits = {
    minBudgetCoins: 50,
    maxBudgetCoins: 5000,
    maxCountries: 5,
    maxActiveCampaigns: 3,
  };

  const supabase = getSupabaseAdminClient();
  if (!supabase) return { limits: defaults, source: "defaults" };

  const res = await supabase
    .from("promotion_limits")
    .select("min_budget_coins,max_budget_coins,max_countries,max_active_campaigns")
    .eq("id", 1)
    .maybeSingle();

  if (res.error) {
    const msg = res.error.message ?? "Failed to load promotion limits";
    if (isMissingTableError(msg, "promotion_limits")) {
      return { limits: defaults, source: "defaults", error: "Promotion limits table is missing in Supabase." };
    }
    return { limits: defaults, source: "defaults", error: msg };
  }

  const row = asRecord(res.data);
  if (!row) return { limits: defaults, source: "supabase" };

  const limits: PromotionLimits = {
    minBudgetCoins: readNumber(row.min_budget_coins) || defaults.minBudgetCoins,
    maxBudgetCoins: readNumber(row.max_budget_coins) || defaults.maxBudgetCoins,
    maxCountries: readNumber(row.max_countries) || defaults.maxCountries,
    maxActiveCampaigns: readNumber(row.max_active_campaigns) || defaults.maxActiveCampaigns,
  };

  return { limits, source: "supabase" };
}

export async function listPromotionCampaignsForArtist(
  artistUid: string,
  limit = 20,
): Promise<{ campaigns: PromotionCampaign[]; source: "supabase" | "none"; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { campaigns: [], source: "none" };

  const res = await supabase
    .from("promotion_campaigns")
    .select(
      "id,artist_uid,content_type,content_id,content_label,target_countries,budget_coins,daily_budget_coins,status,impressions,clicks,spend_coins,revenue_coins,starts_at,ends_at,created_at",
    )
    .eq("artist_uid", artistUid)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (res.error) {
    const msg = res.error.message ?? "Failed to load campaigns";
    if (isMissingTableError(msg, "promotion_campaigns")) {
      return {
        campaigns: [],
        source: "none",
        error: "Promotions are not configured in Supabase yet (missing promotion_campaigns table).",
      };
    }
    return { campaigns: [], source: "none", error: msg };
  }

  const rows = (res.data ?? []).map(asRecord).filter((r): r is UnknownRecord => r !== null);

  const campaigns: PromotionCampaign[] = rows.map((r) => {
    const ctRaw = (readString(r.content_type) ?? "song").toLowerCase();
    const contentType: PromotionContentType = ctRaw === "video" || ctRaw === "live" ? (ctRaw as PromotionContentType) : "song";

    const statusRaw = (readString(r.status) ?? "pending").toLowerCase();
    const status: PromotionStatus =
      statusRaw === "approved" ||
      statusRaw === "active" ||
      statusRaw === "paused" ||
      statusRaw === "ended" ||
      statusRaw === "rejected"
        ? (statusRaw as PromotionStatus)
        : "pending";

    return {
      id: readString(r.id) ?? "",
      artistUid: readString(r.artist_uid) ?? artistUid,

      contentType,
      contentId: readString(r.content_id) ?? "",
      contentLabel: readString(r.content_label),

      targetCountries: readStringArray(r.target_countries),

      budgetCoins: readNumber(r.budget_coins),
      dailyBudgetCoins: r.daily_budget_coins == null ? null : readNumber(r.daily_budget_coins),

      status,

      impressions: readNumber(r.impressions),
      clicks: readNumber(r.clicks),
      spendCoins: readNumber(r.spend_coins),
      revenueCoins: readNumber(r.revenue_coins),

      startsAt: readString(r.starts_at),
      endsAt: readString(r.ends_at),
      createdAt: readString(r.created_at) ?? new Date().toISOString(),
    };
  });

  return { campaigns, source: "supabase" };
}

export type CreatePromotionCampaignInput = {
  contentType: PromotionContentType;
  contentId: string;
  contentLabel?: string;
  targetCountriesCsv: string;
  budgetCoins: number;
  dailyBudgetCoins?: number;
  startsAtIso?: string;
  endsAtIso?: string;
};

export async function createPromotionCampaignForArtist(
  artistUid: string,
  input: CreatePromotionCampaignInput,
): Promise<
  | { ok: true; id: string }
  | { ok: false; reason: "not_configured" | "table_missing" | "invalid" | "limits" | "unknown"; message: string }
> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const limitsRes = await getPromotionLimits();
  const limits = limitsRes.limits;

  const contentId = input.contentId.trim();
  if (!contentId) return { ok: false, reason: "invalid", message: "Content ID is required." };

  const budgetCoins = parsePositiveInt(input.budgetCoins);
  if (!budgetCoins) return { ok: false, reason: "invalid", message: "Budget (coins) must be a positive integer." };

  if (budgetCoins < limits.minBudgetCoins) {
    return { ok: false, reason: "limits", message: `Minimum budget is ${limits.minBudgetCoins} coins.` };
  }

  if (budgetCoins > limits.maxBudgetCoins) {
    return { ok: false, reason: "limits", message: `Maximum budget is ${limits.maxBudgetCoins} coins.` };
  }

  const targetCountries = normalizeCountries(input.targetCountriesCsv);
  if (targetCountries.length === 0) {
    return { ok: false, reason: "invalid", message: "Add at least one target country (comma separated)." };
  }

  if (targetCountries.length > limits.maxCountries) {
    return { ok: false, reason: "limits", message: `You can target up to ${limits.maxCountries} countries.` };
  }

  const dailyBudgetCoins = input.dailyBudgetCoins ? parsePositiveInt(input.dailyBudgetCoins) : null;
  if (dailyBudgetCoins && dailyBudgetCoins > budgetCoins) {
    return { ok: false, reason: "invalid", message: "Daily budget cannot exceed total budget." };
  }

  // Active campaign count limit (best-effort)
  const activeCountRes = await supabase
    .from("promotion_campaigns")
    .select("id", { count: "exact", head: true })
    .eq("artist_uid", artistUid)
    .in("status", ["pending", "approved", "active", "paused"]);

  if (activeCountRes.error) {
    const msg = activeCountRes.error.message ?? "Failed to validate limits";
    if (isMissingTableError(msg, "promotion_campaigns")) {
      return { ok: false, reason: "table_missing", message: "Supabase table promotion_campaigns is missing. Create it to enable promotions." };
    }
    // If count fails for other reasons, don't block creation; proceed.
  } else {
    const count = activeCountRes.count ?? 0;
    if (count >= limits.maxActiveCampaigns) {
      return {
        ok: false,
        reason: "limits",
        message: `You have reached the maximum of ${limits.maxActiveCampaigns} active/pending campaigns.`,
      };
    }
  }

  const startsAt = input.startsAtIso ? new Date(input.startsAtIso) : null;
  if (startsAt && Number.isNaN(startsAt.getTime())) {
    return { ok: false, reason: "invalid", message: "Start date/time is invalid." };
  }

  const endsAt = input.endsAtIso ? new Date(input.endsAtIso) : null;
  if (endsAt && Number.isNaN(endsAt.getTime())) {
    return { ok: false, reason: "invalid", message: "End date/time is invalid." };
  }

  if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
    return { ok: false, reason: "invalid", message: "End date/time must be after start." };
  }

  const payload = {
    artist_uid: artistUid,
    content_type: input.contentType,
    content_id: contentId,
    content_label: (input.contentLabel ?? "").trim() || null,
    target_countries: targetCountries,
    budget_coins: budgetCoins,
    daily_budget_coins: dailyBudgetCoins,
    status: "pending" satisfies PromotionStatus,
    starts_at: startsAt ? startsAt.toISOString() : null,
    ends_at: endsAt ? endsAt.toISOString() : null,
  };

  const res = await supabase.from("promotion_campaigns").insert(payload).select("id").single();

  if (res.error) {
    const msg = res.error.message ?? "Failed to create campaign";
    if (isMissingTableError(msg, "promotion_campaigns")) {
      return { ok: false, reason: "table_missing", message: "Supabase table promotion_campaigns is missing. Create it to enable promotions." };
    }
    return { ok: false, reason: "unknown", message: msg };
  }

  const rec = asRecord(res.data);
  const id = rec ? readString(rec.id) : null;
  return { ok: true, id: id ?? "" };
}
