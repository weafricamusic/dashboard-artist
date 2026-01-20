import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireArtistSession } from "../../../../../../lib/auth/artist";
import { listSongs } from "../../../../../../lib/content/songs";
import {
  deletePlaylist,
  getPlaylist,
  updatePlaylist,
} from "../../../../../../lib/content/playlists";
import { type PlaylistType } from "../../../../../../lib/content/types";

export default async function EditPlaylistPage({
  params,
}: {
  params: Promise<{ playlistId: string }>;
}) {
  const session = await requireArtistSession();
  const { playlistId } = await params;

  const playlist = await getPlaylist(session.user.uid, playlistId);
  if (!playlist) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-white">Not found</h1>
        <Link href="/artist/dashboard/playlists" className="text-sm text-zinc-200 underline">
          Back
        </Link>
      </div>
    );
  }

  const songs = await listSongs(session.user.uid);
  const selected = new Set(playlist.songIds);

  async function save(formData: FormData) {
    "use server";

    const session = await requireArtistSession();
    const { playlistId } = await params;

    const existing = await getPlaylist(session.user.uid, playlistId);
    if (!existing) {
      throw new Error("Playlist not found");
    }

    const type = String(formData.get("type") ?? existing.type) as PlaylistType;
    const title = String(formData.get("title") ?? "").trim();
    if (!title) throw new Error("Title is required");

    const description = String(formData.get("description") ?? "").trim();
    const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim();

    const songIds = Array.from(formData.keys())
      .filter((k) => k.startsWith("song:"))
      .map((k) => k.slice("song:".length));

    await updatePlaylist(session.user.uid, playlistId, {
      type,
      title,
      description: description || "",
      coverImageUrl: coverImageUrl || "",
      songIds,
    });

    revalidatePath("/artist/dashboard/playlists");
    revalidatePath(`/artist/dashboard/playlists/${playlistId}/edit`);
    redirect(`/artist/dashboard/playlists/${playlistId}/edit`);
  }

  async function remove() {
    "use server";

    const session = await requireArtistSession();
    const { playlistId } = await params;

    await deletePlaylist(session.user.uid, playlistId);
    revalidatePath("/artist/dashboard/playlists");
    redirect("/artist/dashboard/playlists");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Edit {playlist.type}</h1>
          <p className="mt-1 text-sm text-zinc-400">{playlist.title}</p>
        </div>
        <Link
          href="/artist/dashboard/playlists"
          className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
        >
          Back
        </Link>
      </div>

      <form action={save} className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <div className="text-sm font-medium text-zinc-200">Type</div>
            <select
              name="type"
              defaultValue={playlist.type}
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
              defaultValue={playlist.title}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
              required
            />
          </label>

          <label className="block md:col-span-2">
            <div className="text-sm font-medium text-zinc-200">Description</div>
            <textarea
              name="description"
              defaultValue={playlist.description ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
              rows={3}
            />
          </label>

          <label className="block md:col-span-2">
            <div className="text-sm font-medium text-zinc-200">Cover image URL</div>
            <input
              name="coverImageUrl"
              defaultValue={playlist.coverImageUrl ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
              placeholder="https://..."
            />
          </label>
        </div>

        <div className="mt-6">
          <div className="text-sm font-medium text-white">Assign songs</div>
          <div className="mt-2 rounded-2xl border border-zinc-800 bg-zinc-950/30 p-3">
            {songs.length === 0 ? (
              <div className="text-sm text-zinc-400">No songs yet.</div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {songs.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      className="accent-violet-500"
                      type="checkbox"
                      name={`song:${s.id}`}
                      defaultChecked={selected.has(s.id)}
                    />
                    <span className="truncate">{s.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            formAction={remove}
            className="rounded-lg border border-rose-900/40 bg-rose-950/40 px-3 py-2 text-sm font-medium text-rose-200 hover:bg-rose-950/60"
            type="submit"
          >
            Delete
          </button>

          <button className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">
            Save
          </button>
        </div>
      </form>

      <div className="text-xs text-zinc-500">
        Tip: use Albums for official releases, Playlists for curated collections.
      </div>
    </div>
  );
}
