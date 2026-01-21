import { requireArtistSession } from "../../../../../lib/auth/artist";
import { getArtistSubscriptionStatus } from "../../../../../lib/subscriptions/artist";
import { hasFeature } from "../../../../../lib/subscriptions/features";
import { UploadVideoForm } from "./UploadVideoForm";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Upload Video</h1>
        <p className="mt-1 text-sm text-zinc-400">Share your music video or short clip with fans</p>
      </div>

      <UploadVideoForm />
    </div>
  );
}
