import "server-only";

import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function hasFirebaseAdminEnv(): boolean {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return true;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) return true;
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

function normalizePrivateKey(key: string): string {
  return key.replace(/\\n/g, "\n");
}

type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function getServiceAccountFromEnv(): {
  projectId: string;
  clientEmail: string;
  privateKey: string;
} {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    let parsed: ServiceAccountJson;
    try {
      parsed = JSON.parse(json) as ServiceAccountJson;
    } catch {
      throw new Error(
        "Invalid FIREBASE_SERVICE_ACCOUNT_JSON: expected valid JSON.",
      );
    }

    const projectId = parsed.project_id;
    const clientEmail = parsed.client_email;
    const privateKey = parsed.private_key;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Invalid FIREBASE_SERVICE_ACCOUNT_JSON: missing project_id, client_email, or private_key.",
      );
    }

    return {
      projectId,
      clientEmail,
      privateKey: normalizePrivateKey(privateKey),
    };
  }

  const jsonPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (jsonPath) {
    const fullPath = resolvePath(process.cwd(), jsonPath);
    let parsed: ServiceAccountJson;
    try {
      parsed = JSON.parse(readFileSync(fullPath, "utf8")) as ServiceAccountJson;
    } catch {
      throw new Error(
        `Invalid FIREBASE_SERVICE_ACCOUNT_PATH: failed to read/parse JSON at ${fullPath}.`,
      );
    }

    const projectId = parsed.project_id;
    const clientEmail = parsed.client_email;
    const privateKey = parsed.private_key;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Invalid FIREBASE_SERVICE_ACCOUNT_PATH JSON: missing project_id, client_email, or private_key.",
      );
    }

    return {
      projectId,
      clientEmail,
      privateKey: normalizePrivateKey(privateKey),
    };
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY!),
  };
}

export function getFirebaseAdminAuth() {
  if (!hasFirebaseAdminEnv()) return null;

  try {
    if (getApps().length === 0) {
      const { projectId, clientEmail, privateKey } = getServiceAccountFromEnv();
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    return getAuth();
  } catch (err) {
    // Misconfigured env (invalid JSON, missing file, bad key formatting, etc.) should not
    // crash the entire app in production. Routes can treat "null" as "not configured".
    const message = err instanceof Error ? err.message : String(err ?? "");
    console.error("Firebase Admin initialization failed:", message);
    return null;
  }
}
