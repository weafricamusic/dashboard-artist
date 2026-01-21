import "server-only";

import { getSupabaseAdminClient } from "../supabase/admin";

export type BattleInviteStatus = "sent" | "accepted" | "declined" | "cancelled" | "expired";

export type BattleInvite = {
  id: string;
  fromArtistUid: string;
  toArtistUid: string;
  title: string;
  category: string;
  message: string | null;
  proposedStartsAt: string | null;
  durationMinutes: number | null;
  stakeCoins: number;
  expiresAt: string | null;
  status: BattleInviteStatus;
  respondedAt: string | null;
  createdAt: string;
};

export type ArtistProfileLite = {
  artistUid: string;
  stageName: string;
  name: string;
  profilePhotoUrl: string | null;
  verificationBadge: boolean;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as UnknownRecord;
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : value == null ? null : String(value);
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function readBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

function mapRowToInvite(r: UnknownRecord): BattleInvite {
  const statusRaw = (readString(r.status) ?? "sent") as BattleInviteStatus;
  const status: BattleInviteStatus =
    statusRaw === "sent" ||
    statusRaw === "accepted" ||
    statusRaw === "declined" ||
    statusRaw === "cancelled" ||
    statusRaw === "expired"
      ? statusRaw
      : "sent";

  return {
    id: readString(r.id) ?? "",
    fromArtistUid: readString(r.from_artist_uid) ?? "",
    toArtistUid: readString(r.to_artist_uid) ?? "",
    title: readString(r.title) ?? "",
    category: readString(r.category) ?? "",
    message: readString(r.message),
    proposedStartsAt: readString(r.proposed_starts_at),
    durationMinutes: readNumber(r.duration_minutes),
    stakeCoins: readNumber(r.stake_coins) ?? 0,
    expiresAt: readString(r.expires_at),
    status,
    respondedAt: readString(r.responded_at),
    createdAt: readString(r.created_at) ?? new Date().toISOString(),
  };
}

function mapRowToProfileLite(r: UnknownRecord): ArtistProfileLite {
  return {
    artistUid: readString(r.artist_uid) ?? "",
    stageName: readString(r.stage_name) ?? "",
    name: readString(r.name) ?? "",
    profilePhotoUrl: readString(r.profile_photo_url),
    verificationBadge: readBool(r.verification_badge),
  };
}

async function getProfilesByUid(
  artistUids: string[],
): Promise<Record<string, ArtistProfileLite>> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return {};

  const uids = Array.from(new Set(artistUids.map((u) => u.trim()).filter(Boolean)));
  if (uids.length === 0) return {};

  const res = await supabase
    .from("artist_profiles")
    .select("artist_uid,stage_name,name,profile_photo_url,verification_badge")
    .in("artist_uid", uids)
    .limit(200);

  if (res.error) return {};

  const rows = (res.data ?? []).map(asRecord).filter((r): r is UnknownRecord => r !== null);
  const map: Record<string, ArtistProfileLite> = {};
  for (const row of rows) {
    const p = mapRowToProfileLite(row);
    if (p.artistUid) map[p.artistUid] = p;
  }
  return map;
}

export async function listBattleInvitesForArtist(
  artistUid: string,
  opts?: { limit?: number },
): Promise<
  | {
      ok: true;
      received: BattleInvite[];
      sent: BattleInvite[];
      profiles: Record<string, ArtistProfileLite>;
    }
  | { ok: false; message: string }
> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, message: "Supabase is not configured." };

  const uid = artistUid.trim();
  if (!uid) return { ok: false, message: "Missing artist uid." };

  const limit = opts?.limit ?? 50;

  const [receivedRes, sentRes] = await Promise.all([
    supabase
      .from("battle_invites")
      .select(
        "id,from_artist_uid,to_artist_uid,title,category,message,proposed_starts_at,duration_minutes,stake_coins,expires_at,status,responded_at,created_at",
      )
      .eq("to_artist_uid", uid)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("battle_invites")
      .select(
        "id,from_artist_uid,to_artist_uid,title,category,message,proposed_starts_at,duration_minutes,stake_coins,expires_at,status,responded_at,created_at",
      )
      .eq("from_artist_uid", uid)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  if (receivedRes.error) {
    return { ok: false, message: receivedRes.error.message ?? "Failed to load received invites" };
  }

  if (sentRes.error) {
    return { ok: false, message: sentRes.error.message ?? "Failed to load sent invites" };
  }

  const receivedRows = (receivedRes.data ?? []).map(asRecord).filter((r): r is UnknownRecord => r !== null);
  const sentRows = (sentRes.data ?? []).map(asRecord).filter((r): r is UnknownRecord => r !== null);

  const received = receivedRows.map(mapRowToInvite);
  const sent = sentRows.map(mapRowToInvite);

  const profileUids = [
    ...received.map((i) => i.fromArtistUid),
    ...received.map((i) => i.toArtistUid),
    ...sent.map((i) => i.fromArtistUid),
    ...sent.map((i) => i.toArtistUid),
  ];

  const profiles = await getProfilesByUid(profileUids);

  return { ok: true, received, sent, profiles };
}

export async function createBattleInvite(
  fromArtistUid: string,
  input: {
    toArtistUid: string;
    title: string;
    category: string;
    message?: string;
    proposedStartsAtIso?: string;
    durationMinutes?: number;
    stakeCoins?: number;
  },
): Promise<
  | { ok: true; inviteId: string }
  | { ok: false; reason: "not_configured" | "invalid" | "not_found" | "unknown"; message: string }
> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, reason: "not_configured", message: "Supabase is not configured." };

  const fromUid = fromArtistUid.trim();
  const toUid = input.toArtistUid.trim();
  const title = input.title.trim();
  const category = input.category.trim();

  if (!fromUid || !toUid) return { ok: false, reason: "invalid", message: "Missing artist uid." };
  if (fromUid === toUid) return { ok: false, reason: "invalid", message: "You can't invite yourself." };
  if (!title) return { ok: false, reason: "invalid", message: "Title is required." };

  // Keep in sync with Supabase constraint.
  if (category !== "amapiano" && category !== "dj" && category !== "rnb" && category !== "others") {
    return { ok: false, reason: "invalid", message: "Invalid category." };
  }

  const stakeCoins = Math.max(0, Number.isFinite(input.stakeCoins as number) ? Number(input.stakeCoins) : 0);
  const durationMinutes =
    input.durationMinutes != null && Number.isFinite(input.durationMinutes) && input.durationMinutes > 0
      ? Math.round(input.durationMinutes)
      : null;

  const proposedStartsAtIso = input.proposedStartsAtIso?.trim();
  const proposedStartsAt = proposedStartsAtIso && proposedStartsAtIso.length > 0 ? proposedStartsAtIso : null;

  // Validate recipient exists (prevents typos + feels professional).
  const recipientRes = await supabase
    .from("artist_profiles")
    .select("artist_uid")
    .eq("artist_uid", toUid)
    .maybeSingle();

  if (recipientRes.error) {
    return { ok: false, reason: "unknown", message: recipientRes.error.message ?? "Failed to validate recipient" };
  }

  if (!recipientRes.data) {
    return { ok: false, reason: "not_found", message: "Recipient artist not found." };
  }

  const res = await supabase
    .from("battle_invites")
    .insert({
      from_artist_uid: fromUid,
      to_artist_uid: toUid,
      title,
      category,
      message: input.message?.trim() || null,
      proposed_starts_at: proposedStartsAt,
      duration_minutes: durationMinutes,
      stake_coins: stakeCoins,
      status: "sent",
      expires_at: null,
      responded_at: null,
    })
    .select("id")
    .single();

  if (res.error) {
    return { ok: false, reason: "unknown", message: res.error.message ?? "Failed to create invite" };
  }

  const inviteId = (res.data as unknown as { id?: unknown } | null)?.id;
  const id = typeof inviteId === "string" ? inviteId : String(inviteId ?? "");

  // Best-effort audit log.
  await supabase.from("battle_invite_events").insert({
    invite_id: id,
    actor_uid: fromUid,
    action: "sent",
    metadata: { to: toUid },
  });

  return { ok: true, inviteId: id };
}

