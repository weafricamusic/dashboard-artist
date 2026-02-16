import "server-only";

import {
  getGeoBreakdownForArtist,
  getStreamsTrendForArtist,
  getSubscriberStatsForArtist,
} from "../analytics/insights";

export type AiInsight = {
  headline: string;
  detail: string;
};

function topMatch(labels: Array<{ label: string; count: number }>, want: string): { label: string; count: number } | null {
  const needle = want.toLowerCase();
  const found = labels.find((c) => c.label.toLowerCase() === needle);
  return found ?? null;
}

export async function buildAiManagerInsights(artistUid: string): Promise<{
  insights: AiInsight[];
  countryFocus: string;
  source: { geo: "supabase" | "none"; streams: "supabase" | "none"; subs: "supabase" | "none" };
}> {
  const [geo, streams30d, subs] = await Promise.all([
    getGeoBreakdownForArtist(artistUid, 30),
    getStreamsTrendForArtist(artistUid, 30),
    getSubscriberStatsForArtist(artistUid),
  ]);

  const insights: AiInsight[] = [];

  const malawi = topMatch(geo.countries, "Malawi");
  const topCountry = geo.countries[0] ?? null;
  const countryFocus = (malawi?.label ?? topCountry?.label ?? "Malawi").toString();

  if (malawi) {
    insights.push({
      headline: "Malawi traction",
      detail: `You have ${malawi.count.toLocaleString()} recent streams from Malawi.`,
    });
  } else if (topCountry) {
    insights.push({
      headline: "Top country",
      detail: `Most recent streams are from ${topCountry.label} (${topCountry.count.toLocaleString()}).`,
    });
  } else {
    insights.push({
      headline: "Location insights",
      detail: "Location breakdown isn’t available yet. Connect analytics events with country/city fields.",
    });
  }

  const topCity = geo.cities[0] ?? null;
  if (topCity) {
    insights.push({
      headline: "City trend",
      detail: `Your song is trending in ${topCity.label} (${topCity.count.toLocaleString()}).`,
    });
  }

  if (streams30d.total !== null) {
    insights.push({
      headline: "Streams (30d)",
      detail: `You got ${streams30d.total.toLocaleString()} streams in the last 30 days.`,
    });
  } else {
    insights.push({
      headline: "Streams (30d)",
      detail: "Streams trend isn’t available yet (Supabase analytics not configured).",
    });
  }

  // Subscribers are a proxy for fan growth.
  const growth7d = subs.newSubscribers7d;
  const growth30d = subs.newSubscribers30d;

  if (growth7d !== null) {
    insights.push({
      headline: "Fan growth",
      detail: `New subscribers: ${growth7d.toLocaleString()} (7d) • ${growth30d?.toLocaleString() ?? "—"} (30d).`,
    });
  } else {
    insights.push({
      headline: "Fan growth",
      detail: "Subscriber insights aren’t available yet (transactions table not configured).",
    });
  }

  // Best listening times (hourly) is not yet implemented in analytics helpers.
  insights.push({
    headline: "Best listening time",
    detail: "Best listening times will appear once hourly analytics is enabled.",
  });

  return {
    insights,
    countryFocus,
    source: { geo: geo.source, streams: streams30d.source, subs: subs.source },
  };
}
