import Link from "next/link";

import { requireArtistSession } from "../../../../lib/auth/artist";
import { listSongs } from "../../../../lib/content/songs";
import { type ContentStatus, type Song } from "../../../../lib/content/types";
import { StatusBadge } from "./_components/StatusBadge";

function matchesQuery(song: Song, query: string): boolean {
  const q = query.toLowerCase();
  return (
    song.title.toLowerCase().includes(q) ||
    (song.genre ?? "").toLowerCase().includes(q) ||
    song.tags.some((t) => t.toLowerCase().includes(q))
  );
}

function matchesStatus(song: Song, status: string): boolean {
  if (!status) return true;
  return song.status === (status as ContentStatus);
}

function matchesGenre(song: Song, genre: string): boolean {
  if (!genre) return true;
  return (song.genre ?? "").toLowerCase() === genre.toLowerCase();
}

function sortSongs(songs: Song[], sort: string): Song[] {
  const copy = [...songs];
  if (sort === "popularity") {
    copy.sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0));
  } else if (sort === "releaseDate") {
    copy.sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
  } else {
    // updated
    copy.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  }
  return copy;
}

export default async function ArtistMusicPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; genre?: string; sort?: string }>;
}) {
  const session = await requireArtistSession();
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const status = (sp.status ?? "").trim();
  const genre = (sp.genre ?? "").trim();
  const sort = (sp.sort ?? "updated").trim();

  const allSongs = await listSongs(session.user.uid);

  const genres = Array.from(
    new Set(allSongs.map((s) => (s.genre ?? "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  const filtered = sortSongs(
    allSongs
      .filter((s) => (q ? matchesQuery(s, q) : true))
      .filter((s) => matchesStatus(s, status))
      .filter((s) => matchesGenre(s, genre)),
    sort,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Songs</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage your songs: edit metadata, set status, and organize into albums/playlists.
          </p>
        </div>

        <Link
          href="/artist/dashboard/music/new"
          className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          Upload song
        </Link>
      </div>

      <form className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm md:grid-cols-4">
        <label className="block md:col-span-2">
          <div className="text-xs font-medium text-zinc-400">Search</div>
          <input
            name="q"
            defaultValue={q}
            placeholder="Title, genre, tags..."
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
          />
        </label>

        <label className="block">
          <div className="text-xs font-medium text-zinc-400">Status</div>
          <select
            name="status"
            defaultValue={status}
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="published">Published</option>
          </select>
        </label>

        <label className="block">
          <div className="text-xs font-medium text-zinc-400">Genre</div>
          <select
            name="genre"
            defaultValue={genre}
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
          >
            <option value="">All</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-xs font-medium text-zinc-400">Sort</div>
          <select
            name="sort"
            defaultValue={sort}
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
          >
            <option value="updated">Recently updated</option>
            <option value="releaseDate">Release date</option>
            <option value="popularity">Popularity</option>
          </select>
        </label>

        <div className="md:col-span-4 flex items-center justify-between gap-3">
          <div className="text-xs text-zinc-500">{filtered.length} song(s)</div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500"
              type="submit"
            >
              Apply
            </button>
            <Link
              href="/artist/dashboard/music"
              className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
            >
              Reset
            </Link>
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/40 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950/40 text-xs text-zinc-400">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Release date</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Plays</th>
              <th className="px-3 py-2">Likes</th>
              <th className="px-3 py-2">Comments</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr className="border-t border-zinc-900">
                <td className="px-3 py-3 text-zinc-300" colSpan={7}>
                  No songs found.
                </td>
              </tr>
            ) : (
              filtered.map((song) => (
                <tr key={song.id} className="border-t border-zinc-900">
                  <td className="px-3 py-3">
                    <div className="font-medium text-white">{song.title}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {(song.genre ?? "").trim() ? `${song.genre} • ` : ""}
                      Updated {new Date(song.updatedAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-zinc-300">{song.releaseDate || "—"}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={song.status} />
                  </td>
                  <td className="px-3 py-3 text-zinc-300">{song.plays ?? 0}</td>
                  <td className="px-3 py-3 text-zinc-300">{song.likes ?? 0}</td>
                  <td className="px-3 py-3 text-zinc-300">{song.comments ?? 0}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/artist/dashboard/music/${song.id}/edit`}
                        className="rounded-lg border border-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
                      >
                        Edit
                      </Link>
                      <Link
                        href="/artist/dashboard/playlists"
                        className="rounded-lg border border-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
                      >
                        Add to playlist
                      </Link>
                      <Link
                        href="/artist/dashboard/promotions"
                        className="rounded-lg border border-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
                      >
                        Promote
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-zinc-500">
        Note: plays/likes/comments are stored on the song doc for now. We can wire them to
        Supabase analytics later.
      </div>
    </div>
  );
}
