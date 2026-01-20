import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore, isFirestoreApiDisabledError, warnFirestoreApiDisabledOnce } from "../firebase/firestore";

export type ProfileVisibility = "public" | "followers";
export type MessagePrivacy = "everyone" | "followers";
export type DashboardLanguage = "en" | "ny" | "bem";
export type ThemePreference = "dark" | "light";

export type ArtistDashboardSettings = {
  notifications: {
    push: boolean;
    email: boolean;
    newMessages: boolean;
    commentsAndLikes: boolean;
    earningsAndPayouts: boolean;
    liveEventAlerts: boolean;
    announcements: boolean;
  };
  privacy: {
    profileVisibility: ProfileVisibility;
    whoCanMessageMe: MessagePrivacy;
    showStatisticsToFans: boolean;
    dataConsent: boolean;
  };
  language: DashboardLanguage;
  appearance: {
    theme: ThemePreference;
  };
  updatedAt?: string;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as UnknownRecord;
}

function readBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === 1) return true;
  if (value === "false" || value === "0" || value === 0) return false;
  return fallback;
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value !== "string") return fallback;
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function getDefaultArtistDashboardSettings(): ArtistDashboardSettings {
  return {
    notifications: {
      push: true,
      email: true,
      newMessages: true,
      commentsAndLikes: true,
      earningsAndPayouts: true,
      liveEventAlerts: true,
      announcements: true,
    },
    privacy: {
      profileVisibility: "public",
      whoCanMessageMe: "followers",
      showStatisticsToFans: true,
      dataConsent: true,
    },
    language: "en",
    appearance: {
      theme: "dark",
    },
  };
}

function settingsDoc(artistUid: string) {
  const db = getFirebaseAdminFirestore();
  if (!db) return null;
  return db.collection("artists").doc(artistUid).collection("settings").doc("dashboard");
}

export async function getArtistDashboardSettings(
  artistUid: string,
): Promise<{ settings: ArtistDashboardSettings; source: "firestore" | "none"; error?: string }> {
  const base = getDefaultArtistDashboardSettings();
  const docRef = settingsDoc(artistUid);
  if (!docRef) return { settings: base, source: "none" };

  try {
    const snap = await docRef.get();
    if (!snap.exists) return { settings: base, source: "firestore" };

    const data = asRecord(snap.data());
    if (!data) return { settings: base, source: "firestore" };

    const notifications = asRecord(data.notifications) ?? {};
    const privacy = asRecord(data.privacy) ?? {};
    const appearance = asRecord(data.appearance) ?? {};

    const merged: ArtistDashboardSettings = {
      notifications: {
        push: readBool(notifications.push, base.notifications.push),
        email: readBool(notifications.email, base.notifications.email),
        newMessages: readBool(notifications.newMessages, base.notifications.newMessages),
        commentsAndLikes: readBool(notifications.commentsAndLikes, base.notifications.commentsAndLikes),
        earningsAndPayouts: readBool(notifications.earningsAndPayouts, base.notifications.earningsAndPayouts),
        liveEventAlerts: readBool(notifications.liveEventAlerts, base.notifications.liveEventAlerts),
        announcements: readBool(notifications.announcements, base.notifications.announcements),
      },
      privacy: {
        profileVisibility: readEnum(privacy.profileVisibility, ["public", "followers"] as const, base.privacy.profileVisibility),
        whoCanMessageMe: readEnum(privacy.whoCanMessageMe, ["everyone", "followers"] as const, base.privacy.whoCanMessageMe),
        showStatisticsToFans: readBool(privacy.showStatisticsToFans, base.privacy.showStatisticsToFans),
        dataConsent: readBool(privacy.dataConsent, base.privacy.dataConsent),
      },
      language: readEnum(data.language, ["en", "ny", "bem"] as const, base.language),
      appearance: {
        theme: readEnum(appearance.theme, ["dark", "light"] as const, base.appearance.theme),
      },
      updatedAt:
        typeof data.updatedAt === "string"
          ? data.updatedAt
          : (snap.updateTime ? snap.updateTime.toDate().toISOString() : undefined),
    };

    return { settings: merged, source: "firestore" };
  } catch (err) {
    if (isFirestoreApiDisabledError(err)) warnFirestoreApiDisabledOnce(err);
    return { settings: base, source: "none", error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateArtistDashboardSettings(
  artistUid: string,
  patch: Partial<ArtistDashboardSettings>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const docRef = settingsDoc(artistUid);
  if (!docRef) return { ok: false, message: "Firestore is not configured." };

  try {
    await docRef.set(
      {
        ...patch,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return { ok: true };
  } catch (err) {
    if (isFirestoreApiDisabledError(err)) warnFirestoreApiDisabledOnce(err);
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
