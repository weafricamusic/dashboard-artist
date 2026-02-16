"use server";

import { requireArtistSession } from "../../../../lib/auth/artist";
import { generateAiText } from "../../../../lib/ai/provider";
import { saveAiOutputForArtist } from "../../../../lib/ai/storage";

export async function generateCaptionAction(formData: FormData) {
  const session = await requireArtistSession();

  const songTitle = String(formData.get("songTitle") ?? "").trim() || null;
  const genre = String(formData.get("genre") ?? "").trim() || null;
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim() || null;

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    : null;

  try {
    const caption = await generateAiText({ kind: "caption", songTitle, genre, tags, country });
    const hashtags = await generateAiText({ kind: "hashtags", songTitle, genre, tags, country });

    await saveAiOutputForArtist(session.user.uid, {
      kind: "caption",
      input: { songTitle, genre, tags, country },
      output: caption.text,
      provider: caption.source,
    });

    await saveAiOutputForArtist(session.user.uid, {
      kind: "hashtags",
      input: { songTitle, genre, tags, country },
      output: hashtags.text,
      provider: hashtags.source,
    });

    return {
      ok: true as const,
      caption: caption.text,
      hashtags: hashtags.text,
      source: caption.source,
    };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "AI generation failed" };
  }
}

export async function generateBioAction(formData: FormData) {
  const session = await requireArtistSession();

  const currentBio = String(formData.get("currentBio") ?? "").trim() || null;
  const country = String(formData.get("country") ?? "").trim() || null;

  try {
    const bio = await generateAiText({ kind: "bio", currentBio, country });

    await saveAiOutputForArtist(session.user.uid, {
      kind: "bio",
      input: { currentBio, country },
      output: bio.text,
      provider: bio.source,
    });

    return { ok: true as const, bio: bio.text, source: bio.source };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "AI generation failed" };
  }
}

export async function generateRecommendationsAction(formData: FormData) {
  const session = await requireArtistSession();

  const country = String(formData.get("country") ?? "").trim() || null;
  const songTitle = String(formData.get("songTitle") ?? "").trim() || null;

  try {
    const growth = await generateAiText({ kind: "growth_recommendations", songTitle, country });
    const ideas = await generateAiText({ kind: "content_ideas", songTitle, country });
    const money = await generateAiText({ kind: "monetization_advice", songTitle, country });

    await saveAiOutputForArtist(session.user.uid, {
      kind: "growth_recommendations",
      input: { songTitle, country },
      output: growth.text,
      provider: growth.source,
    });

    await saveAiOutputForArtist(session.user.uid, {
      kind: "content_ideas",
      input: { songTitle, country },
      output: ideas.text,
      provider: ideas.source,
    });

    await saveAiOutputForArtist(session.user.uid, {
      kind: "monetization_advice",
      input: { songTitle, country },
      output: money.text,
      provider: money.source,
    });

    return {
      ok: true as const,
      growth: growth.text,
      ideas: ideas.text,
      monetization: money.text,
      source: growth.source,
    };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "AI generation failed" };
  }
}

export async function suggestReplyAction(formData: FormData) {
  const session = await requireArtistSession();

  const country = String(formData.get("country") ?? "").trim() || null;
  const comment = String(formData.get("comment") ?? "").trim() || null;

  try {
    const reply = await generateAiText({ kind: "reply_suggestion", comment, country });

    await saveAiOutputForArtist(session.user.uid, {
      kind: "reply_suggestion",
      input: { comment, country },
      output: reply.text,
      provider: reply.source,
    });

    return { ok: true as const, reply: reply.text, source: reply.source };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "AI generation failed" };
  }
}
