import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireArtistSession } from "../../../../../../lib/auth/artist";
import { deleteSong, getSong, updateSong } from "../../../../../../lib/content/songs";
import { type ContentStatus } from "../../../../../../lib/content/types";
import { StatusBadge } from "../../../music/_components/StatusBadge";

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export default async function EditSongPage({
  params,
}: {
  params: Promise<{ songId: string }>;
}) {
  const session = await requireArtistSession();
  const { songId } = await params;

  const song = await getSong(session.user.uid, songId);
  if (!song) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-white">Song not found</h1>
        <Link
          href="/artist/dashboard/music"
          className="text-sm text-zinc-200 underline"
        >
          Back to Music
        </Link>
      </div>
    );
  }

  async function save(formData: FormData) {
    "use server";

    const session = await requireArtistSession();
    const { songId } = await params;

    const title = String(formData.get("title") ?? "").trim();
    if (!title) throw new Error("Title is required");

    const description = String(formData.get("description") ?? "").trim();
    const genre = String(formData.get("genre") ?? "").trim();
    const tags = parseTags(String(formData.get("tags") ?? ""));
    const releaseDate = String(formData.get("releaseDate") ?? "").trim();
    const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim();
    const status = String(formData.get("status") ?? "draft") as ContentStatus;

    await updateSong(session.user.uid, songId, {
      title,
      description: description || "",
      genre: genre || "",
      tags,
      releaseDate: releaseDate || "",
      coverImageUrl: coverImageUrl || "",
      status,
    });

    revalidatePath("/artist/dashboard/music");
    revalidatePath(`/artist/dashboard/music/${songId}/edit`);
    redirect(`/artist/dashboard/music/${songId}/edit`);
  }

  async function remove() {
    "use server";

    const session = await requireArtistSession();
    const { songId } = await params;

    await deleteSong(session.user.uid, songId);
    revalidatePath("/artist/dashboard/music");
    redirect("/artist/dashboard/music");
  }

  const tagsValue = song.tags.join(", ");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Edit song</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
            <div className="truncate">{song.title}</div>
            <StatusBadge status={song.status} />
          </div>
        </div>
        <Link
          href="/artist/dashboard/music"
          className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
        >
          Back
        </Link>
      </div>

      <form action={save} className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <div className="text-sm font-medium text-zinc-200">Title</div>
            <input
              name="title"
              defaultValue={song.title}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
              required
            />
          </label>

          <label className="block md:col-span-2">
            <div className="text-sm font-medium text-zinc-200">Description</div>
            <textarea
              name="description"
              defaultValue={song.description ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
              rows={4}
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-zinc-200">Genre</div>
            <input
              name="genre"
              defaultValue={song.genre ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-zinc-200">Release date</div>
            <input
              name="releaseDate"
              type="date"
              defaultValue={song.releaseDate ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
            />
          </label>

          <label className="block md:col-span-2">
            <div className="text-sm font-medium text-zinc-200">Tags</div>
            <input
              name="tags"
              defaultValue={tagsValue}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
              placeholder="love, dance, amapiano"
            />
          </label>

          <label className="block md:col-span-2">
            <div className="text-sm font-medium text-zinc-200">Cover image URL</div>
            <input
              name="coverImageUrl"
              defaultValue={song.coverImageUrl ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
              placeholder="https://..."
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-zinc-200">Status</div>
            <select
              name="status"
              defaultValue={song.status}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
            >
              <option value="draft">Draft</option>
              <option value="pending">Pending approval</option>
              <option value="published">Published</option>
            </select>
          </label>

          <div className="md:col-span-1" />
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
            Save changes
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-400">
        <div className="font-medium text-white">Actions</div>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <Link
            href="/artist/dashboard/playlists"
            className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
          >
            Add to playlist / album
          </Link>
          <Link
            href="/artist/dashboard/promotions"
            className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
          >
            Promote (ads)
          </Link>
        </div>
        <div className="mt-2 text-xs text-zinc-500">
          Uploading audio files and cover uploads can be integrated with Storage/Supabase buckets.
        </div>
      </div>
    </div>
  );
}
