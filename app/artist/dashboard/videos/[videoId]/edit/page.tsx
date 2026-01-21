import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireArtistSession } from "../../../../../../lib/auth/artist";
import { deleteVideo, getVideo, updateVideo } from "../../../../../../lib/content/videos";
import { type ContentStatus } from "../../../../../../lib/content/types";
import { StatusBadge } from "../../../music/_components/StatusBadge";

export default async function EditVideoPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const session = await requireArtistSession();
  const { videoId } = await params;

  const video = await getVideo(session.user.uid, videoId);
  if (!video) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-white">Video not found</h1>
        <Link href="/artist/dashboard/videos" className="text-sm text-zinc-200 underline">
          Back
        </Link>
      </div>
    );
  }

  async function save(formData: FormData) {
    "use server";

    const session = await requireArtistSession();
    const { videoId } = await params;

    const title = String(formData.get("title") ?? "").trim();
    if (!title) throw new Error("Title is required");

    const description = String(formData.get("description") ?? "").trim();
    const status = String(formData.get("status") ?? "draft") as ContentStatus;

    await updateVideo(session.user.uid, videoId, {
      title,
      description: description || "",
      status,
    });

    revalidatePath("/artist/dashboard/videos");
    revalidatePath(`/artist/dashboard/videos/${videoId}/edit`);
    redirect(`/artist/dashboard/videos/${videoId}/edit`);
  }

  async function remove() {
    "use server";

    const session = await requireArtistSession();
    const { videoId } = await params;

    await deleteVideo(session.user.uid, videoId);
    revalidatePath("/artist/dashboard/videos");
    redirect("/artist/dashboard/videos");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Edit video</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
            <div className="truncate">{video.title}</div>
            <StatusBadge status={video.status} />
          </div>
        </div>
        <Link
          href="/artist/dashboard/videos"
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
              defaultValue={video.title}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
              required
            />
          </label>

          <label className="block md:col-span-2">
            <div className="text-sm font-medium text-zinc-200">Description</div>
            <textarea
              name="description"
              defaultValue={video.description ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
              rows={4}
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-zinc-200">Status</div>
            <select
              name="status"
              defaultValue={video.status}
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

    </div>
  );
}
