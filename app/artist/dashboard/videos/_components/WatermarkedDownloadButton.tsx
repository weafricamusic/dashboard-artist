"use client";

import { useState } from "react";

async function downloadWatermarkedImage(url: string, filename: string) {
  const img = new Image();
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(img, 0, 0);

  // Watermark
  const pad = Math.max(16, Math.floor(canvas.width * 0.02));
  const fontSize = Math.max(18, Math.floor(canvas.width * 0.04));
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  ctx.textBaseline = "bottom";

  const text = "WeAfrica Music";
  const metrics = ctx.measureText(text);
  const boxW = metrics.width + pad * 2;
  const boxH = fontSize + pad;

  const x = canvas.width - boxW - pad;
  const y = canvas.height - pad;

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x, y - boxH, boxW, boxH);

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillText(text, x + pad, y - pad / 2);

  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function WatermarkedDownloadButton({
  imageUrl,
  filename,
}: {
  imageUrl?: string;
  filename: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!imageUrl) {
    return (
      <button
        type="button"
        className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-400"
        disabled
      >
        Download watermark
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        className="rounded-lg border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50"
        onClick={async () => {
          setError(null);
          setLoading(true);
          try {
            await downloadWatermarkedImage(imageUrl, filename);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed");
          } finally {
            setLoading(false);
          }
        }}
        disabled={loading}
      >
        {loading ? "Preparing…" : "Download watermark"}
      </button>
      {error ? <div className="text-xs text-red-700">{error}</div> : null}
    </div>
  );
}
