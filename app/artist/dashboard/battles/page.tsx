import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireArtistSession } from "../../../../lib/auth/artist";
import { createBattleInvite, listBattleInvitesForArtist, respondToBattleInvite } from "../../../../lib/battles/invites";

function displayName(profile?: { stageName?: string; name?: string } | null, fallbackUid?: string): string {
  const stageName = profile?.stageName?.trim();
  if (stageName) return stageName;
  const name = profile?.name?.trim();
  if (name) return name;
  if (!fallbackUid) return "Unknown";
  return `${fallbackUid.slice(0, 6)}…${fallbackUid.slice(-4)}`;
}

export default async function ArtistBattlesPage() {
  const session = await requireArtistSession();

  async function sendInvite(formData: FormData) {
    "use server";

    const session = await requireArtistSession();

    const toArtistUid = String(formData.get("toArtistUid") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const category = String(formData.get("category") ?? "others").trim();
    const message = String(formData.get("message") ?? "").trim();
    const startsAtLocal = String(formData.get("startsAt") ?? "").trim();
    const durationMinutesRaw = String(formData.get("durationMinutes") ?? "").trim();
    const stakeCoinsRaw = String(formData.get("stakeCoins") ?? "").trim();

    const proposedStartsAtIso = startsAtLocal ? new Date(startsAtLocal).toISOString() : "";
    const durationMinutes = durationMinutesRaw ? Number(durationMinutesRaw) : undefined;
    const stakeCoins = stakeCoinsRaw ? Number(stakeCoinsRaw) : undefined;

    const res = await createBattleInvite(session.user.uid, {
      toArtistUid,
      title,
      category,
      message: message || undefined,
      proposedStartsAtIso: proposedStartsAtIso || undefined,
      durationMinutes,
      stakeCoins,
    });

    if (!res.ok) {
      const msg = encodeURIComponent(res.message);
      redirect(`/artist/dashboard/battles?invite_error=${msg}`);
    }

    revalidatePath("/artist/dashboard/battles");
    redirect("/artist/dashboard/battles?invite_sent=1");
  }

  async function respondInvite(formData: FormData) {
    "use server";

    const session = await requireArtistSession();

    const inviteId = String(formData.get("inviteId") ?? "").trim();
    const action = String(formData.get("action") ?? "").trim() as "accept" | "decline";

    if (!inviteId || (action !== "accept" && action !== "decline")) {
      redirect("/artist/dashboard/battles?invite_error=Invalid%20invite%20action");
    }

    const res = await respondToBattleInvite(session.user.uid, { inviteId, action });
    if (!res.ok) {
      const msg = encodeURIComponent(res.message);
      redirect(`/artist/dashboard/battles?invite_error=${msg}`);
    }

    revalidatePath("/artist/dashboard/battles");
    redirect("/artist/dashboard/battles");
  }

  const invitesRes = await listBattleInvitesForArtist(session.user.uid);
  const received = invitesRes.ok ? invitesRes.received : [];
  const sent = invitesRes.ok ? invitesRes.sent : [];
  const profiles = invitesRes.ok ? invitesRes.profiles : {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Battles</h1>
        <p className="mt-1 text-sm text-zinc-400">Invite another artist to a scheduled battle.</p>
        {!invitesRes.ok ? (
          <div className="mt-3 rounded-xl border border-amber-900/40 bg-amber-950/40 p-3 text-sm text-amber-200">
            {invitesRes.message}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-white">Send Battle Invite</div>
            <div className="mt-1 text-sm text-zinc-400">Free by default (stake is optional).</div>
          </div>

          <details className="group">
            <summary className="list-none cursor-pointer rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">
              ➕ New Invite
            </summary>
            <div className="mt-3 w-[360px] rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-sm">
              <form action={sendInvite} className="space-y-3">
                <label className="block">
                  <div className="text-sm font-medium text-zinc-200">Opponent Artist UID</div>
                  <input
                    name="toArtistUid"
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
                    placeholder="Paste artist uid"
                    required
                  />
                </label>

                <label className="block">
                  <div className="text-sm font-medium text-zinc-200">Title</div>
                  <input
                    name="title"
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
                    placeholder="Amapiano showdown"
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
                    <option value="rnb">rnb</option>
                    <option value="others">others</option>
                  </select>
                </label>

                <label className="block">
                  <div className="text-sm font-medium text-zinc-200">Proposed start time (optional)</div>
                  <input
                    name="startsAt"
                    type="datetime-local"
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <div className="text-sm font-medium text-zinc-200">Duration (mins)</div>
                    <input
                      name="durationMinutes"
                      type="number"
                      min={1}
                      placeholder="30"
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
                    />
                  </label>

                  <label className="block">
                    <div className="text-sm font-medium text-zinc-200">Stake (coins)</div>
                    <input
                      name="stakeCoins"
                      type="number"
                      min={0}
                      placeholder="0"
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
                    />
                  </label>
                </div>

                <label className="block">
                  <div className="text-sm font-medium text-zinc-200">Message (optional)</div>
                  <textarea
                    name="message"
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
                    placeholder="Let’s do 3 rounds, audience votes."
                  />
                </label>

                <div className="flex items-center justify-end">
                  <button className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">
                    Send Invite
                  </button>
                </div>
              </form>
            </div>
          </details>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm">
          <div className="text-sm font-medium text-white">Received Invites</div>
          {received.length === 0 ? (
            <div className="mt-2 text-sm text-zinc-400">No invites yet.</div>
          ) : (
            <div className="mt-3 space-y-3">
              {received.map((inv) => {
                const fromProfile = profiles[inv.fromArtistUid] ?? null;
                return (
                  <div key={inv.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{inv.title}</div>
                        <div className="mt-1 text-xs text-zinc-400">
                          From {displayName(fromProfile, inv.fromArtistUid)} • {inv.category}
                        </div>
                        {inv.proposedStartsAt ? (
                          <div className="mt-1 text-xs text-zinc-500">
                            Proposed: {new Date(inv.proposedStartsAt).toLocaleString()}
                          </div>
                        ) : null}
                        {inv.message ? <div className="mt-2 text-sm text-zinc-300">“{inv.message}”</div> : null}
                        {inv.stakeCoins > 0 ? (
                          <div className="mt-2 text-xs text-amber-200">Stake: {inv.stakeCoins} coins</div>
                        ) : (
                          <div className="mt-2 text-xs text-zinc-500">Free battle</div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <form action={respondInvite}>
                          <input type="hidden" name="inviteId" value={inv.id} />
                          <input type="hidden" name="action" value="accept" />
                          <button className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500">
                            Accept
                          </button>
                        </form>
                        <form action={respondInvite}>
                          <input type="hidden" name="inviteId" value={inv.id} />
                          <input type="hidden" name="action" value="decline" />
                          <button className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900">
                            Decline
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm">
          <div className="text-sm font-medium text-white">Sent Invites</div>
          {sent.length === 0 ? (
            <div className="mt-2 text-sm text-zinc-400">No sent invites yet.</div>
          ) : (
            <div className="mt-3 space-y-3">
              {sent.map((inv) => {
                const toProfile = profiles[inv.toArtistUid] ?? null;
                return (
                  <div key={inv.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                    <div className="text-sm font-semibold text-white">{inv.title}</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      To {displayName(toProfile, inv.toArtistUid)} • {inv.category}
                    </div>
                    <div className="mt-2 text-xs text-zinc-500">Status: {inv.status}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm">
        <div className="text-sm font-medium text-white">Battle Matches</div>
        <div className="mt-2 text-sm text-zinc-400">
          Accepted invites create scheduled matches. (Live execution will be handled in the live sessions flow.)
        </div>
      </div>
    </div>
  );
}
