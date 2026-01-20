import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireArtistSession } from "../../../../../lib/auth/artist";
import { createVideo } from "../../../../../lib/content/videos";
import { getArtistSubscriptionStatus } from "../../../../../lib/subscriptions/artist";
import { hasFeature } from "../../../../../lib/subscriptions/features";

export default async function NewVideoPage() {
  const session = await requireArtistSession();
  const subscription = await getArtistSubscriptionStatus(session.user.uid);
  const canUploadVideos = hasFeature(subscription.features, "uploads.videos", true);

  if (!canUploadVideos) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Upload video</h1>
          <p className="mt-1 text-sm text-zinc-400">Video uploads are locked on your current plan.</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
          <div className="text-sm font-semibold text-white">Upgrade required</div>
          <div className="mt-2 text-sm text-zinc-300">
            Your plan ({subscription.planName}) does not allow uploading videos.
          </div>
          <div className="mt-4 flex items-center gap-3">
            <a
              href="/artist/dashboard/subscription"
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
            >
              View plans
            </a>
            <a
              href="/artist/dashboard/videos"
              className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
            >
              Back to Videos
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
    if (!title) throw new Error("Title is required");

    const description = String(formData.get("description") ?? "").trim();
    const videoUrl = String(formData.get("videoUrl") ?? "").trim();
    const thumbnailUrl = String(formData.get("thumbnailUrl") ?? "").trim();

    const videoId = await createVideo(session.user.uid, {
      title,
      description: description || undefined,
      videoUrl: videoUrl || undefined,
      thumbnailUrl: thumbnailUrl || undefined,
      status: "draft",
    });

    revalidatePath("/artist/dashboard/videos");
    redirect(`/artist/dashboard/videos/${videoId}/edit`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Upload video</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Create a draft video entry. You can link a hosted video URL for now.
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

          <label className="block md:col-span-2">
            <div className="text-sm font-medium text-zinc-200">Video URL</div>
            <input
              name="videoUrl"
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
              placeholder="https://..."
            />
          </label>

          <label className="block md:col-span-2">
            <div className="text-sm font-medium text-zinc-200">Thumbnail URL</div>
            <input
              name="thumbnailUrl"
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
              placeholder="https://..."
            />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <a
            href="/artist/dashboard/videos"
            className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
          >
            Cancel
          </a>
          <button className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">
            Create draft
          </button>
        </div>
      </form>
    </div>
  );
}
