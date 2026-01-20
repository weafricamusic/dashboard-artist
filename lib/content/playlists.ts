import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import {
  getFirebaseAdminFirestore,
  isFirestoreApiDisabledError,
  isFirestoreNotFoundError,
  warnFirestoreApiDisabledOnce,
  warnFirestoreNotFoundOnce,
} from "../firebase/firestore";
import { type Playlist, type PlaylistType } from "./types";

function playlistsCol(artistUid: string) {
  const db = getFirebaseAdminFirestore();
  if (!db) return null;
  return db.collection("artists").doc(artistUid).collection("playlists");
}

function nowIso(): string {
  return new Date().toISOString();
}

function toPlaylist(
  artistUid: string,
  id: string,
  data: FirebaseFirestore.DocumentData,
): Playlist {
  return {
    id,
    artistUid,

    type: (data.type as PlaylistType) ?? "playlist",
    title: String(data.title ?? ""),
    description: data.description ? String(data.description) : undefined,
    coverImageUrl: data.coverImageUrl ? String(data.coverImageUrl) : undefined,
    songIds: Array.isArray(data.songIds) ? data.songIds.map(String) : [],

    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : String(data.createdAt ?? nowIso()),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : String(data.updatedAt ?? nowIso()),
  };
}

export async function listPlaylists(artistUid: string): Promise<Playlist[]> {
  const col = playlistsCol(artistUid);
  if (!col) return [];

  try {
    const snap = await col.orderBy("updatedAt", "desc").limit(250).get();
    return snap.docs.map((d) => toPlaylist(artistUid, d.id, d.data()));
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

export async function getPlaylist(artistUid: string, playlistId: string): Promise<Playlist | null> {
  const col = playlistsCol(artistUid);
  if (!col) return null;
  const doc = await col.doc(playlistId).get();
  if (!doc.exists) return null;
  return toPlaylist(artistUid, doc.id, doc.data()!);
}

export async function createPlaylist(
  artistUid: string,
  input: {
    type: PlaylistType;
    title: string;
    description?: string;
    coverImageUrl?: string;
    songIds?: string[];
  },
): Promise<string> {
  const col = playlistsCol(artistUid);
  if (!col) throw new Error("Firebase Admin/Firestore not configured");

  const doc = await col.add({
    type: input.type,
    title: input.title,
    description: input.description ?? "",
    coverImageUrl: input.coverImageUrl ?? "",
    songIds: input.songIds ?? [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return doc.id;
}

export async function updatePlaylist(
  artistUid: string,
  playlistId: string,
  input: {
    type?: PlaylistType;
    title?: string;
    description?: string;
    coverImageUrl?: string;
    songIds?: string[];
  },
): Promise<void> {
  const col = playlistsCol(artistUid);
  if (!col) throw new Error("Firebase Admin/Firestore not configured");

  await col.doc(playlistId).set(
    {
      ...input,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function deletePlaylist(artistUid: string, playlistId: string): Promise<void> {
  const col = playlistsCol(artistUid);
  if (!col) throw new Error("Firebase Admin/Firestore not configured");
  await col.doc(playlistId).delete();
}