export async function respondToBattleInvite(
  actorUid: string,
  input: { inviteId: string; action: "accept" | "decline" },
): Promise<
  | { ok: true }
  | { ok: false; reason: "not_configured" | "invalid" | "not_found" | "not_allowed" | "unknown"; message: string }
> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, reason: "not_configured", message: "Supabase is not configured." };

  const uid = actorUid.trim();
  const inviteId = input.inviteId.trim();
  if (!uid || !inviteId) return { ok: false, reason: "invalid", message: "Missing invite id." };

  const inviteRes = await supabase
    .from("battle_invites")
    .select(
      "id,from_artist_uid,to_artist_uid,title,category,proposed_starts_at,duration_minutes,stake_coins,status",
    )
    .eq("id", inviteId)
    .maybeSingle();

  if (inviteRes.error) {
    return { ok: false, reason: "unknown", message: inviteRes.error.message ?? "Failed to load invite" };
  }

  const inviteRow = asRecord(inviteRes.data);
  if (!inviteRow) return { ok: false, reason: "not_found", message: "Invite not found." };

  const toUid = readString(inviteRow.to_artist_uid) ?? "";
  const fromUid = readString(inviteRow.from_artist_uid) ?? "";
  const status = readString(inviteRow.status) ?? "";

  if (toUid !== uid) return { ok: false, reason: "not_allowed", message: "Not allowed." };
  if (status !== "sent") return { ok: false, reason: "invalid", message: "Invite is not pending." };

  const now = new Date().toISOString();

  if (input.action === "decline") {
    const updateRes = await supabase
      .from("battle_invites")
      .update({ status: "declined", responded_at: now, updated_at: now })
      .eq("id", inviteId)
      .eq("to_artist_uid", uid)
      .eq("status", "sent")
      .select("id")
      .maybeSingle();

    if (updateRes.error) {
      return { ok: false, reason: "unknown", message: updateRes.error.message ?? "Failed to decline invite" };
    }

    if (!updateRes.data) {
      return { ok: false, reason: "not_found", message: "Invite not found." };
    }

    await supabase.from("battle_invite_events").insert({
      invite_id: inviteId,
      actor_uid: uid,
      action: "declined",
      metadata: { from: fromUid },
    });

    return { ok: true };
  }

  // accept
  const updateRes = await supabase
    .from("battle_invites")
    .update({ status: "accepted", responded_at: now, updated_at: now })
    .eq("id", inviteId)
    .eq("to_artist_uid", uid)
    .eq("status", "sent")
    .select(
      "id,from_artist_uid,to_artist_uid,title,category,proposed_starts_at,duration_minutes,stake_coins",
    )
    .maybeSingle();

  if (updateRes.error) {
    return { ok: false, reason: "unknown", message: updateRes.error.message ?? "Failed to accept invite" };
  }

  const accepted = asRecord(updateRes.data);
  if (!accepted) {
    return { ok: false, reason: "not_found", message: "Invite not found." };
  }

  const title = readString(accepted.title) ?? "Battle";
  const category = readString(accepted.category) ?? "others";
  const proposedStartsAt = readString(accepted.proposed_starts_at);
  const stakeCoinsAccepted = readNumber(accepted.stake_coins) ?? 0;

  const matchRes = await supabase
    .from("battle_matches")
    .insert({
      invite_id: inviteId,
      host_artist_uid: fromUid,
      guest_artist_uid: uid,
      title,
      category,
      status: "scheduled",
      scheduled_starts_at: proposedStartsAt,
      stake_coins: stakeCoinsAccepted,
    })
    .select("id")
    .single();

  if (matchRes.error) {
    // Invite is accepted; match creation failed. Return a clear message so we can troubleshoot.
    return {
      ok: false,
      reason: "unknown",
      message: matchRes.error.message ?? "Accepted invite but failed to create battle match",
    };
  }

  await supabase.from("battle_invite_events").insert({
    invite_id: inviteId,
    actor_uid: uid,
    action: "accepted",
    metadata: { from: fromUid, matchId: (matchRes.data as { id?: unknown } | null)?.id ?? null },
  });

  return { ok: true };
}
