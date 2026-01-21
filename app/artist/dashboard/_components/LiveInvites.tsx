"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

interface Artist {
  uid: string;
  displayName: string;
  avatarUrl: string | null;
}

interface LiveInvite {
  id: string;
  sessionId: string;
  fromArtistUid: string;
  toArtistUid: string;
  fromArtistName: string;
  status: "pending" | "accepted" | "declined" | "expired";
  createdAt: string;
  respondedAt: string | null;
}

interface InviteArtistProps {
  sessionId: string;
  token: string;
  isOpen: boolean;
  onClose: () => void;
  onInviteSent?: (artistUid: string) => void;
}

export function InviteArtist({
  sessionId,
  token,
  isOpen,
  onClose,
  onInviteSent,
}: InviteArtistProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [invitedArtists, setInvitedArtists] = useState<Set<string>>(
    new Set()
  );
  const searchTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (!searchQuery.trim()) {
      setArtists([]);
      return;
    }

    setIsSearching(true);
    searchTimeout.current = setTimeout(() => {
      searchArtists(searchQuery, token);
    }, 300);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery, isOpen, token]);

  const searchArtists = async (query: string, authToken: string) => {
    try {
      setError("");
      const response = await fetch(
        `/api/live/search-artists?q=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to search artists");
      }

      const data = await response.json();
      setArtists(data.artists || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Search failed";
      setError(errorMsg);
      setArtists([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInvite = async (toArtistUid: string) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/live/send-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          toArtistUid,
          sessionId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send invite");
      }

      setInvitedArtists((prev) => new Set(prev).add(toArtistUid));
      if (onInviteSent) {
        onInviteSent(toArtistUid);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to send invite";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-lg">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          aria-label="Close"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Invite Artist</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Invite another artist to join your live stream for a collaborative session.
          </p>
        </div>

        {/* Search Input */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by artist name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none disabled:opacity-50"
          />
          {isSearching && (
            <p className="mt-1 text-xs text-zinc-500">Searching...</p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg border border-rose-900/40 bg-rose-950/40 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {/* Results */}
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {artists.length === 0 ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 text-center">
              <p className="text-sm text-zinc-400">
                {searchQuery.trim()
                  ? "No artists found"
                  : "Start typing to search for artists"}
              </p>
            </div>
          ) : (
            artists.map((artist) => (
              <div
                key={artist.uid}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3"
              >
                <div className="flex items-center gap-3 flex-1">
                  {artist.avatarUrl && (
                    <Image
                      src={artist.avatarUrl}
                      alt={artist.displayName}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      {artist.displayName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleInvite(artist.uid)}
                  disabled={
                    isLoading || invitedArtists.has(artist.uid)
                  }
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                    invitedArtists.has(artist.uid)
                      ? "border border-emerald-900/40 bg-emerald-950/40 text-emerald-200"
                      : "border border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
                  }`}
                >
                  {invitedArtists.has(artist.uid) ? "✓ Invited" : "Invite"}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Close Button */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Component to display and manage pending invites for the artist
 */
export function PendingInvites({ token, onAcceptAction }: { token: string; onAcceptAction?: (sessionId: string) => void }) {
  const [invites, setInvites] = useState<LiveInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvites = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/live/manage-invites", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch invites");
      }

      const data = await response.json();
      setInvites(data.invites || []);
    } catch (err) {
      console.error("Failed to load invites", err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleRespond = async (
    inviteId: string,
    action: "accept" | "decline"
  ) => {
    try {
      const response = await fetch("/api/live/manage-invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, inviteId }),
      });

      if (!response.ok) {
        throw new Error("Failed to respond to invite");
      }

      const data = await response.json();

      if (action === "accept" && onAcceptAction && data.sessionId) {
        onAcceptAction(data.sessionId);
      }

      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to respond";
      console.error(errorMsg);
    }
  };

  if (isLoading) return null;
  if (invites.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-zinc-300">Live Invites</p>
      {invites.map((invite) => (
        <div
          key={invite.id}
          className="rounded-lg border border-amber-900/40 bg-amber-950/40 p-3"
        >
          <p className="text-sm text-amber-200">
            {invite.fromArtistName} invited you to go live
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => handleRespond(invite.id, "accept")}
              className="flex-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500"
            >
              Accept
            </button>
            <button
              onClick={() => handleRespond(invite.id, "decline")}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
