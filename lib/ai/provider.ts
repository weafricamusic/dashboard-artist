import "server-only";

type AiProviderResult = {
  text: string;
  source: "openai";
};

function hasOpenAi(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function normalizeCountry(country: string | null | undefined): string {
  const c = (country ?? "").trim();
  return c.length ? c : "Malawi";
}

export async function generateAiText(input: {
  kind:
    | "caption"
    | "hashtags"
    | "bio"
    | "title_suggestions"
    | "growth_recommendations"
    | "content_ideas"
    | "monetization_advice"
    | "reply_suggestion";
  country?: string | null;
  songTitle?: string | null;
  genre?: string | null;
  tags?: string[] | null;
  currentBio?: string | null;
  comment?: string | null;
}): Promise<AiProviderResult> {
  if (!hasOpenAi()) {
    throw new Error("AI is not configured (missing OPENAI_API_KEY)");
  }

  const apiKey = process.env.OPENAI_API_KEY as string;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const country = normalizeCountry(input.country);

  const system =
    "You are an artist manager for African creators. Keep outputs concise, actionable, and Malawi-first when relevant. Avoid explicit content. Use simple English.";

  const userParts: string[] = [];
  userParts.push(`Task: ${input.kind}`);
  userParts.push(`Country focus: ${country}`);
  if (input.songTitle) userParts.push(`Song title: ${input.songTitle}`);
  if (input.genre) userParts.push(`Genre: ${input.genre}`);
  if (input.tags?.length) userParts.push(`Tags: ${input.tags.join(", ")}`);
  if (input.currentBio) userParts.push(`Current bio: ${input.currentBio}`);
  if (input.comment) userParts.push(`Comment to reply to: ${input.comment}`);

  userParts.push(
    "Return only the final text. No preamble. For hashtags, return one line. For multi-item suggestions, use new lines.",
  );

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userParts.join("\n") },
        ],
      }),
    });

    if (!res.ok) throw new Error(`OpenAI request failed (${res.status})`);

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    const cleaned = String(content ?? "").trim();
    if (!cleaned.length) throw new Error("OpenAI returned empty output");

    return { text: cleaned, source: "openai" };
  } catch (err) {
    throw err;
  }
}
