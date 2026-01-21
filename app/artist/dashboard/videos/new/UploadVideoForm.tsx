"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ActionState = {
  ok: boolean;
  error?: string;
  videoId?: string;
};

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 60;

function isMp4OrMovFile(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();

  // iOS often reports camera videos as video/quicktime (.mov).
  const byType = type === "video/mp4" || type === "video/quicktime";
  const byExt = name.endsWith(".mp4") || name.endsWith(".mov");
  return byType || (byExt && (type === "" || type === "application/octet-stream"));
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || !Number.isFinite(seconds)) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function UploadProgress({ isSubmitting, hasSubmitted }: { isSubmitting: boolean; hasSubmitted: boolean }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    if (isSubmitting) {
      timeoutId = setTimeout(() => setProgress(4), 0);
      intervalId = setInterval(() => {
        setProgress((prev) => Math.min(90, prev + Math.random() * 8 + 4));
      }, 350);
    } else if (hasSubmitted) {
      timeoutId = setTimeout(() => setProgress(100), 0);
    } else {
      timeoutId = setTimeout(() => setProgress(0), 0);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSubmitting, hasSubmitted]);

  if (!isSubmitting && !hasSubmitted) return null;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>{isSubmitting ? "Uploading…" : "Processing…"}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
        <div
          className="h-full rounded-full bg-violet-500 transition-all"
          style={{ width: `${Math.round(progress)}%` }}
        />
      </div>
      {!isSubmitting && hasSubmitted ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300">
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-200">
            Processing
          </span>
          <span>Your video is being processed and will appear shortly.</span>
        </div>
      ) : null}
    </div>
  );
}

function SubmitButton({ disabled, isSubmitting }: { disabled: boolean; isSubmitting: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled || isSubmitting}
      className={
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition " +
        (disabled || isSubmitting
          ? "cursor-not-allowed bg-zinc-800 text-zinc-400"
          : "bg-violet-600 text-white hover:bg-violet-500")
      }
    >
      {isSubmitting ? "Uploading…" : "Upload Video"}
    </button>
  );
}

export function UploadVideoForm() {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({ ok: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasSubmitted = isSubmitting || state.ok;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputId = "videoFile";

  const canSubmit = useMemo(() => {
    return Boolean(file) && !error && title.trim().length > 0;
  }, [file, error, title]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleSelect = async (nextFile: File | null) => {
    if (!nextFile) return;

    if (!isMp4OrMovFile(nextFile)) {
      setError("Only MP4 or MOV videos are supported.");
      setFile(null);
      setDuration(null);
      setPreviewUrl(null);
      return;
    }

    if (nextFile.size > MAX_VIDEO_BYTES) {
      setError("Video must be under 50 MB.");
      setFile(null);
      setDuration(null);
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(nextFile);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = objectUrl;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    video.onloadedmetadata = () => {
      cleanup();
      const seconds = video.duration;
      if (!Number.isFinite(seconds)) {
        setError("Could not read the video duration.");
        setFile(null);
        setDuration(null);
        setPreviewUrl(null);
        return;
      }
      if (seconds > MAX_VIDEO_SECONDS) {
        setError("Video must be 60 seconds or less.");
        setFile(null);
        setDuration(null);
        setPreviewUrl(null);
        return;
      }
      setError(null);
      setFile(nextFile);
      setDuration(seconds);
      setPreviewUrl(URL.createObjectURL(nextFile));
    };
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !file) return;

    setIsSubmitting(true);
    setState({ ok: true });

    try {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("description", description);
      formData.set("videoFile", file);

      const res = await fetch("/api/videos/upload-video", {
        method: "POST",
        body: formData,
      });

      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; videoId?: string }
        | null;

      if (!res.ok) {
        throw new Error(body?.error ?? "Upload failed");
      }

      const videoId = body?.videoId;
      setState({ ok: true, videoId });
      router.replace(videoId ? `/artist/dashboard/videos/${videoId}/edit` : "/artist/dashboard/videos");
    } catch (err) {
      setState({ ok: false, error: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 shadow-sm"
    >
      <div className="grid gap-5">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-zinc-200">Video File</div>
          <label
            htmlFor={inputId}
            className={
              "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-left transition " +
              (file
                ? "border-violet-500/60 bg-violet-500/10"
                : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700")
            }
          >
            <div className="text-base font-semibold text-white">📹 Tap to select video</div>
            <div className="text-sm text-zinc-400">MP4 only • Max 60 seconds • 720p max</div>
            <input
              id={inputId}
              type="file"
              name="videoFile"
              accept="video/mp4,video/quicktime,.mp4,.mov"
              className="sr-only"
              onChange={(event) => handleSelect(event.target.files?.[0] ?? null)}
            />
          </label>

          {error ? <div className="text-sm text-rose-300">{error}</div> : null}

          {file ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
              <div className="h-20 w-32 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                {previewUrl ? (
                  <video
                    className="h-full w-full object-cover"
                    src={previewUrl}
                    muted
                    playsInline
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{file.name}</div>
                <div className="mt-1 text-xs text-zinc-400">
                  {formatDuration(duration)} • {formatBytes(file.size)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => document.getElementById(inputId)?.click()}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900"
              >
                Change video
              </button>
            </div>
          ) : null}
        </div>

        <label className="block">
          <div className="text-sm font-medium text-zinc-200">Video Title</div>
          <input
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example: New Song Teaser"
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
            required
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium text-zinc-200">Description</div>
          <textarea
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Tell fans what this video is about…"
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
            rows={4}
          />
        </label>

        <div className="text-sm text-zinc-400">
          ℹ️ Your video will be optimized to save data and stream smoothly on mobile networks.
        </div>

        {state.error ? <div className="text-sm text-rose-300">{state.error}</div> : null}

        <div className="flex items-center justify-between gap-3">
          <a
            href="/artist/dashboard/videos"
            className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
          >
            Cancel
          </a>
          <SubmitButton disabled={!canSubmit} isSubmitting={isSubmitting} />
        </div>

        <UploadProgress isSubmitting={isSubmitting} hasSubmitted={hasSubmitted} />
      </div>
    </form>
  );
}
