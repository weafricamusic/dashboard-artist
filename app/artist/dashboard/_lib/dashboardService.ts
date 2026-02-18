import "server-only";

import { getFirebaseAdminFirestore } from "../../../../lib/firebase/firestore";
import {
  getEarningsSummaryForArtist,
  getGeoBreakdownForArtist,
  getPerContentStatsForArtist,
  getLiveViewsAllTimeForArtist,
  getStreamsTrendForArtist,
} from "../../../../lib/analytics/insights";
import { listSongs } from "../../../../lib/content/songs";
import { listVideos } from "../../../../lib/content/videos";

function safeTime(value: string | null | undefined): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

export async function getContentStats(artistUid: string) {
  try {
    const db = getFirebaseAdminFirestore();
    if (!db) return null;

    const [songs, videos, liveViewsAllTime] = await Promise.all([
      listSongs(artistUid),
      listVideos(artistUid),
      getLiveViewsAllTimeForArtist(artistUid),
    ]);

    const totalSongPlays = songs.reduce((sum, s) => sum + (s.plays ?? 0), 0);
    const totalVideoPlays = videos.reduce((sum, v) => sum + (v.views ?? 0), 0);
    const totalSongLikes = songs.reduce((sum, s) => sum + (s.likes ?? 0), 0);
    const totalVideoLikes = videos.reduce((sum, v) => sum + (v.likes ?? 0), 0);

    const songItems = songs.map((s) => ({
      id: s.id,
      title: s.title,
      type: "song" as const,
      views: s.plays,
      likes: s.likes,
      comments: s.comments,
      createdAt: s.createdAt,
    }));

    const videoItems = videos.map((v) => ({
      id: v.id,
      title: v.title,
      type: "video" as const,
      views: v.views,
      likes: v.likes,
      comments: v.comments,
      createdAt: v.createdAt,
    }));

    const items = [...songItems, ...videoItems]
      .sort((a, b) => safeTime(b.createdAt) - safeTime(a.createdAt))
      .slice(0, 20);

    return {
      items,
      totalSongs: songs.length,
      totalVideos: videos.length,
      totalPlays:
        totalSongPlays +
        totalVideoPlays +
        (typeof liveViewsAllTime.total === "number" ? liveViewsAllTime.total : 0),
      totalLikes: totalSongLikes + totalVideoLikes,
      liveViewsAllTime: liveViewsAllTime.total,
    };
  } catch (err) {
    console.error("Content stats error:", err);
    return null;
  }
}

export async function getEarningsStats(artistUid: string) {
  try {
    const summary = await getEarningsSummaryForArtist(artistUid);

    return {
      totalCoins: summary.coins.allTime,
      coins30d: summary.coins.month,
      pendingCoins: null,
    };
  } catch (err) {
    console.error("Earnings stats error:", err);
    return null;
  }
}

export async function getTopContent(artistUid: string, days = 7) {
  try {
    const db = getFirebaseAdminFirestore();
    if (!db) return null;

    const sinceTime = Date.now() - days * 24 * 60 * 60 * 1000;
    const [songs, videos] = await Promise.all([listSongs(artistUid), listVideos(artistUid)]);

    const candidates = [
      ...songs.map((s) => ({
        id: s.id,
        title: s.title,
        type: "song" as const,
        createdAt: s.createdAt,
        plays: s.plays,
        likes: s.likes,
      })),
      ...videos.map((v) => ({
        id: v.id,
        title: v.title,
        type: "video" as const,
        createdAt: v.createdAt,
        plays: v.views,
        likes: v.likes,
      })),
    ].filter((c) => safeTime(c.createdAt) >= sinceTime);

    if (candidates.length === 0) return null;

    const top = candidates.sort((a, b) => b.plays - a.plays)[0];
    if (!top) return null;

    return {
      id: top.id,
      title: top.title,
      type: top.type,
      plays: top.plays,
      likes: top.likes,
    };
  } catch (err) {
    console.error("Top content error:", err);
    return null;
  }
}

export async function getAudienceDemographics(artistUid: string, limit = 5) {
  try {
    const geo = await getGeoBreakdownForArtist(artistUid, 30);
    if (geo.source === "none") return null;

    return (geo.countries ?? [])
      .map((c) => ({ country: c.label, listeners: c.count }))
      .slice(0, limit);
  } catch (err) {
    console.error("Demographics error:", err);
    return null;
  }
}

export async function getEngagementMetrics(artistUid: string) {
  try {
    const [trend7d, trend30d, trend60d, perContent30d] = await Promise.all([
      getStreamsTrendForArtist(artistUid, 7),
      getStreamsTrendForArtist(artistUid, 30),
      getStreamsTrendForArtist(artistUid, 60),
      getPerContentStatsForArtist(artistUid, 30),
    ]);

    const allStats = Object.values(perContent30d.songs).concat(Object.values(perContent30d.videos));
    const likes30d = perContent30d.source === "none" ? null : allStats.reduce((sum, s) => sum + (s.likes ?? 0), 0);
    const comments30d =
      perContent30d.source === "none" ? null : allStats.reduce((sum, s) => sum + (s.comments ?? 0), 0);

    let monthlyGrowthPct: number | null = null;
    if (trend30d.source !== "none" && trend60d.source !== "none") {
      const current = trend30d.total;
      const total60 = trend60d.total;
      if (current !== null && total60 !== null) {
        const prev = total60 - current;
        if (prev > 0) {
          monthlyGrowthPct = ((current - prev) / prev) * 100;
        }
      }
    }

    return {
      plays7d: trend7d.total,
      plays30d: trend30d.total,
      likes30d,
      comments30d,
      monthlyGrowthPct,
    };
  } catch (err) {
    console.error("Engagement metrics error:", err);
    return null;
  }
}
