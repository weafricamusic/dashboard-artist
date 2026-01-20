import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

export function getFirebaseClientApp(): FirebaseApp {
  if (getApps().length > 0) return getApps()[0]!;

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey) throw new Error("Missing required env var: NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!authDomain)
    throw new Error("Missing required env var: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (!projectId)
    throw new Error("Missing required env var: NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (!appId) throw new Error("Missing required env var: NEXT_PUBLIC_FIREBASE_APP_ID");

  const firebaseConfig = {
    apiKey,
    authDomain,
    projectId,
    appId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  };

  return initializeApp(firebaseConfig);
}

export function getFirebaseClientAuth(): Auth {
  return getAuth(getFirebaseClientApp());
}
