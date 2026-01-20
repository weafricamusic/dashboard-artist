"use server";

import { revalidatePath } from "next/cache";

import { requireArtistSession } from "../../../../lib/auth/artist";
import {
  type DashboardLanguage,
  type MessagePrivacy,
  type ProfileVisibility,
  type ThemePreference,
  updateArtistDashboardSettings,
} from "../../../../lib/settings/artist";

function readBoolForm(formData: FormData, name: string): boolean {
  const v = formData.get(name);
  // checkbox returns "on" when checked; null when unchecked
  return v === "on" || v === "true" || v === "1";
}

function readEnumForm<T extends string>(
  formData: FormData,
  name: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const v = formData.get(name);
  if (typeof v !== "string") return fallback;
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export async function saveDashboardSettings(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  const session = await requireArtistSession();

  const profileVisibility = readEnumForm<ProfileVisibility>(
    formData,
    "privacy.profileVisibility",
    ["public", "followers"] as const,
    "public",
  );

  const whoCanMessageMe = readEnumForm<MessagePrivacy>(
    formData,
    "privacy.whoCanMessageMe",
    ["everyone", "followers"] as const,
    "followers",
  );

  const language = readEnumForm<DashboardLanguage>(
    formData,
    "language",
    ["en", "ny", "bem"] as const,
    "en",
  );

  const theme = readEnumForm<ThemePreference>(
    formData,
    "appearance.theme",
    ["dark", "light"] as const,
    "dark",
  );

  const res = await updateArtistDashboardSettings(session.user.uid, {
    notifications: {
      push: readBoolForm(formData, "notifications.push"),
      email: readBoolForm(formData, "notifications.email"),
      newMessages: readBoolForm(formData, "notifications.newMessages"),
      commentsAndLikes: readBoolForm(formData, "notifications.commentsAndLikes"),
      earningsAndPayouts: readBoolForm(formData, "notifications.earningsAndPayouts"),
      liveEventAlerts: readBoolForm(formData, "notifications.liveEventAlerts"),
      announcements: readBoolForm(formData, "notifications.announcements"),
    },
    privacy: {
      profileVisibility,
      whoCanMessageMe,
      showStatisticsToFans: readBoolForm(formData, "privacy.showStatisticsToFans"),
      dataConsent: readBoolForm(formData, "privacy.dataConsent"),
    },
    language,
    appearance: { theme },
  });

  revalidatePath("/artist/dashboard/settings");

  if (!res.ok) return { ok: false, message: res.message };
  return { ok: true };
}

export async function saveDashboardSettingsWithState(
  _prevState: { ok: boolean; message?: string },
  formData: FormData,
): Promise<{ ok: boolean; message?: string }> {
  return saveDashboardSettings(formData);
}
