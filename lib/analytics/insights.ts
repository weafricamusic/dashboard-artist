import "server-only";

import { getSupabaseAdminClient } from "../supabase/admin";

const MAX_ROWS = 10000;

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as UnknownRecord;
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function isoDay(d: Date): string {
  // YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

function daysBackIso(days: number): string {
  const now = new Date();
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function buildDaySeries(days: number): { day: string; value: number }[] {
  const now = new Date();
  const out: { day: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push({
      day: isoDay(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)),
      value: 0,
    });
  }
  return out;
}

function incrementSeries(series: { day: string; value: number }[], day: string, by = 1) {
  const idx = series.findIndex((s) => s.day === day);
  if (idx >= 0) series[idx] = { ...series[idx], value: series[idx].value + by };
}

export type DailySeriesPoint = { day: string; value: number };

export type StreamsTrend = {
  lastNDays: number;
  total: number | null;
  series: DailySeriesPoint[];
  truncated: boolean;
  source: "supabase" | "none";
};

export async function getStreamsTrendForArtist(
  artistUid: string,
  days = 30,
): Promise<StreamsTrend> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      lastNDays: days,
      total: null,
      series: buildDaySeries(days),
      truncated: false,
      source: "none",
    };
  }

  const since = daysBackIso(days);

  const res = await supabase
    .from("analytics_events")
    .select("created_at", { count: "exact" })
    .eq("event_name", "play")
    .eq("actor_type", "artist")
    .eq("actor_id", artistUid)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(MAX_ROWS);

  if (res.error) {
    return {
      lastNDays: days,
      total: null,
      series: buildDaySeries(days),
      truncated: false,
      source: "none",
    };
  }

  const series = buildDaySeries(days);
  for (const row of res.data ?? []) {
    const raw = (row as { created_at?: string | null }).created_at;
    if (!raw) continue;
    const day = raw.slice(0, 10);
    incrementSeries(series, day, 1);
  }

  return {
    lastNDays: days,
    total: res.count ?? null,
    series,
    truncated: (res.data?.length ?? 0) >= MAX_ROWS,
    source: "supabase",
  };
}

export type EarningsSummary = {
  currency: "MWK";
  coinToMwkRate: number | null;
  coins: {
    today: number | null;
    week: number | null;
    month: number | null;
    allTime: number | null;
  };
  mwk: {
    today: number | null;
    week: number | null;
    month: number | null;
    allTime: number | null;
  };
  dailyCoinsLast30d: DailySeriesPoint[];
  byTypeCoinsLast30d: { type: string; coins: number }[];
  truncated: boolean;
  source: "supabase" | "none";
};

