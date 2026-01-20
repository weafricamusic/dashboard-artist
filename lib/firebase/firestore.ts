import "server-only";

import { getFirestore } from "firebase-admin/firestore";

import { getFirebaseAdminAuth } from "./admin";

let hasWarnedFirestoreDisabled = false;
let hasWarnedFirestoreNotFound = false;

function readErrStringField(err: unknown, field: string): string | null {
  if (!err || typeof err !== "object") return null;
  if (!(field in err)) return null;
  const v = (err as Record<string, unknown>)[field];
  return typeof v === "string" ? v : v != null ? String(v) : null;
}

function readErrNumberField(err: unknown, field: string): number | null {
  if (!err || typeof err !== "object") return null;
  if (!(field in err)) return null;
  const v = (err as Record<string, unknown>)[field];
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function getErrMessage(err: unknown): string {
  return (
    readErrStringField(err, "message") ??
    readErrStringField(err, "details") ??
    String(err ?? "")
  );
}

function getErrSearchText(err: unknown): string {
  const parts: string[] = [];

  const name = readErrStringField(err, "name");
  if (name) parts.push(name);

  const status = readErrStringField(err, "status");
  if (status) parts.push(status);

  const codeNum = readErrNumberField(err, "code");
  if (codeNum !== null) parts.push(String(codeNum));

  const codeStr = readErrStringField(err, "code");
  if (codeStr) parts.push(codeStr);

  const message = getErrMessage(err);
  if (message) parts.push(message);

  // Some Firebase/GCP errors stringify well even if message is missing.
  try {
    const s = String(err ?? "");
    if (s && s !== "[object Object]" && s !== message) parts.push(s);
  } catch {
    // ignore
  }

  try {
    const json = JSON.stringify(err);
    if (json && json !== "{}") parts.push(json);
  } catch {
    // ignore
  }

  return parts.join(" | ").toUpperCase();
}

export function isFirestoreApiDisabledError(err: unknown): boolean {
  const search = getErrSearchText(err);

  // Typical message:
  // "7 PERMISSION_DENIED: Cloud Firestore API has not been used in project <id> before or it is disabled..."
  return (
    search.includes("CLOUD FIRESTORE API HAS NOT BEEN USED") ||
    (search.includes("FIRESTORE.GOOGLEAPIS.COM") && search.includes("DISABLED"))
  );
}

export function isFirestoreNotFoundError(err: unknown): boolean {
  const search = getErrSearchText(err);

  // gRPC NOT_FOUND is code 5.
  if (!(search.includes("NOT_FOUND") || search.includes("| 5 |") || search.includes(" 5 NOT_FOUND"))) {
    return false;
  }

  // Queries on missing collections return empty results, so NOT_FOUND here usually indicates
  // the Firestore database itself (often "(default)") isn't created/available.
  return search.includes("DATABASE") || search.includes("NOT_FOUND") || getErrMessage(err).length === 0;
}

export function warnFirestoreApiDisabledOnce(err: unknown): void {
  if (hasWarnedFirestoreDisabled) return;
  hasWarnedFirestoreDisabled = true;

  const message = getErrMessage(err);

  console.warn(
    "Firestore API appears disabled for the configured Firebase project. " +
      "Enable it in Google Cloud Console (APIs & Services → Cloud Firestore API) " +
      "or Firebase Console (Firestore Database → Create database), then retry. Original error:\n" +
      message,
  );
}

export function warnFirestoreNotFoundOnce(err: unknown): void {
  if (hasWarnedFirestoreNotFound) return;
  hasWarnedFirestoreNotFound = true;

  const message = getErrMessage(err);

  console.warn(
    "Firestore returned NOT_FOUND for a query. This usually means the Firestore database (often the '(default)' database) " +
      "has not been created for the configured Firebase project, or the project is in Datastore mode. " +
      "Create/enable Firestore in Firebase Console → Firestore Database → Create database, then retry. Original error:\n" +
      message,
  );
}

export function getFirebaseAdminFirestore() {
  // Ensure Admin app is initialized.
  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) return null;

  return getFirestore();
}
