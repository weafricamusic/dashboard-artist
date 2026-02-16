import "server-only";

import { getSupabaseAdminClient } from "../supabase/admin";

export type StoredAiOutput = {
  id: string;
  kind: string;
  input: Record<string, unknown>;
  output: string;
  provider: string | null;
  createdAt: string;
};

export async function saveAiOutputForArtist(
  artistUid: string,
  row: {
    kind: string;
    input: Record<string, unknown>;
    output: string;
    provider: string;
  },
): Promise<{ ok: boolean; error?: string; source: "supabase" | "none" }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, source: "none", error: "Supabase not configured" };

  const res = await supabase.from("ai_outputs").insert({
    artist_uid: artistUid,
    kind: row.kind,
    input: row.input,
    output: row.output,
    provider: row.provider,
  });

  if (res.error) return { ok: false, source: "supabase", error: res.error.message };
  return { ok: true, source: "supabase" };
}

export async function listAiOutputsForArtist(
  artistUid: string,
  limit = 20,
): Promise<{ outputs: StoredAiOutput[]; source: "supabase" | "none"; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { outputs: [], source: "none" };

  const res = await supabase
    .from("ai_outputs")
    .select("id,kind,input,output,provider,created_at")
    .eq("artist_uid", artistUid)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (res.error) return { outputs: [], source: "supabase", error: res.error.message };

  type Row = {
    id: string;
    kind: string;
    input: Record<string, unknown>;
    output: string;
    provider: string | null;
    created_at: string;
  };

  return {
    outputs: (res.data ?? []).map((r: Row) => ({
      id: r.id,
      kind: r.kind,
      input: r.input,
      output: r.output,
      provider: r.provider,
      createdAt: r.created_at,
    })),
    source: "supabase",
  };
}
