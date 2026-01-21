"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ActionState = { ok: boolean; error?: string; songId?: string };

type UploadSongFormProps = { artistName?: string };

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MAX_AUDIO_SECONDS = 6 * 60;

function isMp3File(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();

  // Some browsers/devices report an empty type or application/octet-stream.
  // Accept MP3s by extension in those cases.
  const byType = type === "audio/mpeg" || type === "audio/mp3";
  const byExt = name.endsWith(".mp3");
  return byType || (byExt && (type === "" || type === "application/octet-stream"));
}

const GENRES = [
  "Afrobeat",
  "Hip-Hop",
  "Gospel",
  "Dancehall",
  "Love / Romantic",
  "Chill",
  "Throwback",
  "Traditional",
  "Other",
];

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
          <span>Your song is being prepared and will appear shortly.</span>
        </div>
      ) : null}
    </div>
  );
}

function isProbablyInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = (navigator.userAgent || "").toLowerCase();
  return (
    ua.includes("instagram") ||
    ua.includes("fbav") ||
    ua.includes("fban") ||
    ua.includes("twitter") ||
    ua.includes("linkedinapp") ||
    ua.includes("snapchat")
  );
}

function tryOpenFilePicker(inputId: string) {
  const el = document.getElementById(inputId);
  if (!(el instanceof HTMLInputElement)) return;

  // Newer Chromium-based browsers expose showPicker().
  const anyEl = el as unknown as { showPicker?: () => void };
  if (typeof anyEl.showPicker === "function") {
    anyEl.showPicker();
    return;
  }

  el.click();
}

