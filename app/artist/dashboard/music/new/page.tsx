import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireArtistSession } from "../../../../../lib/auth/artist";
import { createSong } from "../../../../../lib/content/songs";
import { getArtistSubscriptionStatus } from "../../../../../lib/subscriptions/artist";
import { hasFeature } from "../../../../../lib/subscriptions/features";

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export default async function NewSongPage() {
  const session = await requireArtistSession();
  const subscription = await getArtistSubscriptionStatus(session.user.uid);
  const canUploadSongs = hasFeature(subscription.features, "uploads.songs", true);

  if (!canUploadSongs) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Upload song</h1>
          <p className="mt-1 text-sm text-zinc-400">Song uploads are locked on your current plan.</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
          <div className="text-sm font-semibold text-white">Upgrade required</div>
          <div className="mt-2 text-sm text-zinc-300">
            Your plan ({subscription.planName}) does not allow uploading songs.
          </div>
          <div className="mt-4 flex items-center gap-3">
            <a
              href="/artist/dashboard/subscription"
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
            >
              View plans
            </a>
            <a
              href="/artist/dashboard/music"
              className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
            >
              Back to Music
            </a>
          </div>
        </div>
      </div>
    );
  }

  async function action(formData: FormData) {
    "use server";

    const session = await requireArtistSession();

    const title = String(formData.get("title") ?? "").trim();
    if (!title) {
      throw new Error("Title is required");
    }

    const description = String(formData.get("description") ?? "").trim();
    const genre = String(formData.get("genre") ?? "").trim();
    const tags = parseTags(String(formData.get("tags") ?? ""));
    const releaseDate = String(formData.get("releaseDate") ?? "").trim();
    const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim();

    const songId = await createSong(session.user.uid, {
      title,
      description: description || undefined,
      genre: genre || undefined,
      tags,
      releaseDate: releaseDate || undefined,
      coverImageUrl: coverImageUrl || undefined,
      status: "draft",
    });

    revalidatePath("/artist/dashboard/music");
    redirect(`/artist/dashboard/music/${songId}/edit`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Upload song</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Create a draft song entry. Add audio/cover later in your media pipeline.
        </p>
      </div>

      <form action={action} className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
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
              rows={4}
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-zinc-200">Genre</div>
            <input
              name="genre"
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
              placeholder="Afrobeat"
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-zinc-200">Release date</div>
            <input
              name="releaseDate"
              type="date"
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
            />
          </label>

          <label className="block md:col-span-2">
            <div className="text-sm font-medium text-zinc-200">Tags (comma separated)</div>
            <input
              name="tags"
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
              placeholder="love, dance, amapiano"
            />
          </label>

          <label className="block md:col-span-2">
            <div className="text-sm font-medium text-zinc-200">Cover image URL</div>
            <input
              name="coverImageUrl"
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
              placeholder="https://..."
            />
            <div className="mt-1 text-xs text-zinc-500">
              File upload can be added later; this is a URL field for now.
            </div>
          </label>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <a
            href="/artist/dashboard/music"
            className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
          >
            Cancel
          </a>
          <button className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">
            Create draft
          </button>
        </div>
      </form>

      <div className="text-xs text-zinc-500">
        Logged in as: {session.user.email ?? session.user.uid}
      </div>
    </div>
  );
}
