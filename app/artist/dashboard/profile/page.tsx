import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireArtistSession } from "../../../../lib/auth/artist";
import { getSubscriberStatsForArtist } from "../../../../lib/analytics/insights";
import { getContentStats } from "../_lib/dashboardService";
import { getArtistProfile, updateArtistProfileEditable } from "../../../../lib/profile/artist";

import { Card, CardHeader, CardTitle, CardContent } from "../_components/Card";
import { DashboardGrid } from "../_components/DashboardGrid";
import { MetricDisplay } from "../_components/MetricDisplay";
import { SectionHeader } from "../_components/SectionHeader";
import { IconPlay, IconHeart, IconTrendingUp, IconCoin } from "../_components/IconSet";

const GENRE_OPTIONS = [
  "Afrobeat",
  "Amapiano",
  "Dancehall",
  "Gospel",
  "Hip Hop",
  "House",
  "R&B",
  "Reggae",
  "Pop",
  "Afropop",
  "Traditional",
] as const;

function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

export default async function ArtistProfilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const session = await requireArtistSession();
  const artistUid = session.user.uid;

  async function saveBasic(formData: FormData) {
    "use server";

    const session = await requireArtistSession();
    const artistUid = session.user.uid;

    const current = await getArtistProfile(artistUid);
    const prev = current.profile;

    const name = String(formData.get("name") ?? "").trim();
    const stageName = String(formData.get("stageName") ?? "").trim();
    const country = String(formData.get("country") ?? "").trim();
    const profilePhotoUrl = String(formData.get("profilePhotoUrl") ?? "").trim();

    const res = await updateArtistProfileEditable(artistUid, artistUid, {
      name: name || prev?.name || "",
      stageName: stageName || prev?.stageName || "",
      bio: prev?.bio || "",
      genres: prev?.genres || [],
      country: country || prev?.country || "",
      profilePhotoUrl: profilePhotoUrl || prev?.profilePhotoUrl || "",
      socials: prev?.socials || {},
    });

    if (!res.ok) {
      redirect(`/artist/dashboard/profile?profile_error=${encodeURIComponent(res.message)}`);
    }

    revalidatePath("/artist/dashboard/profile");
    redirect("/artist/dashboard/profile?profile_saved=1");
  }

  async function saveBio(formData: FormData) {
    "use server";

    const session = await requireArtistSession();
    const artistUid = session.user.uid;

    const current = await getArtistProfile(artistUid);
    const prev = current.profile;

    const bio = String(formData.get("bio") ?? "").trim();

    const res = await updateArtistProfileEditable(artistUid, artistUid, {
      name: prev?.name || "",
      stageName: prev?.stageName || "",
      bio,
      genres: prev?.genres || [],
      country: prev?.country || "",
      profilePhotoUrl: prev?.profilePhotoUrl || "",
      socials: prev?.socials || {},
    });

    if (!res.ok) {
      redirect(`/artist/dashboard/profile?profile_error=${encodeURIComponent(res.message)}`);
    }

    revalidatePath("/artist/dashboard/profile");
    redirect("/artist/dashboard/profile?profile_saved=1");
  }

  async function saveGenres(formData: FormData) {
    "use server";

    const session = await requireArtistSession();
    const artistUid = session.user.uid;

    const current = await getArtistProfile(artistUid);
    const prev = current.profile;

    const genres = formData
      .getAll("genres")
      .map((v) => String(v).trim())
      .filter((v) => v.length > 0)
      .slice(0, 12);

    const res = await updateArtistProfileEditable(artistUid, artistUid, {
      name: prev?.name || "",
      stageName: prev?.stageName || "",
      bio: prev?.bio || "",
      genres,
      country: prev?.country || "",
      profilePhotoUrl: prev?.profilePhotoUrl || "",
      socials: prev?.socials || {},
    });

    if (!res.ok) {
      redirect(`/artist/dashboard/profile?profile_error=${encodeURIComponent(res.message)}`);
    }

    revalidatePath("/artist/dashboard/profile");
    redirect("/artist/dashboard/profile?profile_saved=1");
  }

  const [profileRes, contentRes, subsRes] = await Promise.all([
    getArtistProfile(artistUid),
    getContentStats(artistUid),
    getSubscriberStatsForArtist(artistUid),
  ]);

  const profile = profileRes.profile;

  const saved = typeof resolvedSearchParams?.profile_saved === "string";
  const error =
    typeof resolvedSearchParams?.profile_error === "string"
      ? resolvedSearchParams.profile_error
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
        <p className="mt-1 text-sm text-zinc-400">Basic information and public identity.</p>
      </div>

      {profileRes.error ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          {profileRes.error}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {saved ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          Profile updated.
        </div>
      ) : null}

      <SectionHeader title="Profile" description="Card-based profile editor." />

      <Card>
        <CardHeader>
          <CardTitle>Profile Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              {profile?.profilePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.profilePhotoUrl}
                  alt="Profile"
                  className="h-16 w-16 rounded-xl border border-zinc-800 object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40 text-sm font-semibold text-white">
                  {(profile?.stageName?.[0] ?? session.user.name?.[0] ?? session.user.email?.[0] ?? "A").toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <div className="text-lg font-semibold text-white">
                  {profile?.stageName?.trim() || "—"}
                </div>
                <div className="mt-1 text-sm text-zinc-400">{profile?.country?.trim() || "—"}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(profile?.genres ?? []).length === 0 ? (
                    <span className="text-xs text-zinc-500">No genres yet.</span>
                  ) : (
                    (profile?.genres ?? []).slice(0, 8).map((g) => (
                      <span
                        key={g}
                        className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2 py-1 text-xs text-zinc-200"
                      >
                        {g}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="w-full md:max-w-md">
              <DashboardGrid columns="2col">
                <MetricDisplay
                  label="Followers"
                  value="—"
                  subtext="Read-only"
                  icon={<IconHeart className="h-5 w-5" />}
                />
                <MetricDisplay
                  label="Total Plays"
                  value={formatInt(contentRes?.totalPlays)}
                  subtext="Songs + videos"
                  icon={<IconPlay className="h-5 w-5" />}
                />
                <MetricDisplay
                  label="New subscribers (30d)"
                  value={formatInt(subsRes.newSubscribers30d)}
                  subtext="Read-only"
                  icon={<IconTrendingUp className="h-5 w-5" />}
                />
                <MetricDisplay
                  label="Earnings"
                  value="—"
                  subtext="See Earnings page"
                  icon={<IconCoin className="h-5 w-5" />}
                />
              </DashboardGrid>
            </div>
          </div>

          <form action={saveBasic} className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="block">
              <div className="text-sm font-medium text-zinc-200">Name (real)</div>
              <input
                name="name"
                defaultValue={profile?.name ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
                placeholder="Your name"
              />
            </label>

            <label className="block">
              <div className="text-sm font-medium text-zinc-200">Stage name</div>
              <input
                name="stageName"
                defaultValue={profile?.stageName ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
                placeholder="Stage name"
              />
            </label>

            <label className="block">
              <div className="text-sm font-medium text-zinc-200">Country</div>
              <input
                name="country"
                defaultValue={profile?.country ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
                placeholder="Malawi"
              />
            </label>

            <label className="block">
              <div className="text-sm font-medium text-zinc-200">Profile photo URL</div>
              <input
                name="profilePhotoUrl"
                defaultValue={profile?.profilePhotoUrl ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
                placeholder="https://..."
              />
            </label>

            <div className="md:col-span-2 flex justify-end">
              <button className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">
                Save basic info
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bio</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveBio} className="space-y-3">
            <textarea
              name="bio"
              defaultValue={profile?.bio ?? ""}
              rows={5}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
              placeholder="Tell fans about your sound…"
            />
            <div className="flex justify-end">
              <button className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">
                Save bio
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Genres</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveGenres} className="space-y-3">
            <div className="text-sm text-zinc-400">Select up to 12 genres.</div>
            <select
              name="genres"
              multiple
              defaultValue={profile?.genres ?? []}
              className="h-44 w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
            >
              {GENRE_OPTIONS.map((g) => (
                <option key={g} value={g} className="bg-zinc-950">
                  {g}
                </option>
              ))}
            </select>

            <div className="flex flex-wrap gap-2">
              {(profile?.genres ?? []).length === 0 ? (
                <span className="text-xs text-zinc-500">No genres selected.</span>
              ) : (
                (profile?.genres ?? []).map((g) => (
                  <span
                    key={g}
                    className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2 py-1 text-xs text-zinc-200"
                  >
                    {g}
                  </span>
                ))
              )}
            </div>

            <div className="flex justify-end">
              <button className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">
                Save genres
              </button>
            </div>
          </form>

          {profile?.verificationBadge || profile?.featured || profile?.showOnHomepage ? (
            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <div className="text-sm font-medium text-zinc-200">Admin-managed</div>
              <div className="mt-2 grid gap-2 text-sm text-zinc-400 md:grid-cols-3">
                <div>Verified: {profile?.verificationBadge ? "Yes" : "No"}</div>
                <div>Featured: {profile?.featured ? "Yes" : "No"}</div>
                <div>Show on homepage: {profile?.showOnHomepage ? "Yes" : "No"}</div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
