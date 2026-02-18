import "server-only";

import { getSupabaseAdminClient } from "../supabase/admin";

export type LegalDocSlug = "terms" | "platform-policy" | "copyright";

export type LegalDocument = {
  slug: LegalDocSlug;
  title: string;
  version: number;
  content: string;
  updatedAt: string | null;
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

function readInt(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function normalizeLegalContent(value: string): string {
  if (!value) return "";

  let content = value.replace(/\r\n/g, "\n");

  if (content.includes("\\n") || content.includes("\\t")) {
    content = content.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
  }

  content = content.replace(/^\s{0,3}#{1,6}\s+/gm, "");

  return content.trim();
}

const TERMS_CONTENT = `WeAfrica Music – Artist Terms of Service

Last updated: 2026-02-16

1. Acceptance of Terms
By creating an artist account and uploading content on WeAfrica Music, you agree to be legally bound by these Terms of Service. If you do not agree, do not use the platform.

2. Eligibility
You must be at least 18 years old, or have parental/legal guardian consent. You agree to provide accurate personal and payment information and to keep it up to date.

3. Artist Responsibilities
As an artist, you agree that:
- You own or control the necessary rights to the content you upload, and you have permission to distribute it.
- Your content does not infringe copyright, trademark, privacy, or other rights.
- Your content does not contain illegal material and does not promote hate, violence, terrorism, or abuse.
- You will not manipulate plays/streams, use bots, or engage in fraudulent activity.

4. Content Ownership & License
Artists retain ownership of their music, videos, artwork, and related content.

By uploading content, you grant WeAfrica Music a non-exclusive, worldwide, royalty-free license to host, stream, reproduce (as necessary for technical delivery), promote, and distribute your content on the platform and in marketing for the platform.

This license ends for a piece of content when you remove it from the platform, except to the extent copies are required for legal compliance, backups, dispute resolution, or to complete ongoing transactions.

5. Monetization & Earnings
Artists may earn through coins, ads, subscriptions, live battles, and other monetization features offered by WeAfrica Music.

WeAfrica Music may deduct platform fees, payment processing charges, refunds/chargebacks, and taxes/withholding where applicable.

Currency conversion disclaimer: payouts may involve currency conversion (including MWK and other currencies). Exchange rates and fees may vary and are not guaranteed by WeAfrica Music.

Tax responsibility: you are responsible for your own tax obligations related to your earnings unless required by law for WeAfrica Music or its payment partners to withhold or report amounts.

6. Account Suspension / Termination
WeAfrica Music may suspend or terminate accounts and/or remove content if copyright violations occur, fraudulent activity is detected, the platform is abused, or these Terms or platform policies are violated.

7. Changes to Terms
WeAfrica Music may update these Terms at any time. Continued use of the platform after updates constitutes acceptance of the updated Terms.`;

const PLATFORM_POLICY_CONTENT = `WeAfrica Music Content & Community Policy

Last updated: 2026-02-16

This policy applies to uploaded content (songs, videos, artwork, descriptions) and live streaming (including live battles).

1. Prohibited Content
Artists may NOT upload or stream content that includes:
- Copyrighted music/videos you do not own or have permission to distribute
- Pornographic or sexually explicit content
- Extreme violence or graphic harm
- Hate speech, harassment, or targeted abuse
- Political extremism or terrorist propaganda
- Scams, fraud, or misleading content
- Illegal content (including content that facilitates illegal activity)

2. Sensitive Content
Some sensitive content may be allowed with restrictions, including mild profanity, emotional themes, breakup songs, and diss tracks that do not include threats or targeted harassment. WeAfrica Music may limit distribution, remove, or age-restrict content at its discretion.

3. Live Streaming & Live Battle Rules
During live streaming, you must not:
- Show nudity or sexually explicit content
- Harass, threaten, or abuse others
- Encourage violence or self-harm
- Engage in fake gifting, ranking manipulation, or coordinated fraud

Violations may result in live suspension, monetization removal, account restrictions, or permanent bans.

4. Fake Streams & Fraud
WeAfrica Music strictly prohibits buying fake streams, using bots, artificial boosting, or any manipulation of platform metrics. Accounts caught may be permanently banned and earnings forfeited where allowed by law.

5. Enforcement
WeAfrica Music may remove content, restrict features, limit distribution, or suspend accounts based on enforcement needs. Repeated violations may result in permanent removal from the platform.`;

const COPYRIGHT_CONTENT = `WeAfrica Music Copyright & Takedown Policy

Last updated: 2026-02-16

WeAfrica Music is a hosting platform for user-uploaded content and does not claim ownership of artists’ uploaded content.

1. Copyright Ownership
Artists must only upload content they:
- Created themselves, or
- Have written permission to distribute, or
- Have purchased/licensed appropriate rights to distribute

2. Reporting Copyright Infringement
If you believe your copyright is being infringed, submit a notice with:
- Full legal name
- Contact information
- Link to the original copyrighted work
- Link to the allegedly infringing content on WeAfrica Music
- Statement of good faith belief that use is not authorized
- Statement that the information is accurate
- Digital signature

Email: copyright@weafricamusic.com

3. Takedown Process
Upon receiving a valid complaint, WeAfrica Music may remove or disable access to the content and notify the uploader. The uploader may submit a counter-notice where applicable.

4. Counter-Notice
A counter-notice should include:
- Full legal name
- Contact information
- Identification of the removed content
- Statement under penalty of perjury that removal was a mistake or misidentification
- Consent to applicable jurisdiction where required
- Digital signature

5. Repeat Infringer Policy
Artists with repeated copyright violations may lose monetization, have their account suspended, or be permanently banned.`;

function slugCandidates(slug: LegalDocSlug): string[] {
  switch (slug) {
    case "terms":
      return ["terms", "terms-of-service", "tos"];
    case "platform-policy":
      return ["platform-policy", "platform_policy", "community-policy", "content-policy"];
    case "copyright":
      return ["copyright", "copyright-policy", "copyright_policy", "dmca"];
  }
}

function titleKeywords(slug: LegalDocSlug): string[] {
  switch (slug) {
    case "terms":
      return ["terms"];
    case "platform-policy":
      return ["platform", "community", "content policy"];
    case "copyright":
      return ["copyright", "takedown"];
  }
}

function mapRowToDocument(row: UnknownRecord, fallback: Omit<LegalDocument, "source" | "error">): LegalDocument {
  const content = normalizeLegalContent(readString(row.content));

  return {
    slug: fallback.slug,
    title: readString(row.title) || fallback.title,
    version: readInt(row.version, fallback.version),
    content: content || fallback.content,
    updatedAt: readString(row.updated_at) || null,
    source: "supabase",
  };
}

function defaults(): Record<LegalDocSlug, Omit<LegalDocument, "source" | "error">> {
  return {
    terms: {
      slug: "terms",
      title: "WeAfrica Music – Artist Terms of Service",
      version: 1,
      content: TERMS_CONTENT,
      updatedAt: null,
    },
    "platform-policy": {
      slug: "platform-policy",
      title: "WeAfrica Music Content & Community Policy",
      version: 1,
      content: PLATFORM_POLICY_CONTENT,
      updatedAt: null,
    },
    copyright: {
      slug: "copyright",
      title: "WeAfrica Music Copyright & Takedown Policy",
      version: 1,
      content: COPYRIGHT_CONTENT,
      updatedAt: null,
    },
  };
}

export async function getLegalDocument(slug: LegalDocSlug): Promise<LegalDocument> {
  const supabase = getSupabaseAdminClient();
  const d = defaults()[slug];

  if (!supabase) {
    return {
      ...d,
      source: "defaults",
      error: "Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const res = await supabase.from("legal_documents").select("slug,title,version,content,updated_at").eq("slug", slug).maybeSingle();
  if (res.error) {
    return {
      ...d,
      source: "defaults",
      error: res.error.message ?? "Failed to load legal document",
    };
  }

  const row = asRecord(res.data);
  if (row) {
    return mapRowToDocument(row, d);
  }

  const candidates = slugCandidates(slug);
  const legacyRes = await supabase
    .from("legal_documents")
    .select("slug,title,version,content,updated_at")
    .in("slug", candidates)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (legacyRes.error) {
    return {
      ...d,
      source: "defaults",
      error: legacyRes.error.message ?? "Failed to load legal document",
    };
  }

  const legacyRows = Array.isArray(legacyRes.data)
    ? legacyRes.data.map(asRecord).filter((r): r is UnknownRecord => r !== null)
    : [];

  const exactSlugMatch = legacyRows.find((r) => candidates.includes(readString(r.slug).toLowerCase()));
  if (exactSlugMatch) {
    return mapRowToDocument(exactSlugMatch, d);
  }

  const keywords = titleKeywords(slug);
  const titleMatch = legacyRows.find((r) => {
    const title = readString(r.title).toLowerCase();
    return keywords.some((keyword) => title.includes(keyword));
  });

  if (titleMatch) {
    return mapRowToDocument(titleMatch, d);
  }

  return {
    ...d,
    source: "defaults",
  };
}

export async function getLegalDocVersions(): Promise<Record<LegalDocSlug, number>> {
  const slugs: LegalDocSlug[] = ["terms", "platform-policy", "copyright"];
  const out = { terms: 1, "platform-policy": 1, copyright: 1 } as Record<LegalDocSlug, number>;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return out;

  const res = await supabase.from("legal_documents").select("slug,version").in("slug", slugs);
  if (res.error) return out;

  const rows = Array.isArray(res.data) ? res.data : [];
  for (const r of rows) {
    const rec = asRecord(r);
    const slug = readString(rec?.slug) as LegalDocSlug;
    if (!slug || !(slug in out)) continue;
    out[slug] = readInt(rec?.version, out[slug]);
  }

  return out;
}
