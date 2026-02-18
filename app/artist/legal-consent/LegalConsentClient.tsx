"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LegalConsentClient() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (!accepted) {
      setError("You must accept the Terms, Platform Policy, and Copyright Policy to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/legal/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accepted: true }),
      });

      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to record acceptance");
      }

      router.replace("/artist/dashboard/overview");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record acceptance");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
        <div className="text-sm font-semibold text-white">Legal Agreement</div>
        <p className="mt-2 text-sm text-zinc-300">
          To use the WeAfrica Music Artist Dashboard, you must agree to the following documents:
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Link
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-100 hover:bg-white/5"
            href="/legal/terms"
            target="_blank"
            rel="noreferrer"
          >
            Terms of Service
          </Link>
          <Link
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-100 hover:bg-white/5"
            href="/legal/platform-policy"
            target="_blank"
            rel="noreferrer"
          >
            Platform Policy
          </Link>
          <Link
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-100 hover:bg-white/5"
            href="/legal/copyright"
            target="_blank"
            rel="noreferrer"
          >
            Copyright Policy
          </Link>
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-100">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span>
            I agree to the Terms of Service, Platform Policy, and Copyright Policy.
          </span>
        </label>

        {error ? <div className="mt-3 text-sm text-amber-200/90">{error}</div> : null}

        <div className="mt-5">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className={
              "inline-flex h-10 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-500 " +
              (submitting ? "opacity-60" : "")
            }
          >
            {submitting ? "Saving…" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
