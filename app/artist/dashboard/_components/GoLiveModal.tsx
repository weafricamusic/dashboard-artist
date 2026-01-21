"use client";

import { useCallback, useEffect, useState } from "react";

interface GoLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoLive: (data: { title: string; notes: string }) => Promise<void>;
  isLoading?: boolean;
}

export function GoLiveModal({ isOpen, onClose, onGoLive, isLoading = false }: GoLiveModalProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [permissionsError, setPermissionsError] = useState("");
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);

  // Check camera and microphone permissions
  const checkPermissions = useCallback(async () => {
    setIsCheckingPermissions(true);
    setPermissionsError("");
    try {
      const cameraPermission = await navigator.permissions.query({ name: "camera" as PermissionName });
      const micPermission = await navigator.permissions.query({ name: "microphone" as PermissionName });

      if (
        cameraPermission.state === "denied" ||
        micPermission.state === "denied"
      ) {
        setPermissionsError(
          "Camera or microphone permissions were denied. Please enable them in your browser settings."
        );
        setHasPermissions(false);
      } else if (
        cameraPermission.state === "granted" &&
        micPermission.state === "granted"
      ) {
        setHasPermissions(true);
      } else {
        // Prompt for permissions if not yet granted
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: { facingMode: "user" },
          });
          // Stop the stream once we have permission
          stream.getTracks().forEach((track) => track.stop());
          setHasPermissions(true);
          setPermissionsError("");
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Failed to get permissions";
          setPermissionsError(`Permission error: ${errorMessage}`);
          setHasPermissions(false);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to check permissions";
      setPermissionsError(`Error checking permissions: ${errorMessage}`);
      setHasPermissions(false);
    } finally {
      setIsCheckingPermissions(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      checkPermissions();
    }
  }, [isOpen, checkPermissions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Stream title is required");
      return;
    }

    if (!hasPermissions) {
      setError("Camera and microphone permissions are required");
      return;
    }

    try {
      await onGoLive({ title: title.trim(), notes: notes.trim() });
      setTitle("");
      setNotes("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start live stream";
      setError(errorMessage);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-lg">
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
          <h2 className="text-2xl font-bold text-white">Go Live</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Start a live stream and engage your fans in real-time.
          </p>
        </div>

        {/* Permissions Status */}
        <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${
                hasPermissions ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <div>
              <p className="text-sm font-medium text-white">Permissions</p>
              <p className="text-xs text-zinc-400">
                {isCheckingPermissions
                  ? "Checking..."
                  : hasPermissions
                    ? "✓ Camera and microphone ready"
                    : "⚠ Enable camera and microphone to proceed"}
              </p>
            </div>
          </div>
          {permissionsError && (
            <p className="mt-2 text-xs text-rose-400">{permissionsError}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title Input */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-zinc-200">
              Stream Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              placeholder="e.g., Late night freestyle session"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none"
              disabled={isLoading}
            />
          </div>

          {/* Notes/Description */}
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-zinc-200"
            >
              Description (optional)
            </label>
            <textarea
              id="notes"
              placeholder="What's happening on this stream?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none"
              disabled={isLoading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-rose-900/40 bg-rose-950/40 p-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !hasPermissions || isCheckingPermissions}
              className="flex-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:bg-rose-700 disabled:opacity-50"
            >
              {isLoading ? "Starting..." : "🔴 Go Live"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
