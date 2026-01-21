"use client";

import { useEffect, useState } from "react";

export default function LiveStreamingDashboard({ userId }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [liveSession, setLiveSession] = useState(null);
  const [viewersCount, setViewersCount] = useState(0);
  const [scheduledStreams, setScheduledStreams] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/get-scheduled?userId=${encodeURIComponent(userId)}`)
      .then((res) => res.json())
      .then((data) => setScheduledStreams(Array.isArray(data.streams) ? data.streams : []))
      .catch(() => setScheduledStreams([]));
  }, [userId]);

  const startLive = async () => {
    if (!title.trim()) {
      setError("Enter a title");
      return;
    }

    setError("");

    const res = await fetch("/api/start-live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, userId }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data?.error || "Failed to start live");
      return;
    }

    setLiveSession(data.liveSession);
    setIsLive(true);
    setViewersCount(0);
  };

  const endLive = async () => {
    if (!liveSession?.id) return;

    const res = await fetch("/api/end-live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liveId: liveSession.id }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data?.error || "Failed to end live");
      return;
    }

    setIsLive(false);
    setLiveSession(null);
    setViewersCount(0);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-white">Live Streaming</h2>
        <p className="mt-1 text-sm text-zinc-400">Start a live set or manage scheduled streams.</p>
      </div>

      {error ? <div className="rounded-lg border border-rose-900/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">{error}</div> : null}

      {!isLive ? (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Live Stream Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
          />
          <button
            onClick={startLive}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
          >
            Start Live
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-rose-200">🔴 Live Now: {liveSession?.title}</p>
          <p className="text-sm text-zinc-300">Viewers: {viewersCount}</p>
          <button
            onClick={endLive}
            className="rounded-lg border border-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
          >
            End Stream
          </button>
        </div>
      )}

      <div className="border-t border-zinc-800 pt-4">
        <h3 className="text-sm font-semibold text-white">Scheduled Streams</h3>
        {scheduledStreams.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">No upcoming streams</p>
        ) : (
          <div className="mt-2 space-y-2">
            {scheduledStreams.map((stream) => (
              <div key={stream.id} className="rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2">
                <p className="text-sm font-semibold text-white">{stream.title}</p>
                <p className="text-xs text-zinc-400">
                  {stream.start_time ? new Date(stream.start_time).toLocaleString() : "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
