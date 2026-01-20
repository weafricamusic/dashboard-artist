export default function ArtistBattlesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Battles</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Send/receive battle requests; mobile executes battles in live sessions.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Battle Requests</div>
            <div className="mt-1 text-sm text-zinc-400">
              Requests should be validated and admin-governed.
            </div>
          </div>
          <button className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">
            Request Battle
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm">
        <div className="text-sm font-medium text-white">Battle History</div>
        <div className="mt-2 text-sm text-zinc-400">No battles yet.</div>
      </div>
    </div>
  );
}
