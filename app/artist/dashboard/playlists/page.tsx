import Link from "next/link";

import { requireArtistSession } from "../../../../lib/auth/artist";
import { listPlaylists } from "../../../../lib/content/playlists";

export default async function PlaylistsPage() {
  const session = await requireArtistSession();
  const playlists = await listPlaylists(session.user.uid);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Albums / Playlists</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Create albums/playlists and assign songs.
          </p>
        </div>

        <Link
          href="/artist/dashboard/playlists/new"
          className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          Add new
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/40 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950/40 text-xs text-zinc-400">
            <tr>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Songs</th>
              <th className="px-3 py-2">Updated</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {playlists.length === 0 ? (
              <tr className="border-t border-zinc-900">
                <td className="px-3 py-3 text-zinc-300" colSpan={5}>
                  No albums/playlists yet.
                </td>
              </tr>
            ) : (
              playlists.map((p) => (
                <tr key={p.id} className="border-t border-zinc-900">
                  <td className="px-3 py-3 text-zinc-300">
                    {p.type === "album" ? "Album" : "Playlist"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-white">{p.title}</div>
                    {p.description ? (
                      <div className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
                        {p.description}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-zinc-300">{p.songIds.length}</td>
                  <td className="px-3 py-3 text-zinc-300">
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/artist/dashboard/playlists/${p.id}/edit`}
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
        Notes: album/playlist cover uploads can be integrated later; currently uses URL.
      </div>
    </div>
  );
}
