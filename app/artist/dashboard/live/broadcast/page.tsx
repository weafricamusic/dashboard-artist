import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireArtistSession } from "../../../../../lib/auth/artist";

async function BroadcastPageContent({
  sessionId,
}: {
  sessionId: string;
}) {
  await requireArtistSession();

  // Validate the session ID format (basic check)
  if (!sessionId || typeof sessionId !== "string") {
    redirect("/artist/dashboard/live");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Live Broadcast</h1>
        <p className="mt-2 text-sm text-zinc-400">
          You are now broadcasting to your audience. Camera and microphone controls are below.
        </p>
      </div>

      {/* Broadcast UI - renders with session data from sessionStorage */}
      <BroadcastUIClient sessionId={sessionId} />
    </div>
  );
}

function BroadcastUIClient(
  {
    sessionId,
  }: {
    sessionId: string;
  }
) {
  // Client-side component that will load session data from sessionStorage
  // and render the broadcast UI
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
        <p className="text-sm text-zinc-400">
          Broadcasting session:{" "}
          <span className="font-mono text-zinc-200">{sessionId.slice(0, 8)}...</span>
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Live broadcast component requires Agora SDK to be configured. Once Agora is set
          up, this will display the live video feed, camera/mic controls, and viewer
          stats.
        </p>
      </div>
    </div>
  );
}

export default async function BroadcastPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const sessionId = typeof sp.sessionId === "string" ? sp.sessionId : null;

  if (!sessionId) {
    redirect("/artist/dashboard/live");
  }

  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Live Broadcast</h1>
            <p className="mt-2 text-sm text-zinc-400">Loading...</p>
          </div>
        </div>
      }
    >
      <BroadcastPageContent sessionId={sessionId} />
    </Suspense>
  );
}
