import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireArtistSession } from "../../../../lib/auth/artist";
import {
  getArtistProfile,
  listProfileAuditLogs,
  updateArtistProfileEditable,
} from "../../../../lib/profile/artist";

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default async function ArtistProfilePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await requireArtistSession();

  async function save(formData: FormData) {
    "use server";

    const session = await requireArtistSession();

    const name = String(formData.get("name") ?? "").trim();
    const stageName = String(formData.get("stageName") ?? "").trim();
    const bio = String(formData.get("bio") ?? "").trim();
    const genres = parseCsv(String(formData.get("genres") ?? ""));
    const country = String(formData.get("country") ?? "").trim();
    const profilePhotoUrl = String(formData.get("profilePhotoUrl") ?? "").trim();

    const socials = {
      website: String(formData.get("social_website") ?? "").trim(),
      instagram: String(formData.get("social_instagram") ?? "").trim(),
      facebook: String(formData.get("social_facebook") ?? "").trim(),
      tiktok: String(formData.get("social_tiktok") ?? "").trim(),
      x: String(formData.get("social_x") ?? "").trim(),
      youtube: String(formData.get("social_youtube") ?? "").trim(),
      spotify: String(formData.get("social_spotify") ?? "").trim(),
      appleMusic: String(formData.get("social_appleMusic") ?? "").trim(),
    };

    const res = await updateArtistProfileEditable(session.user.uid, session.user.uid, {
      name,
      stageName,
      bio,
      genres,
      country,
      profilePhotoUrl,
      socials,
    });

    if (!res.ok) {
      redirect(`/artist/dashboard/profile?profile_error=${encodeURIComponent(res.message)}`);
    }

    revalidatePath("/artist/dashboard/profile");
    redirect("/artist/dashboard/profile?profile_saved=1");
  }

  const [profileRes, logsRes] = await Promise.all([
    getArtistProfile(session.user.uid),
    listProfileAuditLogs(session.user.uid, 25),
  ]);

  const profile = profileRes.profile;

  const saved = typeof searchParams?.profile_saved === "string";
  const error = typeof searchParams?.profile_error === "string" ? searchParams.profile_error : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Public identity + verification controls (admin-managed).
        </p>
      </div>

      {profileRes.error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {profileRes.error}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      {saved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Profile updated.
        </div>
      ) : null}

      <form action={save} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium">Editable fields</div>
            <div className="mt-1 text-sm text-zinc-600">
              Name, stage name, bio, genres, country, social links, profile photo.
            </div>
          </div>

          <button className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white">
            Save
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <div className="text-sm font-medium text-zinc-700">Name</div>
            <input
              name="name"
              defaultValue={profile?.name ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
              placeholder="Steve"
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-zinc-700">Stage name</div>
            <input
              name="stageName"
              defaultValue={profile?.stageName ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
              placeholder="DJ Steve"
            />
          </label>

          <label className="block md:col-span-2">
            <div className="text-sm font-medium text-zinc-700">Bio</div>
            <textarea
              name="bio"
              defaultValue={profile?.bio ?? ""}
              rows={4}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
              placeholder="Tell fans about your sound…"
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-zinc-700">Genres (comma separated)</div>
            <input
              name="genres"
              defaultValue={(profile?.genres ?? []).join(", ")}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
              placeholder="Afrobeat, Amapiano"
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-zinc-700">Country</div>
            <input
              name="country"
              defaultValue={profile?.country ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
              placeholder="Malawi"
            />
          </label>

          <label className="block md:col-span-2">
            <div className="text-sm font-medium text-zinc-700">Profile photo URL</div>
            <input
              name="profilePhotoUrl"
              defaultValue={profile?.profilePhotoUrl ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
              placeholder="https://..."
            />
          </label>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="text-sm font-medium">Social links</div>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <label className="block">
              <div className="text-sm text-zinc-700">Website</div>
              <input
                name="social_website"
                defaultValue={profile?.socials.website ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-700">Instagram</div>
              <input
                name="social_instagram"
                defaultValue={profile?.socials.instagram ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-700">Facebook</div>
              <input
                name="social_facebook"
                defaultValue={profile?.socials.facebook ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-700">TikTok</div>
              <input
                name="social_tiktok"
                defaultValue={profile?.socials.tiktok ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-700">X</div>
              <input
                name="social_x"
                defaultValue={profile?.socials.x ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-700">YouTube</div>
              <input
                name="social_youtube"
                defaultValue={profile?.socials.youtube ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-700">Spotify</div>
              <input
                name="social_spotify"
                defaultValue={profile?.socials.spotify ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-700">Apple Music</div>
              <input
                name="social_appleMusic"
                defaultValue={profile?.socials.appleMusic ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-sm font-medium">Admin-controlled</div>
          <div className="mt-2 text-xs text-zinc-500">
            Verification badge, featured toggle, homepage visibility.
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={profile?.verificationBadge ?? false} readOnly />
              Verified
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={profile?.featured ?? false} readOnly />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={profile?.showOnHomepage ?? false} readOnly />
              Show on homepage
            </label>
          </div>
        </div>
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium">Audit logs</div>
            <div className="mt-1 text-sm text-zinc-600">Profile edits are logged for compliance and trust.</div>
          </div>
          <div className="text-xs text-zinc-500">Artist UID: {session.user.uid}</div>
        </div>

        {logsRes.error ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {logsRes.error}
          </div>
        ) : null}

        {logsRes.logs.length === 0 ? (
          <div className="mt-3 text-sm text-zinc-600">No profile edits recorded yet.</div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-zinc-500">
                <tr className="border-b border-zinc-200">
                  <th className="py-2 pr-3 font-medium">Time</th>
                  <th className="py-2 pr-3 font-medium">Action</th>
                  <th className="py-2 pr-3 font-medium">Changed</th>
                  <th className="py-2 font-medium">Actor</th>
                </tr>
              </thead>
              <tbody>
                {logsRes.logs.map((l) => (
                  <tr key={l.id} className="border-b border-zinc-100">
                    <td className="py-2 pr-3 text-zinc-700">{formatDateTime(l.createdAt)}</td>
                    <td className="py-2 pr-3 text-zinc-700">{l.action}</td>
                    <td className="py-2 pr-3 text-zinc-900">
                      {Object.keys(l.changes).length === 0
                        ? "—"
                        : Object.keys(l.changes).slice(0, 6).join(", ")}
                    </td>
                    <td className="py-2 text-zinc-700">{l.actorUid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
