import Link from "next/link";

import { requireArtistSession } from "../../../../lib/auth/artist";
import { listVideos } from "../../../../lib/content/videos";
import { StatusBadge } from "../music/_components/StatusBadge";

export default async function ArtistVideosPage() {
  const session = await requireArtistSession();
  const videos = await listVideos(session.user.uid);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Videos</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Upload videos, edit metadata, and track moderation status.
          </p>
        </div>

        <Link
          href="/artist/dashboard/videos/new"
          className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          Upload video
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/40 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950/40 text-xs text-zinc-400">
            <tr>
              <th className="px-3 py-2">Video</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Views</th>
              <th className="px-3 py-2">Likes</th>
              <th className="px-3 py-2">Comments</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {videos.length === 0 ? (
              <tr className="border-t border-zinc-900">
                <td className="px-3 py-3 text-zinc-300" colSpan={6}>
                  No videos yet.
                </td>
              </tr>
            ) : (
              videos.map((v) => (
                <tr key={v.id} className="border-t border-zinc-900">
                  <td className="px-3 py-3">
                    <div className="font-medium text-white">{v.title}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      Updated {new Date(v.updatedAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className="px-3 py-3 text-zinc-300">{v.views ?? 0}</td>
                  <td className="px-3 py-3 text-zinc-300">{v.likes ?? 0}</td>
                  <td className="px-3 py-3 text-zinc-300">{v.comments ?? 0}</td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/artist/dashboard/videos/${v.id}/edit`}
                      className="rounded-lg border border-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-zinc-500">
        Tip: for full video watermark downloads, add a server-side media pipeline.
      </div>
    </div>
  );
}
