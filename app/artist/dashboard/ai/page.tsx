import { requireArtistSession } from "../../../../lib/auth/artist";
import { buildAiManagerInsights } from "../../../../lib/ai/insights";
import { listAiOutputsForArtist } from "../../../../lib/ai/storage";

import { AiClient } from "./AiClient";

export default async function AiManagerPage() {
  const session = await requireArtistSession();

  const [{ insights, countryFocus }, history] = await Promise.all([
    buildAiManagerInsights(session.user.uid),
    listAiOutputsForArtist(session.user.uid, 15),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">AI Manager</h1>
        <p className="mt-1 text-sm text-zinc-400">Malawi-first insights, captions, growth ideas, and fan engagement help.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {insights.map((i, idx) => (
          <div key={idx} className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
            <div className="text-sm font-medium text-white">{i.headline}</div>
            <div className="mt-2 text-sm text-zinc-300">{i.detail}</div>
          </div>
        ))}
      </div>

      <AiClient defaultCountry={countryFocus} />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
        <div className="text-sm font-medium text-white">Saved AI outputs</div>
        <div className="mt-1 text-xs text-zinc-500">Stored in Supabase when configured.</div>

        {history.source === "none" ? (
          <div className="mt-3 text-sm text-zinc-400">
            History is not available (Supabase not configured).
          </div>
        ) : history.outputs.length === 0 ? (
          <div className="mt-3 text-sm text-zinc-400">No saved outputs yet.</div>
        ) : (
          <div className="mt-3 space-y-3">
            {history.outputs.map((o) => (
              <div key={o.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-medium text-zinc-300 uppercase">{o.kind}</div>
                  <div className="text-[11px] text-zinc-500">
                    {new Date(o.createdAt).toLocaleString()} {o.provider ? `• ${o.provider}` : ""}
                  </div>
                </div>
                <pre className="mt-2 whitespace-pre-wrap break-words text-sm text-zinc-100">{o.output}</pre>
              </div>
            ))}
          </div>
        )}

        {history.error ? (
          <div className="mt-3 text-sm text-amber-200">{history.error}</div>
        ) : null}
      </div>
    </div>
  );
}
