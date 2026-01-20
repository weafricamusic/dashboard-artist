import Link from "next/link";

import { requireArtistSession } from "../../../../lib/auth/artist";
import { listInboxMessagesForThread, listInboxThreadsForArtist } from "../../../../lib/messages/inbox";

import { markThreadReadAction, sendArtistReplyAction } from "./actions";

function labelForThread(t: { threadType: string; fanId: string | null; subject: string | null }): string {
  if (t.subject?.trim()) return t.subject.trim();
  if (t.threadType === "announcement") return "Announcement";
  if (t.threadType === "system") return "System";
  if (t.fanId) return `Fan: ${t.fanId}`;
  return "Conversation";
}

export default async function ArtistMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string; error?: string }>;
}) {
  const session = await requireArtistSession();
  const sp = await searchParams;

  const threadsRes = await listInboxThreadsForArtist(session.user.uid, 50);
  const threads = threadsRes.threads;

  const requestedThread = (sp.thread ?? "").trim();
  const selectedThreadId =
    (requestedThread && threads.some((t) => t.id === requestedThread) ? requestedThread : null) ??
    (threads[0]?.id ?? null);

  const selectedThread = selectedThreadId ? threads.find((t) => t.id === selectedThreadId) ?? null : null;
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

          {threads.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-400">
              No messages yet.
              <div className="mt-2 text-xs text-zinc-500">
                Once fan DMs and system announcements are connected, they’ll appear here.
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {threads.map((t) => {
                const active = t.id === selectedThreadId;
                return (
                  <Link
                    key={t.id}
                    href={`/artist/dashboard/messages?thread=${encodeURIComponent(t.id)}`}
                    className={
                      "block rounded-xl border px-3 py-2 transition " +
                      (active
                        ? "border-violet-500/40 bg-violet-500/10"
                        : "border-white/10 bg-black/20 hover:bg-white/5")
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">{labelForThread(t)}</div>
                        <div className="mt-0.5 truncate text-xs text-zinc-400">
                          {t.lastMessagePreview ?? "No messages yet"}
                        </div>
                      </div>
                      {t.unreadCount > 0 ? (
                        <div className="shrink-0 rounded-full bg-violet-600 px-2 py-0.5 text-xs font-medium text-white">
                          {t.unreadCount}
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-2 text-[11px] text-zinc-500">
                      {t.lastMessageAt ? new Date(t.lastMessageAt).toLocaleString() : ""}
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
            <div className="mt-4 text-sm text-zinc-400">Pick a conversation from the left.</div>
          ) : (
            <>
              <div className="mt-4 space-y-2">
                {messagesRes.messages.length === 0 ? (
                  <div className="text-sm text-zinc-400">No messages in this thread yet.</div>
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
