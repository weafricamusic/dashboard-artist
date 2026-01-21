import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireArtistSession } from "../../../../lib/auth/artist";
import { getLiveDonationsForArtist } from "../../../../lib/analytics/insights";
import {
  createBattleForArtist,
  endBattleForArtist,
  listBattlesForArtist,
  startBattleForArtist,
  type BattleCategory,
} from "../../../../lib/battles/artist";
import {
  createLiveNowForArtist,
  createLiveSessionForArtist,
  listLiveSessionsForArtist,
  updateLiveSessionStatusForArtist,
  type LiveSessionStatus,
} from "../../../../lib/live/sessions";
import LiveStreamingDashboard from "../../../../components/LiveStreamingDashboard";

function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

export default async function ArtistLivePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireArtistSession();

  const sp = (await searchParams) ?? {};

  const tab = typeof sp.tab === "string" && sp.tab === "battles" ? "battles" : "scheduled";
  const activeBattleId = typeof sp.battle === "string" ? sp.battle : null;

  async function setStatus(formData: FormData) {
    "use server";

    const session = await requireArtistSession();

    const sessionId = String(formData.get("sessionId") ?? "").trim();
    const status = String(formData.get("status") ?? "").trim() as LiveSessionStatus;

    const res = await updateLiveSessionStatusForArtist(session.user.uid, { sessionId, status });
    if (!res.ok) {
      const msg = encodeURIComponent(res.message);
      redirect(`/artist/dashboard/live?live_error=${msg}`);
    }

    revalidatePath("/artist/dashboard/live");
    redirect("/artist/dashboard/live");
  }

  async function schedule(formData: FormData) {
    "use server";

    const session = await requireArtistSession();

    const title = String(formData.get("title") ?? "").trim();
    const startsAtLocal = String(formData.get("startsAt") ?? "").trim();
    const eventUrl = String(formData.get("eventUrl") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    // startsAtLocal comes from <input type="datetime-local"> (no timezone). Interpret as local time.
    const startsAtIso = startsAtLocal ? new Date(startsAtLocal).toISOString() : "";

    const res = await createLiveSessionForArtist(session.user.uid, {
      title,
      startsAtIso,
      eventUrl: eventUrl || undefined,
      notes: notes || undefined,
    });

    if (!res.ok) {
      const msg = encodeURIComponent(res.message);
      redirect(`/artist/dashboard/live?live_error=${msg}`);
    }

    revalidatePath("/artist/dashboard/live");
    redirect("/artist/dashboard/live?live_scheduled=1");
  }

  async function startLiveNow(formData: FormData) {
    "use server";

    const session = await requireArtistSession();

    const title = String(formData.get("title") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    const res = await createLiveNowForArtist(session.user.uid, {
      title,
      notes: notes || undefined,
    });

    if (!res.ok) {
      const msg = encodeURIComponent(res.message);
      redirect(`/artist/dashboard/live?live_error=${msg}`);
    }

    revalidatePath("/artist/dashboard/live");
    redirect("/artist/dashboard/live");
  }

  async function endLiveNow(formData: FormData) {
    "use server";

    const session = await requireArtistSession();

    const sessionId = String(formData.get("sessionId") ?? "").trim();
    if (!sessionId) {
      redirect("/artist/dashboard/live?live_error=Missing%20session%20id");
    }

    const res = await updateLiveSessionStatusForArtist(session.user.uid, { sessionId, status: "ended" });
    if (!res.ok) {
      const msg = encodeURIComponent(res.message);
      redirect(`/artist/dashboard/live?live_error=${msg}`);
    }

    revalidatePath("/artist/dashboard/live");
    redirect("/artist/dashboard/live");
  }

  async function createBattle(formData: FormData) {
    "use server";

    const session = await requireArtistSession();

    const title = String(formData.get("title") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim() as BattleCategory;
    const country = String(formData.get("country") ?? "").trim();

    const res = await createBattleForArtist(session.user.uid, {
      title,
      category,
      country: country || undefined,
    });

    if (!res.ok) {
      const msg = encodeURIComponent(res.message);
      redirect(`/artist/dashboard/live?tab=battles&battle_error=${msg}`);
    }

    revalidatePath("/artist/dashboard/live");
    redirect("/artist/dashboard/live?tab=battles");
  }

  async function startBattle(formData: FormData) {
    "use server";

    const session = await requireArtistSession();
    const battleId = String(formData.get("battleId") ?? "").trim();

    const res = await startBattleForArtist(session.user.uid, battleId);
    if (!res.ok) {
      const msg = encodeURIComponent(res.message);
      redirect(`/artist/dashboard/live?tab=battles&battle_error=${msg}`);
    }

    revalidatePath("/artist/dashboard/live");
    redirect(`/artist/dashboard/live?tab=battles&battle=${encodeURIComponent(battleId)}`);
  }

  async function endBattle(formData: FormData) {
    "use server";

    const session = await requireArtistSession();
    const battleId = String(formData.get("battleId") ?? "").trim();

    const res = await endBattleForArtist(session.user.uid, battleId);
    if (!res.ok) {
      const msg = encodeURIComponent(res.message);
      redirect(`/artist/dashboard/live?tab=battles&battle_error=${msg}`);
    }

    revalidatePath("/artist/dashboard/live");
    redirect("/artist/dashboard/live?tab=battles");
  }

  const battleError = typeof sp.battle_error === "string" ? sp.battle_error : null;

  const [live, upcoming, history, battles] = await Promise.all([
    tab === "scheduled" ? getLiveDonationsForArtist(session.user.uid, 30) : Promise.resolve({ coins: null }),
    tab === "scheduled"
      ? listLiveSessionsForArtist(session.user.uid, { limit: 10, onlyUpcoming: true })
      : Promise.resolve({ sessions: [], source: "none" as const, error: undefined as string | undefined }),
    tab === "scheduled"
      ? listLiveSessionsForArtist(session.user.uid, { limit: 15, onlyUpcoming: false })
      : Promise.resolve({ sessions: [], source: "none" as const, error: undefined as string | undefined }),
    tab === "battles"
      ? listBattlesForArtist(session.user.uid, { limit: 50 })
      : Promise.resolve({ battles: [], source: "none" as const, error: undefined as string | undefined }),
  ]);

  // If you see "No upcoming events" after scheduling, check the banner here.
  // (We redirect with these query params from the server action.)
  const liveError = typeof sp.live_error === "string" ? sp.live_error : null;
  const liveScheduled = typeof sp.live_scheduled === "string" ? sp.live_scheduled : null;
  const currentLive = upcoming.sessions.find((s) => s.status === "live") ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Live</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Schedule streams and review live performance (viewers, donations, chat engagement).
        </p>
      </div>

      <div className="flex items-center gap-2">
        <a
          className={
            tab === "battles"
              ? "rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white"
              : "rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
          }
          href="/artist/dashboard/live?tab=battles"
        >
          Live Battles
        </a>
        <a
          className={
            tab === "scheduled"
              ? "rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white"
              : "rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
          }
          href="/artist/dashboard/live?tab=scheduled"
        >
          Scheduled
        </a>
      </div>

      {tab === "battles" ? (
        <div className="space-y-4">
          {battleError ? (
            <div className="rounded-2xl border border-rose-900/40 bg-rose-950/40 p-4 text-sm text-rose-200">
              {battleError}
            </div>
          ) : null}

          {battles.error ? (
            <div className="rounded-2xl border border-amber-900/40 bg-amber-950/40 p-4 text-sm text-amber-200">
              {battles.error}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-white">Live Battles</div>
              <div className="mt-1 text-sm text-zinc-400">Manual-start battles (not scheduled lives).</div>
            </div>

            <details className="group">
              <summary className="list-none cursor-pointer rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">
                ➕ Create Battle
              </summary>
              <div className="mt-3 w-[320px] rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-sm">
                <form action={createBattle} className="space-y-3">
                  <label className="block">
                    <div className="text-sm font-medium text-zinc-200">Title</div>
                    <input
                      name="title"
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
                      placeholder="Test Live Battle"
                      required
                    />
                  </label>

                  <label className="block">
                    <div className="text-sm font-medium text-zinc-200">Category</div>
                    <select
                      name="category"
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
                      defaultValue="amapiano"
                      required
                    >
                      <option value="amapiano">amapiano</option>
                      <option value="dj">dj</option>
                      <option value="rnb">rnb</option>
                      <option value="others">others</option>
                    </select>
                  </label>

                  <input type="hidden" name="country" value="" />

                  <div className="flex items-center justify-end">
                    <button className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">
                      Create
                    </button>
                  </div>
                </form>
              </div>
            </details>
          </div>

          <div className="space-y-3">
            {battles.battles.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-300">
                No battles yet.
              </div>
            ) : (
              battles.battles.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm"
                >
                  {b.isLive ? <div className="text-sm font-medium text-rose-200">🔴 LIVE</div> : null}

                  <div className="mt-1 text-base font-semibold text-white">{b.title}</div>
                  <div className="mt-1 text-sm text-zinc-300">Category: {b.category}</div>
                  {!b.isLive ? <div className="mt-1 text-sm text-zinc-300">Status: Not Live</div> : null}

                  <div className="mt-3 flex items-center gap-2">
                    {!b.isLive ? (
                      <form action={startBattle}>
                        <input type="hidden" name="battleId" value={b.id} />
                        <button className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                          START
                        </button>
                      </form>
                    ) : (
                      <form action={endBattle}>
                        <input type="hidden" name="battleId" value={b.id} />
                        <button className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800">
                          END
                        </button>
                      </form>
                    )}

                    {activeBattleId && activeBattleId === b.id ? (
                      <div className="text-xs text-zinc-500">Channel: {b.id}</div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {tab === "scheduled" ? (
        <>

      <LiveStreamingDashboard userId={session.user.uid} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
          <div className="text-sm font-medium text-white">Start Live Stream</div>
          <div className="mt-2 text-sm text-zinc-400">
            Go live instantly with a title and optional description.
          </div>

          {currentLive ? (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
              <div className="text-sm font-semibold text-rose-200">🔴 Live now</div>
              <div className="mt-1 text-base font-semibold text-white">{currentLive.title}</div>
              <div className="mt-1 text-xs text-zinc-400">
                Started {new Date(currentLive.startsAt).toLocaleString()}
              </div>
              <form action={endLiveNow} className="mt-3">
                <input type="hidden" name="sessionId" value={currentLive.id} />
                <button className="rounded-lg border border-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900">
                  End Stream
                </button>
              </form>
            </div>
          ) : (
            <form action={startLiveNow} className="mt-4 space-y-4">
              <label className="block">
                <div className="text-sm font-medium text-zinc-200">Title</div>
                <input
                  name="title"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
                  placeholder="Live set"
                  required
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-zinc-200">Description (optional)</div>
                <textarea
                  name="notes"
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
                />
              </label>

              <div className="flex items-center justify-end">
                <button className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500">
                  Start Live
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
          <div className="text-sm font-medium text-white">Live Status</div>
          <div className="mt-2 text-sm text-zinc-400">Real-time viewers and donations will appear here.</div>
          <div className="mt-4 space-y-2 text-sm text-zinc-300">
            <div className="flex items-center justify-between">
              <span>Viewers</span>
              <span>—</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Status</span>
              <span className={currentLive ? "text-rose-200" : "text-zinc-400"}>
                {currentLive ? "Live" : "Offline"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Donations (coins)</span>
              <span>{formatInt(live.coins)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
          <div className="text-sm text-zinc-500">Peak viewers</div>
          <div className="mt-1 text-2xl font-semibold">—</div>
          <div className="mt-1 text-xs text-zinc-500">Connect live_stream analytics to enable.</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
          <div className="text-sm text-zinc-500">Avg viewers</div>
          <div className="mt-1 text-2xl font-semibold">—</div>
          <div className="mt-1 text-xs text-zinc-500">Connect live_stream analytics to enable.</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
          <div className="text-sm text-zinc-500">Donations (coins)</div>
          <div className="mt-1 text-2xl font-semibold">{formatInt(live.coins)}</div>
          <div className="mt-1 text-xs text-zinc-500">Best-effort: transaction types containing “live”.</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
          <div className="text-sm text-zinc-500">Chat messages</div>
          <div className="mt-1 text-2xl font-semibold">—</div>
          <div className="mt-1 text-xs text-zinc-500">Add chat event tracking to enable.</div>
        </div>
      </div>

      {upcoming.error ? (
        <div className="rounded-2xl border border-amber-900/40 bg-amber-950/40 p-4 text-sm text-amber-200">
          {upcoming.error}
        </div>
      ) : null}

      {liveError ? (
        <div className="rounded-2xl border border-rose-900/40 bg-rose-950/40 p-4 text-sm text-rose-200">
          {liveError}
        </div>
      ) : null}

      {liveScheduled ? (
        <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          Live session scheduled.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
          <div className="text-sm font-medium text-white">Schedule Live Stream</div>
          <div className="mt-2 text-sm text-zinc-400">
            Set date/time, title, and (optionally) event info.
          </div>

          {upcoming.source === "none" && !upcoming.error ? (
            <div className="mt-3 text-sm text-zinc-400">
              Live scheduling is not configured yet. Set Supabase env vars in <span className="font-mono">.env.local</span>.
            </div>
          ) : null}

          {upcoming.source === "supabase" ? (
            <form action={schedule} className="mt-4 space-y-4">
              <label className="block">
                <div className="text-sm font-medium text-zinc-200">Title</div>
                <input
                  name="title"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
                  placeholder="Live set"
                  required
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-zinc-200">Start date/time</div>
                <input
                  name="startsAt"
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
                  required
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-zinc-200">Event link (optional)</div>
                <input
                  name="eventUrl"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
                  placeholder="https://..."
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-zinc-200">Notes (optional)</div>
                <textarea
                  name="notes"
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
                />
              </label>

              <div className="flex items-center justify-end">
                <button className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">
                  Schedule
                </button>
              </div>
            </form>
          ) : null}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
          <div className="text-sm font-medium text-white">Live History</div>
          <div className="mt-2 text-sm text-zinc-400">
            Track previous streams, gifts, viewers, and performance.
          </div>
          {history.sessions.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-400">No live sessions recorded yet.</div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-zinc-500">
                  <tr className="border-b border-zinc-800">
                    <th className="py-2 pr-3 font-medium">Start</th>
                    <th className="py-2 pr-3 font-medium">Title</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 font-medium">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {history.sessions.map((s) => (
                    <tr key={s.id} className="border-b border-zinc-900">
                      <td className="py-2 pr-3 text-zinc-300">
                        {new Date(s.startsAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-3 text-white">{s.title}</td>
                      <td className="py-2 pr-3 text-zinc-300">{s.status}</td>
                      <td className="py-2 text-zinc-300">
                        <div className="flex items-center gap-3">
                          <a className="text-zinc-200 underline" href={`/live/${s.id}`} target="_blank" rel="noreferrer">
                            Watch
                          </a>
                          {s.eventUrl ? (
                            <a className="text-zinc-200 underline" href={s.eventUrl} target="_blank" rel="noreferrer">
                              Stream
                            </a>
                          ) : (
                            <span className="text-zinc-500">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
        <div className="text-sm font-medium text-white">Upcoming Events</div>
        {upcoming.sessions.length === 0 ? (
          <div className="mt-2 text-sm text-zinc-400">No upcoming events.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {upcoming.sessions
              .slice()
              .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
              .map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/30 p-3">
                  <div>
                    <div className="text-sm font-medium text-white">{s.title}</div>
                    <div className="mt-1 text-xs text-zinc-500">{new Date(s.startsAt).toLocaleString()} · {s.status}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
                      href={`/live/${s.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Watch
                    </a>

                    {s.status === "scheduled" ? (
                      <form action={setStatus}>
                        <input type="hidden" name="sessionId" value={s.id} />
                        <input type="hidden" name="status" value="live" />
                        <button className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500">
                          Go Live
                        </button>
                      </form>
                    ) : null}

                    {s.status === "live" ? (
                      <form action={setStatus}>
                        <input type="hidden" name="sessionId" value={s.id} />
                        <input type="hidden" name="status" value="ended" />
                        <button className="rounded-lg border border-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900">
                          End
                        </button>
                      </form>
                    ) : null}

                    {s.eventUrl ? (
                      <a
                        className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
                        href={s.eventUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Stream
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
        </>
      ) : null}
    </div>
  );
}
