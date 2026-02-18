import Link from "next/link";

import { requireArtistSession } from "../../../../lib/auth/artist";
import { listInboxMessagesForThread, listInboxThreadsForArtist } from "../../../../lib/messages/inbox";

import { markThreadReadAction, sendArtistReplyAction } from "./actions";

type InboxTab = "all" | "fans" | "system" | "announcements";

function labelForThread(t: { threadType: string; fanId: string | null; subject: string | null }): string {
  if (t.subject?.trim()) return t.subject.trim();
  if (t.threadType === "announcement") return "Announcement";
  if (t.threadType === "system") return "System";
  if (t.fanId) return `Fan: ${t.fanId}`;
  return "Conversation";
}

function readTab(raw: string | undefined): InboxTab {
  if (raw === "fans" || raw === "system" || raw === "announcements") return raw;
  return "all";
}

function formatThreadTime(value: string | null): string {
  if (!value) return "";

  const when = new Date(value);
  if (Number.isNaN(when.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - when.getTime();
  if (diffMs < 60 * 60 * 1000) {
    const mins = Math.max(1, Math.floor(diffMs / (60 * 1000)));
    return `${mins}m ago`;
  }
  if (diffMs < 24 * 60 * 60 * 1000) {
    const hours = Math.max(1, Math.floor(diffMs / (60 * 60 * 1000)));
    return `${hours}h ago`;
  }
  if (diffMs < 48 * 60 * 60 * 1000) return "Yesterday";

  return when.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function displayNameForThread(t: { threadType: string; fanId: string | null }): string {
  if (t.threadType === "system") return "System";
  if (t.threadType === "announcement") return "Announcements";
  if (t.fanId) return t.fanId.startsWith("@") ? t.fanId : `@${t.fanId}`;
  return "Fan";
}

function avatarForThread(t: { threadType: string; fanId: string | null }): string {
  if (t.threadType === "system") return "⚙️";
  if (t.threadType === "announcement") return "📣";
  if (t.fanId?.trim()) return t.fanId.trim().slice(0, 1).toUpperCase();
  return "F";
}

export default async function ArtistMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string; error?: string; tab?: string }>;
}) {
  const session = await requireArtistSession();
  const sp = await searchParams;

  const threadsRes = await listInboxThreadsForArtist(session.user.uid, 50);
  const tab = readTab(sp.tab);
  const threads = threadsRes.threads;
  const visibleThreads = threads.filter((t) => {
    if (tab === "all") return true;
    if (tab === "fans") return t.threadType === "fan";
    if (tab === "system") return t.threadType === "system";
    return t.threadType === "announcement";
  });

  const requestedThread = (sp.thread ?? "").trim();
  const selectedThreadId =
    (requestedThread && visibleThreads.some((t) => t.id === requestedThread) ? requestedThread : null) ??
    (visibleThreads[0]?.id ?? null);

  const selectedThread = selectedThreadId ? visibleThreads.find((t) => t.id === selectedThreadId) ?? null : null;
  const messagesRes = selectedThreadId
    ? await listInboxMessagesForThread(session.user.uid, selectedThreadId, 250)
    : { messages: [], source: "none" as const };

  const error = (sp.error ?? threadsRes.error ?? messagesRes.error ?? "").trim() || null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Messages</h1>
        <p className="mt-1 text-sm text-zinc-400">System messages, fan messages, and announcements.</p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-100 shadow-sm">
          <div className="text-sm font-semibold">Heads up</div>
          <div className="mt-1 text-sm text-amber-100/90">{error}</div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm lg:col-span-1">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-white">Inbox</div>
            <button
              type="button"
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-100 opacity-60"
              disabled
              title="Starting new threads is coming soon"
            >
              New
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {([
              { key: "all", label: "All" },
              { key: "fans", label: "Fans" },
              { key: "system", label: "System" },
              { key: "announcements", label: "Announcements" },
            ] as const).map((entry) => {
              const active = tab === entry.key;
              return (
                <Link
                  key={entry.key}
                  href={`/artist/dashboard/messages?tab=${entry.key}`}
                  className={
                    "rounded-lg border px-2.5 py-1 text-xs " +
                    (active
                      ? "border-violet-500/40 bg-violet-500/10 text-violet-100"
                      : "border-white/10 bg-black/20 text-zinc-300 hover:bg-white/5")
                  }
                >
                  {entry.label}
                </Link>
              );
            })}
          </div>

          {visibleThreads.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-400">
              No messages yet.
              <div className="mt-2 text-xs text-zinc-500">
                Once fan DMs and system announcements are connected, they’ll appear here.
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {visibleThreads.map((t) => {
                const active = t.id === selectedThreadId;
                const isUnread = t.unreadCount > 0;
                const threadName = displayNameForThread(t);
                const preview = t.lastMessagePreview ?? "No messages yet";
                return (
                  <Link
                    key={t.id}
                    href={`/artist/dashboard/messages?tab=${tab}&thread=${encodeURIComponent(t.id)}`}
                    className={
                      "block rounded-xl border px-3 py-2 transition " +
                      (active
                        ? "border-violet-500/40 bg-violet-500/10"
                        : "border-white/10 bg-black/20 hover:bg-white/5")
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-950/50 text-xs text-zinc-100">
                            {avatarForThread(t)}
                          </div>
                          <div className={"truncate text-sm text-white " + (isUnread ? "font-semibold" : "font-medium")}>
                            {threadName}
                          </div>
                          <div className="ml-auto shrink-0 text-[11px] text-zinc-500">{formatThreadTime(t.lastMessageAt)}</div>
                        </div>
                        <div className={"mt-1 truncate text-xs " + (isUnread ? "font-medium text-zinc-200" : "text-zinc-400")}>
                          {preview}
                        </div>
                      </div>
                      {t.unreadCount > 0 ? (
                        <div className="shrink-0 rounded-full bg-violet-600 px-2 py-0.5 text-xs font-medium text-white">
                          {t.unreadCount}
                        </div>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-white">Conversation</div>
              <div className="mt-1 text-xs text-zinc-400">
                {selectedThread ? labelForThread(selectedThread) : "Select a thread"}
              </div>
            </div>
            {selectedThreadId ? (
              <form action={markThreadReadAction}>
                <input type="hidden" name="threadId" value={selectedThreadId} />
                <button
                  type="submit"
                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-100 hover:bg-white/5"
                >
                  Mark read
                </button>
              </form>
            ) : null}
          </div>

          {!selectedThreadId ? (
            <div className="mt-4 text-sm text-zinc-400">Select a conversation to view messages.</div>
          ) : (
            <>
              <div className="mt-4 space-y-2">
                {messagesRes.messages.length === 0 ? (
                  <div className="text-sm text-zinc-400">Once fan messages and system updates are enabled, they will appear here.</div>
                ) : (
                  messagesRes.messages.map((m) => {
                    const mine = m.senderType === "artist";
                    return (
                      <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start") }>
                        <div
                          className={
                            "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm " +
                            (mine
                              ? "bg-violet-600 text-white"
                              : "border border-white/10 bg-black/20 text-zinc-100")
                          }
                        >
                          <div className="whitespace-pre-wrap break-words">{m.body}</div>
                          <div className={"mt-1 text-[11px] " + (mine ? "text-white/80" : "text-zinc-500") }>
                            {new Date(m.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-4 border-t border-white/10 pt-4">
                <form action={sendArtistReplyAction} className="space-y-3">
                  <input type="hidden" name="threadId" value={selectedThreadId} />
                  <textarea
                    name="body"
                    rows={3}
                    placeholder="Write a reply…"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-violet-500/60"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500"
                    >
                      Send
                    </button>
                    <div className="flex items-center gap-2">
                      {selectedThreadId ? (
                        <details className="relative">
                          <summary className="cursor-pointer list-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-100 hover:bg-white/5">
                            ⋯
                          </summary>
                          <div className="absolute right-0 z-10 mt-2 w-36 rounded-xl border border-white/10 bg-zinc-950/95 p-1 shadow-lg">
                            <button type="button" className="block w-full rounded-lg px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/5" disabled>
                              Block
                            </button>
                            <button type="button" className="block w-full rounded-lg px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/5" disabled>
                              Report
                            </button>
                            <button type="button" className="block w-full rounded-lg px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/5" disabled>
                              Delete
                            </button>
                          </div>
                        </details>
                      ) : null}
                    </div>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