function parseCoinToMwkRate(): number | null {
  const raw = process.env.COIN_TO_MWK_RATE;
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function sumCoins(rows: Array<UnknownRecord>): number {
  return rows.reduce((acc, r) => acc + readNumber(r.coins), 0);
}

export async function getEarningsSummaryForArtist(artistUid: string): Promise<EarningsSummary> {
  const supabase = getSupabaseAdminClient();
  const rate = parseCoinToMwkRate();

  const base: EarningsSummary = {
    currency: "MWK",
    coinToMwkRate: rate,
    coins: { today: null, week: null, month: null, allTime: null },
    mwk: { today: null, week: null, month: null, allTime: null },
    dailyCoinsLast30d: buildDaySeries(30),
    byTypeCoinsLast30d: [],
    truncated: false,
    source: supabase ? "supabase" : "none",
  };

  if (!supabase) return base;

  const now = new Date();
  const todayIso = isoDay(now);
  const since7d = daysBackIso(7);
  const since30d = daysBackIso(30);

  // Best-effort all-time: capped fetch (MAX_ROWS). If you want exact all-time sums,
  // we can add a Postgres function/view later.
  const [rows30d, rows7d, rowsAll] = await Promise.all([
    supabase
      .from("transactions")
      .select("coins,created_at,type")
      .eq("target_type", "artist")
      .eq("target_id", artistUid)
      .gte("created_at", since30d)
      .order("created_at", { ascending: true })
      .limit(MAX_ROWS),
    supabase
      .from("transactions")
      .select("coins,created_at")
      .eq("target_type", "artist")
      .eq("target_id", artistUid)
      .gte("created_at", since7d)
      .limit(MAX_ROWS),
    supabase
      .from("transactions")
      .select("coins")
      .eq("target_type", "artist")
      .eq("target_id", artistUid)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS),
  ]);

  if (rows30d.error || rows7d.error || rowsAll.error) return { ...base, source: "none" };

  const allTruncated =
    (rows30d.data?.length ?? 0) >= MAX_ROWS ||
    (rows7d.data?.length ?? 0) >= MAX_ROWS ||
    (rowsAll.data?.length ?? 0) >= MAX_ROWS;

  const rows30dRecords = (rows30d.data ?? []).map(asRecord).filter((r): r is UnknownRecord => r !== null);
  const rows7dRecords = (rows7d.data ?? []).map(asRecord).filter((r): r is UnknownRecord => r !== null);
  const rowsAllRecords = (rowsAll.data ?? []).map(asRecord).filter((r): r is UnknownRecord => r !== null);

  const coins30d = sumCoins(rows30dRecords);
  const coins7d = sumCoins(rows7dRecords);
  const coinsAll = sumCoins(rowsAllRecords);
  const coinsToday = sumCoins(
    rows30dRecords.filter((r) => {
      const createdAt = readString(r.created_at);
      return !!createdAt && createdAt.slice(0, 10) === todayIso;
    }),
  );

  const daily = buildDaySeries(30);
  const byType = new Map<string, number>();

  for (const row of rows30dRecords) {
    const createdAt = readString(row.created_at);
    if (createdAt) incrementSeries(daily, createdAt.slice(0, 10), readNumber(row.coins));

    const type = String(row.type ?? "unknown");
    const current = byType.get(type) ?? 0;
    const add = readNumber(row.coins);
    byType.set(type, current + add);
  }

  const byTypeCoinsLast30d = Array.from(byType.entries())
    .map(([type, coins]) => ({ type, coins }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 8);

  const coins = {
    today: Number.isFinite(coinsToday) ? coinsToday : null,
    week: Number.isFinite(coins7d) ? coins7d : null,
    month: Number.isFinite(coins30d) ? coins30d : null,
    allTime: Number.isFinite(coinsAll) ? coinsAll : null,
  };

  const mwk = {
    today: rate ? (coins.today ?? 0) * rate : null,
    week: rate ? (coins.week ?? 0) * rate : null,
    month: rate ? (coins.month ?? 0) * rate : null,
    allTime: rate ? (coins.allTime ?? 0) * rate : null,
  };

  return {
    ...base,
    coins,
    mwk,
    dailyCoinsLast30d: daily,
    byTypeCoinsLast30d,
    truncated: allTruncated,
    source: "supabase",
  };
}

export type TopSupporter = {
  fanId: string;
  coins: number;
  lastSeenAt: string | null;
};

export async function getSubscriberStatsForArtist(
  artistUid: string,
): Promise<{
  newSubscribers7d: number | null;
  newSubscribers30d: number | null;
  source: "supabase" | "none";
}> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { newSubscribers7d: null, newSubscribers30d: null, source: "none" };

  const [rows7d, rows30d] = await Promise.all([
    supabase
      .from("transactions")
      .select("actor_id")
      .eq("target_type", "artist")
      .eq("target_id", artistUid)
      .eq("type", "subscription")
      .gte("created_at", daysBackIso(7))
      .limit(MAX_ROWS),
    supabase
      .from("transactions")
      .select("actor_id")
      .eq("target_type", "artist")
      .eq("target_id", artistUid)
      .eq("type", "subscription")
      .gte("created_at", daysBackIso(30))
      .limit(MAX_ROWS),
  ]);

  if (rows7d.error || rows30d.error) {
    return { newSubscribers7d: null, newSubscribers30d: null, source: "none" };
  }

  const rows7dRecords = (rows7d.data ?? []).map(asRecord).filter((r): r is UnknownRecord => r !== null);
  const rows30dRecords = (rows30d.data ?? []).map(asRecord).filter((r): r is UnknownRecord => r !== null);

  const distinct7d = new Set(
    rows7dRecords
      .map((r) => r.actor_id)
      .filter((v): v is string => typeof v === "string" && v.length > 0),
  );

  const distinct30d = new Set(
    rows30dRecords
      .map((r) => r.actor_id)
      .filter((v): v is string => typeof v === "string" && v.length > 0),
  );

  return {
    newSubscribers7d: distinct7d.size,
    newSubscribers30d: distinct30d.size,
    source: "supabase",
  };
}