export function UploadSongForm({ artistName: initialArtistName }: UploadSongFormProps) {
  const router = useRouter();
  const artistName = (initialArtistName ?? "").trim();
  const inAppBrowser = useMemo(() => isProbablyInAppBrowser(), []);
  const [state, setState] = useState<ActionState>({ ok: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasSubmitted = isSubmitting || state.ok;
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const audioInputId = "audioFile";
  const coverInputId = "coverImage";

  const canSubmit = useMemo(() => {
    return Boolean(audioFile) && !audioError && title.trim().length > 0 && genre.length > 0 && artistName.length > 0;
  }, [audioFile, audioError, title, genre, artistName]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !audioFile) return;

    setIsSubmitting(true);
    setState({ ok: true });

    try {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("genre", genre);
      formData.set("artistName", artistName);

      const description = String(
        (event.currentTarget.elements.namedItem("description") as HTMLTextAreaElement | null)
          ?.value ?? "",
      );
      formData.set("description", description);
      formData.set("audioFile", audioFile);
      if (coverFile) formData.set("coverImage", coverFile);

      const res = await fetch("/api/music/upload-song", {
        method: "POST",
        body: formData,
      });

      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; songId?: string }
        | null;

      if (!res.ok) {
        throw new Error(body?.error ?? "Upload failed");
      }

      const songId = body?.songId;
      setState({ ok: true, songId });
      router.replace(songId ? `/artist/dashboard/music/${songId}/edit` : "/artist/dashboard/music");
    } catch (err) {
      setState({ ok: false, error: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!audioPreviewUrl) return;
    return () => {
      URL.revokeObjectURL(audioPreviewUrl);
    };
  }, [audioPreviewUrl]);

  useEffect(() => {
    if (!coverPreviewUrl) return;
    return () => {
      URL.revokeObjectURL(coverPreviewUrl);
    };
  }, [coverPreviewUrl]);

  const handleAudioSelect = (nextFile: File | null) => {
    if (!nextFile) return;

    if (!isMp3File(nextFile)) {
      setAudioError("Only MP3 files are supported.");
      setAudioFile(null);
      setAudioDuration(null);
      setAudioPreviewUrl(null);
      return;
    }

    if (nextFile.size > MAX_AUDIO_BYTES) {
      setAudioError("Song must be under 20 MB.");
      setAudioFile(null);
      setAudioDuration(null);
      setAudioPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(nextFile);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.src = objectUrl;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    audio.onloadedmetadata = () => {
      cleanup();
      const seconds = audio.duration;
      if (!Number.isFinite(seconds)) {
        setAudioError("Could not read the song duration.");
        setAudioFile(null);
        setAudioDuration(null);
        setAudioPreviewUrl(null);
        return;
      }
      if (seconds > MAX_AUDIO_SECONDS) {
        setAudioError("Song must be 6 minutes or less.");
        setAudioFile(null);
        setAudioDuration(null);
        setAudioPreviewUrl(null);
        return;
      }
      setAudioError(null);
      setAudioFile(nextFile);
      setAudioDuration(seconds);
      setAudioPreviewUrl(URL.createObjectURL(nextFile));
    };
  };

  const handleCoverSelect = (nextFile: File | null) => {
    if (!nextFile) return;
    if (!nextFile.type.startsWith("image/")) {
      return;
    }
    setCoverFile(nextFile);
    setCoverPreviewUrl(URL.createObjectURL(nextFile));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 shadow-sm"
    >
      <div className="grid gap-5">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-zinc-200">Audio File</div>
          {inAppBrowser ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              File uploads may not work inside in-app browsers. Open this page in Chrome for reliable uploads.
              <div className="mt-2">
                <a
                  href={`intent://${typeof window !== "undefined" ? window.location.host + window.location.pathname + window.location.search : "dashboard-artist.vercel.app"}#Intent;scheme=https;package=com.android.chrome;end`}
                  className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-2 text-xs font-semibold text-zinc-900"
                >
                  Open in Chrome
                </a>
              </div>
            </div>
          ) : null}
          <label
            htmlFor={audioInputId}
            className={
              "relative flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-left transition " +
              (audioFile
                ? "border-violet-500/60 bg-violet-500/10"
                : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700")
            }
            onClick={(event) => {
              if (!inAppBrowser) return;
              event.preventDefault();
              tryOpenFilePicker(audioInputId);
            }}
            onTouchEnd={(event) => {
              if (!inAppBrowser) return;
              event.preventDefault();
              tryOpenFilePicker(audioInputId);
            }}
          >
            <div className="text-base font-semibold text-white">🎵 Tap to select song</div>
            <div className="text-sm text-zinc-400">MP3 only • Max 20MB • Up to 6 minutes</div>
            <input
              id={audioInputId}
              type="file"
              name="audioFile"
              accept="audio/mpeg,audio/mp3"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              onChange={(event) => handleAudioSelect(event.target.files?.[0] ?? null)}
            />
          </label>

          {audioError ? <div className="text-sm text-rose-300">{audioError}</div> : null}

          {audioFile ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{audioFile.name}</div>
                <div className="mt-1 text-xs text-zinc-400">
                  {formatDuration(audioDuration)} • {formatBytes(audioFile.size)}
                </div>
                {audioPreviewUrl ? (
                  <audio className="mt-2 w-full" src={audioPreviewUrl} controls preload="metadata" />
                ) : null}
              </div>
              <label
                htmlFor={audioInputId}
                className="cursor-pointer rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900"
              >
                Change song
              </label>
            </div>
          ) : null}
        </div>

        <label className="block">
          <div className="text-sm font-medium text-zinc-200">Song Title</div>
          <input
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example: My New Love Song"
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
            required
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium text-zinc-200">Artist Name</div>
          <input
            name="artistName"
            value={artistName}
            readOnly
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-300 outline-none"
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium text-zinc-200">Genre / Category</div>
          <select
            name="genre"
            value={genre}
            onChange={(event) => setGenre(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
            required
          >
            <option value="" disabled>
              Select genre
            </option>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-2">
          <div className="text-sm font-medium text-zinc-200">Cover Image (optional)</div>
          <label
            htmlFor={coverInputId}
            className="relative flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 px-4 py-4 text-left text-sm text-zinc-400 hover:border-zinc-700"
          >
            <span>🖼️ Upload cover image</span>
            <span>JPG / PNG</span>
            <input
              id={coverInputId}
              type="file"
              name="coverImage"
              accept="image/jpeg,image/png"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              onChange={(event) => handleCoverSelect(event.target.files?.[0] ?? null)}
            />
          </label>

          {coverFile ? (
            <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
              <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                {coverPreviewUrl ? (
                  <Image
                    src={coverPreviewUrl}
                    alt="Cover preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{coverFile.name}</div>
                <div className="mt-1 text-xs text-zinc-400">{formatBytes(coverFile.size)}</div>
              </div>
              <label
                htmlFor={coverInputId}
                className="cursor-pointer rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900"
              >
                Change cover
              </label>
            </div>
          ) : null}
        </div>

        <label className="block">
          <div className="text-sm font-medium text-zinc-200">Description</div>
          <textarea
            name="description"
            placeholder="Tell fans about this song…"
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
            rows={4}
          />
        </label>

        <div className="text-sm text-zinc-400">
          ℹ️ Your song will be optimized to save data while keeping good sound quality.
        </div>

        {state.error ? <div className="text-sm text-rose-300">{state.error}</div> : null}

        <div className="flex items-center justify-between gap-3">
          <a
            href="/artist/dashboard/music"
            className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
          >
            Cancel
          </a>
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className={
              "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition " +
              (!canSubmit || isSubmitting
                ? "cursor-not-allowed bg-zinc-800 text-zinc-400"
                : "bg-violet-600 text-white hover:bg-violet-500")
            }
          >
            {isSubmitting ? "Uploading…" : "Upload Song"}
          </button>
        </div>

        <UploadProgress isSubmitting={isSubmitting} hasSubmitted={hasSubmitted} />
      </div>
    </form>
  );
}
