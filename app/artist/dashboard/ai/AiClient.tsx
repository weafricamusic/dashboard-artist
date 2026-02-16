"use client";

import { useState, useTransition } from "react";

import {
  generateBioAction,
  generateCaptionAction,
  generateRecommendationsAction,
  suggestReplyAction,
} from "./actions";

function TextArea({ value }: { value: string }) {
  return (
    <pre className="whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-100">
      {value}
    </pre>
  );
}

export function AiClient({ defaultCountry }: { defaultCountry: string }) {
  const [country, setCountry] = useState(defaultCountry);

  const [error, setError] = useState<string | null>(null);

  const [captionOut, setCaptionOut] = useState<string | null>(null);
  const [hashtagsOut, setHashtagsOut] = useState<string | null>(null);
  const [bioOut, setBioOut] = useState<string | null>(null);
  const [growthOut, setGrowthOut] = useState<string | null>(null);
  const [ideasOut, setIdeasOut] = useState<string | null>(null);
  const [moneyOut, setMoneyOut] = useState<string | null>(null);
  const [replyOut, setReplyOut] = useState<string | null>(null);

  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
        <div className="text-sm font-medium text-white">Country focus</div>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Malawi"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
          />
          <div className="text-xs text-zinc-400 flex items-center">
            AI outputs will prioritize this country first.
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
          <div className="text-sm font-medium text-white">Caption + hashtags</div>
          <div className="mt-1 text-xs text-zinc-500">Use this when uploading a song/video.</div>

          <form
            action={(fd) =>
              start(async () => {
                setError(null);
                fd.set("country", country);
                const res = await generateCaptionAction(fd);
                if (res.ok) {
                  setCaptionOut(res.caption);
                  setHashtagsOut(res.hashtags);
                } else {
                  setError(res.error);
                }
              })
            }
            className="mt-4 space-y-3"
          >
            <input
              name="songTitle"
              placeholder="Song title (e.g. My Love)"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
            />
            <input
              name="genre"
              placeholder="Genre (optional)"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
            />
            <input
              name="tags"
              placeholder="Tags (comma separated, optional)"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
            />
            <button
              disabled={pending}
              className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {pending ? "Generating…" : "Generate"}
            </button>
          </form>

          {captionOut ? (
            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium text-zinc-400 uppercase">Caption</div>
              <TextArea value={captionOut} />
            </div>
          ) : null}

          {hashtagsOut ? (
            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium text-zinc-400 uppercase">Hashtags</div>
              <TextArea value={hashtagsOut} />
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
          <div className="text-sm font-medium text-white">Bio improver</div>
          <div className="mt-1 text-xs text-zinc-500">Make your profile look professional.</div>

          <form
            action={(fd) =>
              start(async () => {
                setError(null);
                fd.set("country", country);
                const res = await generateBioAction(fd);
                if (res.ok) setBioOut(res.bio);
                else setError(res.error);
              })
            }
            className="mt-4 space-y-3"
          >
            <textarea
              name="currentBio"
              rows={4}
              placeholder="Paste your current bio (optional)"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
            />
            <button
              disabled={pending}
              className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {pending ? "Generating…" : "Improve bio"}
            </button>
          </form>

          {bioOut ? (
            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium text-zinc-400 uppercase">Suggested bio</div>
              <TextArea value={bioOut} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
          <div className="text-sm font-medium text-white">Growth + content ideas + monetization</div>
          <div className="mt-1 text-xs text-zinc-500">Actionable next steps (20–30 min live ideas included).</div>

          <form
            action={(fd) =>
              start(async () => {
                setError(null);
                fd.set("country", country);
                const res = await generateRecommendationsAction(fd);
                if (res.ok) {
                  setGrowthOut(res.growth);
                  setIdeasOut(res.ideas);
                  setMoneyOut(res.monetization);
                } else {
                  setError(res.error);
                }
              })
            }
            className="mt-4 space-y-3"
          >
            <input
              name="songTitle"
              placeholder="Optional: song title to base ideas on"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
            />
            <button
              disabled={pending}
              className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {pending ? "Generating…" : "Generate recommendations"}
            </button>
          </form>

          {growthOut ? (
            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium text-zinc-400 uppercase">Growth</div>
              <TextArea value={growthOut} />
            </div>
          ) : null}

          {ideasOut ? (
            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium text-zinc-400 uppercase">Content ideas</div>
              <TextArea value={ideasOut} />
            </div>
          ) : null}

          {moneyOut ? (
            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium text-zinc-400 uppercase">Monetization</div>
              <TextArea value={moneyOut} />
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm">
          <div className="text-sm font-medium text-white">Fan engagement assistant</div>
          <div className="mt-1 text-xs text-zinc-500">Paste a comment and get a suggested reply.</div>

          <form
            action={(fd) =>
              start(async () => {
                setError(null);
                fd.set("country", country);
                const res = await suggestReplyAction(fd);
                if (res.ok) setReplyOut(res.reply);
                else setError(res.error);
              })
            }
            className="mt-4 space-y-3"
          >
            <textarea
              name="comment"
              rows={4}
              placeholder="Paste a fan comment here…"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
            />
            <button
              disabled={pending}
              className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {pending ? "Generating…" : "Suggest reply"}
            </button>
          </form>

          {replyOut ? (
            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium text-zinc-400 uppercase">Suggested reply</div>
              <TextArea value={replyOut} />
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}
