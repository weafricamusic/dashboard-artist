import { requireArtistSession } from "../../../lib/auth/artist";
import { getArtistProfile } from "../../../lib/profile/artist";
import { getArtistSubscriptionStatus } from "../../../lib/subscriptions/artist";
import { hasFeature } from "../../../lib/subscriptions/features";
import { DashboardShell } from "@/app/artist/dashboard/_components/DashboardShell";
import { SubscriptionStatusBanner } from "./_components/SubscriptionStatusBanner";

export default async function ArtistDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireArtistSession();
  const profileRes = await getArtistProfile(session.user.uid);
  const subscription = await getArtistSubscriptionStatus(session.user.uid);
  const verified = Boolean(profileRes.profile?.verificationBadge);
  const avatarUrl = profileRes.profile?.profilePhotoUrl ?? null;
  const displayName = session.user.name ?? session.user.email ?? session.user.uid;

  const canUploadSongs = hasFeature(subscription.features, "uploads.songs", true);
  const canUploadVideos = hasFeature(subscription.features, "uploads.videos", true);

  return (
    <DashboardShell
      displayName={displayName}
      status={session.status}
      verified={verified}
      avatarUrl={avatarUrl}
      canUploadSongs={canUploadSongs}
      canUploadVideos={canUploadVideos}
    >
      <SubscriptionStatusBanner artistUid={session.user.uid} subscription={subscription} />

      {session.status === "pending" ? (
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">
          <div className="text-sm font-semibold">Approval pending</div>
          <div className="mt-1 text-sm text-amber-100/80">
            Your account is awaiting admin approval. Some actions may be restricted.
          </div>
        </div>
      ) : null}

      {session.status === "suspended" ? (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-100">
          <div className="text-sm font-semibold">Account suspended</div>
          <div className="mt-1 text-sm text-red-100/80">Your account is currently suspended. Please contact support.</div>
        </div>
      ) : null}

      {children}
    </DashboardShell>
  );
}
