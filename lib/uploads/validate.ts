import "server-only";

export type UploadType = "song" | "video";

export function sanitizeFilename(input: string): string {
  const trimmed = input.trim();
  const base = trimmed.split("/").pop()?.split("\\").pop() ?? "file";
  const safe = base.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return safe.length > 80 ? safe.slice(safe.length - 80) : safe;
}

export function getExtFromFilename(name: string): string | null {
  const idx = name.lastIndexOf(".");
  if (idx <= 0) return null;
  const ext = name.slice(idx + 1).toLowerCase();
  return ext || null;
}

export function isAllowedUpload(
  type: UploadType,
  ext: string,
  contentType: string | null,
): boolean {
  const ct = (contentType ?? "").toLowerCase();
  if (type === "song") {
    return (
      ext === "mp3" ||
      ext === "wav" ||
      ct === "audio/mpeg" ||
      ct === "audio/mp3" ||
      ct === "audio/wav" ||
      ct === "audio/x-wav"
    );
  }

  return (
    ext === "mp4" ||
    ext === "mov" ||
    ct === "video/mp4" ||
    ct === "video/quicktime"
  );
}

export function originalStoragePathForUpload(input: {
  type: UploadType;
  artistUid: string;
  uploadId: string;
  fileName: string;
}): string {
  const folder = input.type === "video" ? "original/videos" : "original/songs";
  return `${folder}/${input.artistUid}/${input.uploadId}-${input.fileName}`;
}
