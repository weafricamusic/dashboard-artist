import Image from "next/image";

import Link from "next/link";

import { requireArtistSession } from "../../../../lib/auth/artist";
import { listSongs } from "../../../../lib/content/songs";
import { listVideos } from "../../../../lib/content/videos";
import { getArtistSubscriptionStatus } from "../../../../lib/subscriptions/artist";
import { hasFeature } from "../../../../lib/subscriptions/features";
import { UploadFab } from "./UploadFab";

type UploadTab = "all" | "songs" | "videos";

type UploadItem = {
  id: string;
  type: "song" | "video";
  title: string;
  createdAt: string;
  status: string;
  durationSeconds?: number | null;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  rejectionReason?: string | null;
};

function formatDuration(seconds?: number | null): string {
  if (!seconds || !Number.isFinite(seconds)) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function normalizeStatus(status: string): "processing" | "published" | "rejected" {
  const normalized = status.toLowerCase();
  if (normalized === "published") return "published";
  if (normalized === "rejected") return "rejected";
  return "processing";
}

function StatusBadge({ status }: { status: "processing" | "published" | "rejected" }) {
  const styles =
    status === "published"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      : status === "rejected"
        ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
        : "border-amber-500/40 bg-amber-500/10 text-amber-200";

  const label = status === "published" ? "Published" : status === "rejected" ? "Rejected" : "Processing";

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${styles}`}>{label}</span>;
}

export default async function MyUploadsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireArtistSession();
  const { tab: tabParam } = await searchParams;
  const tab = (tabParam ?? "all") as UploadTab;

  const [songs, videos, subscription] = await Promise.all([
    listSongs(session.user.uid),
    listVideos(session.user.uid),
    getArtistSubscriptionStatus(session.user.uid),
  ]);

  const canUploadSongs = hasFeature(subscription.features, "uploads.songs", true);
  const canUploadVideos = hasFeature(subscription.features, "uploads.videos", true);

  const songItems: UploadItem[] = songs.map((song) => ({
    id: song.id,
    type: "song",
    title: song.title || "Untitled",
    createdAt: song.createdAt,
    status: song.status,
    durationSeconds: (song as { duration?: number | null }).duration ?? null,
    thumbnailUrl: song.coverImageUrl ?? null,
  }));

  const videoItems: UploadItem[] = videos.map((video) => ({
    id: video.id,
    type: "video",
    title: video.title || "Untitled",
    createdAt: video.createdAt,
    status: video.status,
    durationSeconds: (video as { duration?: number | null }).duration ?? null,
    thumbnailUrl: video.thumbnailUrl ?? null,
    videoUrl: video.videoUrl ?? null,
    rejectionReason: (video as { rejectionReason?: string | null }).rejectionReason ?? null,
  }));

  const allItems = [...songItems, ...videoItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const filteredItems = allItems.filter((item) => {
    if (tab === "songs") return item.type === "song";
    if (tab === "videos") return item.type === "video";
    return true;
  });

  const hasItems = filteredItems.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">My Uploads</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage your songs and videos</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {([
          { label: "All", value: "all" },
          { label: "Songs", value: "songs" },
          { label: "Videos", value: "videos" },
        ] as const).map((item) => {
          const isActive = tab === item.value;
          return (
            <Link
              key={item.value}
              href={`/artist/dashboard/uploads?tab=${item.value}`}
              className={
                "rounded-full px-4 py-2 text-sm font-semibold transition " +
                (isActive
                  ? "bg-white text-zinc-900"
                  : "border border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:border-zinc-700")
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {hasItems ? (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const status = normalizeStatus(item.status);
            const isSong = item.type === "song";
            const editHref = isSong
              ? `/artist/dashboard/music/${item.id}/edit`
              : `/artist/dashboard/videos/${item.id}/edit`;
            const viewHref = !isSong && item.videoUrl ? item.videoUrl : editHref;

            return (
              <div
                key={`${item.type}-${item.id}`}
                className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm md:flex-row md:items-center"
              >
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                    {item.thumbnailUrl ? (
                      <Image
                        src={item.thumbnailUrl}
                        alt=""
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl">
                        {isSong ? "🎵" : "🎥"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-white">{item.title}</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {isSong ? "🎵 Song" : "🎥 Video"} • {formatDuration(item.durationSeconds)} • Uploaded {formatDate(item.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col items-start gap-3 md:items-end">
                  <StatusBadge status={status} />

                  {status === "processing" ? (
                    <div className="text-xs text-zinc-400">
                      Processing… your upload will be available shortly.
                    </div>
                  ) : null}

                  {status === "published" ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={viewHref}
                        target={!isSong && item.videoUrl ? "_blank" : undefined}
                        rel={!isSong && item.videoUrl ? "noreferrer" : undefined}
                        className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
                      >
                        View
                      </a>
                      <Link
                        href={editHref}
                        className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
                      >
                        Edit details
                      </Link>
                    </div>
                  ) : null}

                  {status === "rejected" ? (
                    <div className="w-full text-xs text-rose-200">
                      ❌ Rejected{item.rejectionReason ? `: ${item.rejectionReason}` : ": Please update and re-upload."}
                    </div>
                  ) : null}

                  {status === "rejected" ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={editHref}
                        className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
                      >
                        Edit & re-upload
                      </Link>
                      <Link
                        href={editHref}
                        className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
                      >
                        Replace file
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/40 p-10 text-center">
          <div className="text-4xl">📂</div>
          <div className="mt-3 text-lg font-semibold text-white">You haven’t uploaded anything yet</div>
          <div className="mt-1 text-sm text-zinc-400">Tap Upload to share your first song or video</div>
        </div>
      )}

      <UploadFab canUploadSongs={canUploadSongs} canUploadVideos={canUploadVideos} />
    </div>
  );
}
