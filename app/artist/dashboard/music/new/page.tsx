import { requireArtistSession } from "../../../../../lib/auth/artist";
import { getArtistProfile } from "../../../../../lib/profile/artist";
import { getArtistSubscriptionStatus } from "../../../../../lib/subscriptions/artist";
import { hasFeature } from "../../../../../lib/subscriptions/features";
import { UploadSongForm } from "./UploadSongForm";

// Upload submission is handled client-side via POST /api/music/upload-song.

export default async function NewSongPage() {
  const session = await requireArtistSession();
  const subscription = await getArtistSubscriptionStatus(session.user.uid);
  const canUploadSongs = hasFeature(subscription.features, "uploads.songs", true);
  const profile = await getArtistProfile(session.user.uid);
  const artistName = profile.profile?.stageName || profile.profile?.name || "";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Upload Song</h1>
        <p className="mt-1 text-sm text-zinc-400">Share your music with listeners across Africa</p>
      </div>

      <UploadSongForm artistName={artistName} />
    </div>
  );
}
