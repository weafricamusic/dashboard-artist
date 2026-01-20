"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { getFirebaseClientAuth } from "../../../../lib/firebase/client";

async function createSession(idToken: string) {
  const res = await fetch("/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to create session");
  }
}

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const defaultRedirect = "/artist/dashboard/overview";
  const redirectTo = useMemo(() => {
    const value = searchParams.get("redirect");
    if (!value) return defaultRedirect;
    if (!value.startsWith("/")) return defaultRedirect;
    if (value.startsWith("//")) return defaultRedirect;
    return value;
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFirebaseWebConfig = Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  );

  const consumerLoginHref = `/auth/connect?mode=login&redirect=${encodeURIComponent(
    redirectTo,
  )}`;

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!hasFirebaseWebConfig) {
        throw new Error(
          "Dashboard login is not configured. Please sign in via the consumer app.",
        );
      }
      const auth = getFirebaseClientAuth();
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();
      await createSession(idToken);
      router.replace(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    setIsLoading(true);

    try {
      if (!hasFirebaseWebConfig) {
        throw new Error(
          "Dashboard login is not configured. Please sign in via the consumer app.",
        );
      }
      const auth = getFirebaseClientAuth();
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken();
      await createSession(idToken);
      router.replace(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Artist Login</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Sign in with your WeAfrica Artist account.
        </p>

        {!hasFirebaseWebConfig ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Login on this dashboard is disabled. Sign in (or sign up) in the consumer
            app, then you’ll be redirected back here.
            <div className="mt-3">
              <a
                className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                href={consumerLoginHref}
              >
                Continue in consumer app
              </a>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <form className="mt-5 space-y-3" onSubmit={handleEmailLogin}>
          <label className="block">
            <div className="text-sm font-medium text-zinc-700">Email</div>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={!hasFirebaseWebConfig || isLoading}
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-zinc-700">Password</div>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={!hasFirebaseWebConfig || isLoading}
            />
          </label>

          <button
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            type="submit"
            disabled={!hasFirebaseWebConfig || isLoading}
          >
            {isLoading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200" />
          <div className="text-xs text-zinc-500">or</div>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <button
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
          type="button"
          onClick={handleGoogleLogin}
          disabled={!hasFirebaseWebConfig || isLoading}
        >
          Continue with Google
        </button>

        <p className="mt-4 text-xs text-zinc-500">
          Admin approval may be required before you can access certain features.
        </p>
      </div>
    </div>
  );
}