export async function getLiveDonationsForArtist(
  artistUid: string,
  days = 30,
): Promise<{
  coins: number | null;
  donationsCount: number | null;
  source: "supabase" | "none";
}> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { coins: null, donationsCount: null, source: "none" };

  const since = daysBackIso(days);

  // Best-effort: treat any transaction type containing "live" as a live donation.
  const rows = await supabase
    .from("transactions")
    .select("coins,type")
    .eq("target_type", "artist")
    .eq("target_id", artistUid)
    .gte("created_at", since)
    .limit(MAX_ROWS);

  if (rows.error) return { coins: null, donationsCount: null, source: "none" };

  const liveRows = (rows.data ?? [])
    .map(asRecord)
    .filter((r): r is UnknownRecord => r !== null)
    .filter((r) => {
      const type = readString(r.type);
      return !!type && type.toLowerCase().includes("live");
    });

  return {
    coins: Number.isFinite(sumCoins(liveRows)) ? sumCoins(liveRows) : null,
    donationsCount: liveRows.length,
    source: "supabase",
  };
}

export async function getTopSupportersForArtist(
  artistUid: string,
  days = 30,
): Promise<{ supporters: TopSupporter[]; truncated: boolean; source: "supabase" | "none" }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { supporters: [], truncated: false, source: "none" };

  const since = daysBackIso(days);

  const rows = await supabase
    .from("transactions")
    .select("actor_id,coins,created_at,type")
    .eq("target_type", "artist")
    .eq("target_id", artistUid)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);

  if (rows.error) return { supporters: [], truncated: false, source: "none" };

  const map = new Map<string, { coins: number; lastSeenAt: string | null }>();
  const rowRecords = (rows.data ?? []).map(asRecord).filter((r): r is UnknownRecord => r !== null);

  for (const r of rowRecords) {
    const actorId = readString(r.actor_id);
    if (typeof actorId !== "string" || actorId.length === 0) continue;

    const existing = map.get(actorId) ?? { coins: 0, lastSeenAt: null };
    const add = readNumber(r.coins);
    const createdAt = readString(r.created_at);

    map.set(actorId, {
      coins: existing.coins + add,
      lastSeenAt: existing.lastSeenAt ?? createdAt,
    });
  }

  const supporters = Array.from(map.entries())
    .map(([fanId, v]) => ({ fanId, coins: v.coins, lastSeenAt: v.lastSeenAt }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 10);

  return {
    supporters,
    truncated: (rows.data?.length ?? 0) >= MAX_ROWS,
    source: "supabase",
  };
}

export type GeoBreakdownRow = { label: string; count: number };

export async function getGeoBreakdownForArtist(
  artistUid: string,
  days = 30,
): Promise<{ countries: GeoBreakdownRow[]; cities: GeoBreakdownRow[]; source: "supabase" | "none" }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { countries: [], cities: [], source: "none" };

  const since = daysBackIso(days);

  // We don't have the exact schema here, so we try a few common column naming conventions.
  const attempts: Array<{ country: string; city: string }> = [
    { country: "country", city: "city" },
    { country: "country_code", city: "city" },
    { country: "geo_country", city: "geo_city" },
    { country: "ip_country", city: "ip_city" },
  ];

  for (const a of attempts) {
    const res = await supabase
      .from("analytics_events")
      .select(`created_at,${a.country},${a.city}`)
      .eq("event_name", "play")
      .eq("actor_type", "artist")
      .eq("actor_id", artistUid)
      .gte("created_at", since)
      .limit(MAX_ROWS);

    if (res.error) continue;

    const countryCounts = new Map<string, number>();
    const cityCounts = new Map<string, number>();

    for (const row of (res.data ?? []).map(asRecord).filter((r): r is UnknownRecord => r !== null)) {
      const countryRaw = row[a.country];
      const cityRaw = row[a.city];

      const country = typeof countryRaw === "string" && countryRaw.trim().length ? countryRaw.trim() : null;
      const city = typeof cityRaw === "string" && cityRaw.trim().length ? cityRaw.trim() : null;

      if (country) countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);
      if (city) cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
    }

    const countries = Array.from(countryCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((x, y) => y.count - x.count)
      .slice(0, 10);

    const cities = Array.from(cityCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((x, y) => y.count - x.count)
      .slice(0, 10);

    return { countries, cities, source: "supabase" };
  }

  return { countries: [], cities: [], source: "none" };
}

export type ContentEventStats = {
  streams: number;
  likes: number;
  comments: number;
  shares: number;
};

export type PerContentStatsResult = {
  songs: Record<string, ContentEventStats>;
  videos: Record<string, ContentEventStats>;
  truncated: boolean;
  source: "supabase" | "none";
  usedColumns: { kind: "pair" | "single"; typeCol?: string; idCol: string } | null;
};

