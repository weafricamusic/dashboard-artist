import "server-only";

import { getSupabaseAdminClient } from "../supabase/admin";

export type InboxThreadType = "fan" | "system" | "announcement";
export type InboxSenderType = "fan" | "artist" | "system";

export type InboxThread = {
  id: string;
  artistUid: string;
  threadType: InboxThreadType;
  fanId: string | null;
  subject: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  lastSenderType: InboxSenderType | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type InboxMessage = {
  id: string;
  threadId: string;
  artistUid: string;
  senderType: InboxSenderType;
  senderId: string | null;
  body: string;
  createdAt: string;
  readAt: string | null;
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

function isMissingTableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("could not find") ||
    m.includes("unknown table") ||
    (m.includes("relation") && m.includes("artist_inbox_threads")) ||
    (m.includes("relation") && m.includes("artist_inbox_messages"))
  );
}

function coerceThreadType(raw: unknown): InboxThreadType {
  const v = readString(raw)?.toLowerCase();
  if (v === "system") return "system";
  if (v === "announcement") return "announcement";
  return "fan";
}

function coerceSenderType(raw: unknown): InboxSenderType {
  const v = readString(raw)?.toLowerCase();
  if (v === "fan" || v === "system") return v;
  return "artist";
}

export async function listInboxThreadsForArtist(
  artistUid: string,
  limit = 40,
): Promise<{ threads: InboxThread[]; source: "supabase" | "none"; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { threads: [], source: "none" };

  const res = await supabase
    .from("artist_inbox_threads")
    .select(
      "id,artist_uid,thread_type,fan_id,subject,last_message_preview,last_message_at,last_sender_type,unread_count,created_at,updated_at",
    )
    .eq("artist_uid", artistUid)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (res.error) {
    const msg = res.error.message ?? "Failed to load inbox";
    if (isMissingTableError(msg)) {
      return {
        threads: [],
        source: "none",
        error: "Messages are not configured in Supabase yet (missing artist_inbox tables).",
      };
    }
    return { threads: [], source: "none", error: msg };
  }

  const rows = (res.data ?? []).map(asRecord).filter((r): r is UnknownRecord => r !== null);
  const threads: InboxThread[] = rows.map((row) => ({
    id: readString(row.id) ?? "",
    artistUid: readString(row.artist_uid) ?? artistUid,
    threadType: coerceThreadType(row.thread_type),
    fanId: readString(row.fan_id),
    subject: readString(row.subject),
    lastMessagePreview: readString(row.last_message_preview),
    lastMessageAt: readString(row.last_message_at),
    lastSenderType: row.last_sender_type == null ? null : coerceSenderType(row.last_sender_type),
    unreadCount: Math.max(0, readNumber(row.unread_count)),
    createdAt: readString(row.created_at) ?? new Date().toISOString(),
    updatedAt: readString(row.updated_at) ?? new Date().toISOString(),
  }));

  return { threads, source: "supabase" };
}

export async function listInboxMessagesForThread(
  artistUid: string,
  threadId: string,
  limit = 200,
): Promise<{ messages: InboxMessage[]; source: "supabase" | "none"; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { messages: [], source: "none" };

  const res = await supabase
    .from("artist_inbox_messages")
    .select("id,thread_id,artist_uid,sender_type,sender_id,body,created_at,read_at")
    .eq("artist_uid", artistUid)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (res.error) {
    const msg = res.error.message ?? "Failed to load messages";
    if (isMissingTableError(msg)) {
      return {
        messages: [],
        source: "none",
        error: "Messages are not configured in Supabase yet (missing artist_inbox tables).",
      };
    }
    return { messages: [], source: "none", error: msg };
  }

  const rows = (res.data ?? []).map(asRecord).filter((r): r is UnknownRecord => r !== null);
  const messages: InboxMessage[] = rows.map((row) => ({
    id: readString(row.id) ?? "",
    threadId: readString(row.thread_id) ?? threadId,
    artistUid: readString(row.artist_uid) ?? artistUid,
    senderType: coerceSenderType(row.sender_type),
    senderId: readString(row.sender_id),
    body: readString(row.body) ?? "",
    createdAt: readString(row.created_at) ?? new Date().toISOString(),
    readAt: readString(row.read_at),
  }));

  return { messages, source: "supabase" };
}

function trimPreview(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= 140) return t;
  return `${t.slice(0, 137)}...`;
}

export async function sendArtistReply(
  artistUid: string,
  threadId: string,
  body: string,
): Promise<
  | { ok: true }
  | { ok: false; reason: "not_configured" | "table_missing" | "invalid" | "unknown"; message: string }
> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false, reason: "invalid", message: "Message cannot be empty." };
  }

  // Insert message (author: artist)
  const insertRes = await supabase.from("artist_inbox_messages").insert({
    thread_id: threadId,
    artist_uid: artistUid,
    sender_type: "artist" satisfies InboxSenderType,
    sender_id: artistUid,
    body: trimmed,
  });

  if (insertRes.error) {
    const msg = insertRes.error.message ?? "Failed to send message";
    if (isMissingTableError(msg)) {
      return {
        ok: false,
        reason: "table_missing",
        message: "Supabase tables for Messages are missing. Run the inbox migration to enable Messages.",
      };
    }
    return { ok: false, reason: "unknown", message: msg };
  }

  // Best-effort: update thread summary fields.
  await supabase
    .from("artist_inbox_threads")
    .update({
      last_message_preview: trimPreview(trimmed),
      last_message_at: new Date().toISOString(),
      last_sender_type: "artist" satisfies InboxSenderType,
      updated_at: new Date().toISOString(),
    })
    .eq("artist_uid", artistUid)
    .eq("id", threadId);

  return { ok: true };
}

export async function markInboxThreadRead(
  artistUid: string,
  threadId: string,
): Promise<{ ok: true } | { ok: false; reason: "not_configured" | "table_missing" | "unknown"; message: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const now = new Date().toISOString();

  const updateRes = await supabase
    .from("artist_inbox_messages")
    .update({ read_at: now })
    .eq("artist_uid", artistUid)
    .eq("thread_id", threadId)
    .is("read_at", null)
    .neq("sender_type", "artist");

  if (updateRes.error) {
    const msg = updateRes.error.message ?? "Failed to mark read";
    if (isMissingTableError(msg)) {
      return {
        ok: false,
        reason: "table_missing",
        message: "Supabase tables for Messages are missing. Run the inbox migration to enable Messages.",
      };
    }
    return { ok: false, reason: "unknown", message: msg };
  }

  await supabase
    .from("artist_inbox_threads")
    .update({ unread_count: 0, updated_at: now })
    .eq("artist_uid", artistUid)
    .eq("id", threadId);

  return { ok: true };
}
