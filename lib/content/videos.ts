import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import {
  getFirebaseAdminFirestore,
  isFirestoreApiDisabledError,
  isFirestoreNotFoundError,
  warnFirestoreApiDisabledOnce,
  warnFirestoreNotFoundOnce,
} from "../firebase/firestore";
import { type Video, type ContentStatus } from "./types";
import { getArtistSubscriptionStatus } from "../subscriptions/artist";
import { getFeatureInt, hasFeature } from "../subscriptions/features";

function videosCol(artistUid: string) {
  const db = getFirebaseAdminFirestore();
  if (!db) return null;
  return db.collection("artists").doc(artistUid).collection("videos");
}

function nowIso(): string {
  return new Date().toISOString();
}

function toVideo(artistUid: string, id: string, data: FirebaseFirestore.DocumentData): Video {
  return {
    id,
    artistUid,

    title: String(data.title ?? ""),
    description: data.description ? String(data.description) : undefined,
    videoUrl: data.videoUrl ? String(data.videoUrl) : undefined,
    thumbnailUrl: data.thumbnailUrl ? String(data.thumbnailUrl) : undefined,

    status: (data.status as ContentStatus) ?? "draft",

    views: Number(data.views ?? 0),
    likes: Number(data.likes ?? 0),
    comments: Number(data.comments ?? 0),
    shares: Number(data.shares ?? 0),

    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : String(data.createdAt ?? nowIso()),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : String(data.updatedAt ?? nowIso()),
  };
}

export async function listVideos(artistUid: string): Promise<Video[]> {
  const col = videosCol(artistUid);
  if (!col) return [];

  try {
    const snap = await col.orderBy("updatedAt", "desc").limit(250).get();
    return snap.docs.map((d) => toVideo(artistUid, d.id, d.data()));
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

export async function getVideo(artistUid: string, videoId: string): Promise<Video | null> {
  const col = videosCol(artistUid);
  if (!col) return null;
  const doc = await col.doc(videoId).get();
  if (!doc.exists) return null;
  return toVideo(artistUid, doc.id, doc.data()!);
}

export async function createVideo(
  artistUid: string,
  input: {
    title: string;
    description?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    status?: ContentStatus;
  },
): Promise<string> {
  const subscription = await getArtistSubscriptionStatus(artistUid);
  const canUpload = hasFeature(subscription.features, "uploads.videos", true);
  if (!canUpload) {
    throw new Error("Video uploads are locked on your current plan. Upgrade to upload videos.");
  }

  const col = videosCol(artistUid);
  if (!col) throw new Error("Firebase Admin/Firestore not configured");

  const maxVideos = getFeatureInt(subscription.features, "limits.maxVideos", 5);
  if (maxVideos > 0) {
    const snap = await col.limit(maxVideos + 1).get();
    if (snap.size >= maxVideos) {
      throw new Error(`You have reached your plan limit (${maxVideos}) for videos. Upgrade to upload more.`);
    }
  }

  const doc = await col.add({
    title: input.title,
    description: input.description ?? "",
    videoUrl: input.videoUrl ?? "",
    thumbnailUrl: input.thumbnailUrl ?? "",
    status: input.status ?? "draft",
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return doc.id;
}

export async function updateVideo(
  artistUid: string,
  videoId: string,
  input: {
    title?: string;
    description?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    status?: ContentStatus;
  },
): Promise<void> {
  const col = videosCol(artistUid);
  if (!col) throw new Error("Firebase Admin/Firestore not configured");

  await col.doc(videoId).set(
    {
      ...input,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function deleteVideo(artistUid: string, videoId: string): Promise<void> {
  const col = videosCol(artistUid);
  if (!col) throw new Error("Firebase Admin/Firestore not configured");
  await col.doc(videoId).delete();
}