function emptyStats(): ContentEventStats {
  return { streams: 0, likes: 0, comments: 0, shares: 0 };
}

function normalizeKind(raw: unknown): "song" | "video" | null {
  if (typeof raw !== "string") return null;
  const v = raw.toLowerCase();
  if (v.includes("song") || v.includes("track") || v.includes("audio")) return "song";
  if (v.includes("video")) return "video";
  return null;
}

function normalizeEventToField(raw: unknown): keyof ContentEventStats | null {
  if (typeof raw !== "string") return null;
  const e = raw.toLowerCase();
  if (e === "play" || e === "stream" || e === "view" || e === "watch") return "streams";
  if (e === "like") return "likes";
  if (e === "comment") return "comments";
  if (e === "share") return "shares";
  return null;
}

export async function getPerContentStatsForArtist(
  artistUid: string,
  days = 30,
): Promise<PerContentStatsResult> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { songs: {}, videos: {}, truncated: false, source: "none", usedColumns: null };
  }

  const since = daysBackIso(days);
  const eventNames = ["play", "stream", "view", "watch", "like", "comment", "share"];

  const pairAttempts: Array<{ typeCol: string; idCol: string }> = [
    { typeCol: "content_type", idCol: "content_id" },
    { typeCol: "entity_type", idCol: "entity_id" },
    { typeCol: "item_type", idCol: "item_id" },
    { typeCol: "target_type", idCol: "target_id" },
  ];

  const singleAttempts: Array<{ kind: "song" | "video"; idCol: string }> = [
    { kind: "song", idCol: "song_id" },
    { kind: "song", idCol: "track_id" },
    { kind: "video", idCol: "video_id" },
  ];

  const songs: Record<string, ContentEventStats> = {};
  const videos: Record<string, ContentEventStats> = {};
  let truncated = false;

  const applyRow = (kind: "song" | "video", id: string, field: keyof ContentEventStats) => {
    const bucket = kind === "song" ? songs : videos;
    const current = bucket[id] ?? emptyStats();
    bucket[id] = { ...current, [field]: current[field] + 1 };
  };

  // Attempt 1: one row contains (type, id) fields.
  for (const a of pairAttempts) {
    const res = await supabase
      .from("analytics_events")
      .select(`event_name,created_at,${a.typeCol},${a.idCol}`)
      .eq("actor_type", "artist")
      .eq("actor_id", artistUid)
      .in("event_name", eventNames)
      .gte("created_at", since)
      .limit(MAX_ROWS);

    if (res.error) continue;

    truncated = truncated || (res.data?.length ?? 0) >= MAX_ROWS;
    for (const row of (res.data ?? []).map(asRecord).filter((r): r is UnknownRecord => r !== null)) {
      const kind = normalizeKind(row[a.typeCol]);
      if (!kind) continue;
      const id = row[a.idCol];
      if (typeof id !== "string" || id.length === 0) continue;
      const field = normalizeEventToField(row.event_name);
      if (!field) continue;
      applyRow(kind, id, field);
    }

    return {
      songs,
      videos,
      truncated,
      source: "supabase",
      usedColumns: { kind: "pair", typeCol: a.typeCol, idCol: a.idCol },
    };
  }

  // Attempt 2: separate id column per kind.
  for (const a of singleAttempts) {
    const res = await supabase
      .from("analytics_events")
      .select(`event_name,created_at,${a.idCol}`)
      .eq("actor_type", "artist")
      .eq("actor_id", artistUid)
      .in("event_name", eventNames)
      .gte("created_at", since)
      .limit(MAX_ROWS);

    if (res.error) continue;

    truncated = truncated || (res.data?.length ?? 0) >= MAX_ROWS;
    for (const row of (res.data ?? []).map(asRecord).filter((r): r is UnknownRecord => r !== null)) {
      const id = row[a.idCol];
      if (typeof id !== "string" || id.length === 0) continue;
      const field = normalizeEventToField(row.event_name);
      if (!field) continue;
      applyRow(a.kind, id, field);
    }

    // Do not early-return; we might successfully read both songs and videos from different columns.
  }

  if (Object.keys(songs).length > 0 || Object.keys(videos).length > 0) {
    return {
      songs,
      videos,
      truncated,
      source: "supabase",
      usedColumns: { kind: "single", idCol: Object.keys(songs).length > 0 ? "song_id/track_id" : "video_id" },
    };
  }

  return { songs: {}, videos: {}, truncated: false, source: "none", usedColumns: null };
}
