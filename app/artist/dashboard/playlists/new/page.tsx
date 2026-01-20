import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireArtistSession } from "../../../../../lib/auth/artist";
import { listSongs } from "../../../../../lib/content/songs";
import { createPlaylist } from "../../../../../lib/content/playlists";
import { type PlaylistType } from "../../../../../lib/content/types";

export default async function NewPlaylistPage() {
  const session = await requireArtistSession();
  const songs = await listSongs(session.user.uid);

  async function action(formData: FormData) {
    "use server";

    const session = await requireArtistSession();

    const type = String(formData.get("type") ?? "playlist") as PlaylistType;
    const title = String(formData.get("title") ?? "").trim();
    if (!title) throw new Error("Title is required");

    const description = String(formData.get("description") ?? "").trim();
    const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim();

    const songIds = Array.from(formData.keys())
      .filter((k) => k.startsWith("song:"))
      .map((k) => k.slice("song:".length));

    const playlistId = await createPlaylist(session.user.uid, {
      type,
      title,
      description: description || undefined,
      coverImageUrl: coverImageUrl || undefined,
      songIds,
    });

    revalidatePath("/artist/dashboard/playlists");
    redirect(`/artist/dashboard/playlists/${playlistId}/edit`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">New album / playlist</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Create an album/playlist and assign songs.
        </p>
      </div>

      <form action={action} className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <div className="text-sm font-medium text-zinc-200">Type</div>
            <select
              name="type"
              defaultValue="playlist"
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
            >
              <option value="playlist">Playlist</option>
              <option value="album">Album</option>
            </select>
          </label>

          <label className="block">
            <div className="text-sm font-medium text-zinc-200">Title</div>
            <input
              name="title"
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
              required
            />
          </label>

          <label className="block md:col-span-2">
            <div className="text-sm font-medium text-zinc-200">Description</div>
            <textarea
              name="description"
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
              rows={3}
            />
          </label>

          <label className="block md:col-span-2">
            <div className="text-sm font-medium text-zinc-200">Cover image URL</div>
            <input
              name="coverImageUrl"
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
              placeholder="https://..."
            />
          </label>
        </div>

        <div className="mt-6">
          <div className="text-sm font-medium text-white">Assign songs</div>
          <div className="mt-2 rounded-2xl border border-zinc-800 bg-zinc-950/30 p-3">
            {songs.length === 0 ? (
              <div className="text-sm text-zinc-400">
                No songs yet. Create songs first in the Music section.
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {songs.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm text-zinc-300">
                    <input className="accent-violet-500" type="checkbox" name={`song:${s.id}`} />
                    <span className="truncate">{s.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <a
            href="/artist/dashboard/playlists"
            className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
          >
            Cancel
          </a>
          <button className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
