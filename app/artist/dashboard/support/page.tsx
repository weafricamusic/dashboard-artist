export default function ArtistSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Support</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Contact support, appeal rejections, and view compliance documents.
        </p>
      </div>

      <SuspendedNotice searchParams={searchParams} />

      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm">
        <div className="text-sm font-medium text-white">Report an issue</div>
        <div className="mt-2 text-sm text-zinc-400">
          Provide details and logs; sensitive actions should be audited.
        </div>
        <button className="mt-4 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">
          Contact Support
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm">
        <div className="text-sm font-medium text-white">FAQ & best practices</div>
        <div className="mt-2 text-sm text-zinc-400">Coming soon.</div>
      </div>
    </div>
  );
}

async function SuspendedNotice({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const sp = await searchParams;
  if (sp.state !== "suspended") return null;

  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-100 shadow-sm">
      <div className="text-sm font-semibold">Account suspended</div>
      <div className="mt-1 text-sm text-red-100/90">
        Your account is currently suspended. Please contact support to appeal.
      </div>
    </div>
  );
}
