"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type UploadFabProps = {
  canUploadSongs: boolean;
  canUploadVideos: boolean;
};

export function UploadFab({ canUploadSongs, canUploadVideos }: UploadFabProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <div ref={wrapperRef} className="fixed bottom-6 right-6 z-40">
      {open ? (
        <div className="mb-3 w-44 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
          {canUploadSongs ? (
            <Link
              href="/artist/dashboard/music/new"
              className="block px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-900"
              onClick={() => setOpen(false)}
            >
              Upload Song
            </Link>
          ) : null}
          {canUploadVideos ? (
            <Link
              href="/artist/dashboard/videos/new"
              className="block px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-900"
              onClick={() => setOpen(false)}
            >
              Upload Video
            </Link>
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-2xl text-white shadow-lg shadow-violet-600/30 hover:bg-violet-500"
        aria-label="Upload"
      >
        ➕
      </button>
    </div>
  );
}
