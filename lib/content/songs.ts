import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import {
  getFirebaseAdminFirestore,
  isFirestoreApiDisabledError,
  isFirestoreNotFoundError,
  warnFirestoreApiDisabledOnce,
  warnFirestoreNotFoundOnce,
} from "../firebase/firestore";
import { type Song, type ContentStatus } from "./types";
import { getArtistSubscriptionStatus } from "../subscriptions/artist";
import { getFeatureInt, hasFeature } from "../subscriptions/features";

function songsCol(artistUid: string) {
  const db = getFirebaseAdminFirestore();
  if (!db) return null;
  return db.collection("artists").doc(artistUid).collection("songs");
}

function nowIso(): string {
  return new Date().toISOString();
}

function toSong(artistUid: string, id: string, data: FirebaseFirestore.DocumentData): Song {
  return {
    id,
    artistUid,

    title: String(data.title ?? ""),
    description: data.description ? String(data.description) : undefined,
    genre: data.genre ? String(data.genre) : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    releaseDate: data.releaseDate ? String(data.releaseDate) : undefined,
    coverImageUrl: data.coverImageUrl ? String(data.coverImageUrl) : undefined,

    status: (data.status as ContentStatus) ?? "draft",

    plays: Number(data.plays ?? 0),
    likes: Number(data.likes ?? 0),
    comments: Number(data.comments ?? 0),
    shares: Number(data.shares ?? 0),

    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : String(data.createdAt ?? nowIso()),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : String(data.updatedAt ?? nowIso()),
  };
}

export async function listSongs(artistUid: string): Promise<Song[]> {
  const col = songsCol(artistUid);
  if (!col) return [];

  try {
    const snap = await col.orderBy("updatedAt", "desc").limit(250).get();
    return snap.docs.map((d) => toSong(artistUid, d.id, d.data()));
  } catch (err) {
    if (isFirestoreApiDisabledError(err)) {
      warnFirestoreApiDisabledOnce(err);
      return [];
    }
    if (isFirestoreNotFoundError(err)) {
      warnFirestoreNotFoundOnce(err);
      return [];
    }
    throw err;
  }
}

export async function getSong(artistUid: string, songId: string): Promise<Song | null> {
  const col = songsCol(artistUid);
  if (!col) return null;

  const doc = await col.doc(songId).get();
  if (!doc.exists) return null;
  return toSong(artistUid, doc.id, doc.data()!);
}

export async function createSong(
  artistUid: string,
  input: {
    title: string;
    description?: string;
    genre?: string;
    tags?: string[];
    releaseDate?: string;
    coverImageUrl?: string;
    status?: ContentStatus;
  },
): Promise<string> {
  const subscription = await getArtistSubscriptionStatus(artistUid);
  const canUpload = hasFeature(subscription.features, "uploads.songs", true);
  if (!canUpload) {
    throw new Error("Song uploads are locked on your current plan. Upgrade to upload songs.");
  }

  const col = songsCol(artistUid);
  if (!col) throw new Error("Firebase Admin/Firestore not configured");

  try {
    const maxSongs = getFeatureInt(subscription.features, "limits.maxSongs", 10);
    if (maxSongs > 0) {
      const snap = await col.limit(maxSongs + 1).get();
      if (snap.size >= maxSongs) {
        throw new Error(`You have reached your plan limit (${maxSongs}) for songs. Upgrade to upload more.`);
      }
    }

    const createdAt = FieldValue.serverTimestamp();
    const updatedAt = FieldValue.serverTimestamp();

    const doc = await col.add({
      title: input.title,
      description: input.description ?? "",
      genre: input.genre ?? "",
      tags: input.tags ?? [],
      releaseDate: input.releaseDate ?? "",
      coverImageUrl: input.coverImageUrl ?? "",
      status: input.status ?? "draft",
      plays: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      createdAt,
      updatedAt,
    });

    return doc.id;
  } catch (err) {
    if (isFirestoreApiDisabledError(err)) {
      warnFirestoreApiDisabledOnce(err);
      throw new Error(
        "Firestore is not enabled for this Firebase project. In Firebase Console → Firestore Database, create/enable a database, then retry.",
      );
    }
    if (isFirestoreNotFoundError(err)) {
      warnFirestoreNotFoundOnce(err);
      throw new Error(
        "Firestore database was not found for this Firebase project. In Firebase Console → Firestore Database, create the '(default)' database, then retry.",
      );
    }
    throw err;
  }
}

export async function updateSong(
  artistUid: string,
  songId: string,
  input: {
    title?: string;
    description?: string;
    genre?: string;
    tags?: string[];
    releaseDate?: string;
    coverImageUrl?: string;
    status?: ContentStatus;
  },
): Promise<void> {
  const col = songsCol(artistUid);
  if (!col) throw new Error("Firebase Admin/Firestore not configured");

  await col.doc(songId).set(
    {
      ...input,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function deleteSong(artistUid: string, songId: string): Promise<void> {
  const col = songsCol(artistUid);
  if (!col) throw new Error("Firebase Admin/Firestore not configured");
  await col.doc(songId).delete();
}
