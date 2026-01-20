"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireArtistSession } from "../../../../lib/auth/artist";
import { markInboxThreadRead, sendArtistReply } from "../../../../lib/messages/inbox";

export async function sendArtistReplyAction(formData: FormData) {
  const session = await requireArtistSession();

  const threadId = String(formData.get("threadId") ?? "");
  const body = String(formData.get("body") ?? "");

  if (!threadId) {
    redirect("/artist/dashboard/messages");
  }

  const res = await sendArtistReply(session.user.uid, threadId, body);
  revalidatePath("/artist/dashboard/messages");

  // For now we surface errors by redirecting with a flag; keep actions simple.
  if (!res.ok) {
    redirect(`/artist/dashboard/messages?thread=${encodeURIComponent(threadId)}&error=${encodeURIComponent(res.message)}`);
  }

  redirect(`/artist/dashboard/messages?thread=${encodeURIComponent(threadId)}`);
}

export async function markThreadReadAction(formData: FormData) {
  const session = await requireArtistSession();

  const threadId = String(formData.get("threadId") ?? "");
  if (!threadId) {
    redirect("/artist/dashboard/messages");
  }

  const res = await markInboxThreadRead(session.user.uid, threadId);
  revalidatePath("/artist/dashboard/messages");

  if (!res.ok) {
    redirect(`/artist/dashboard/messages?thread=${encodeURIComponent(threadId)}&error=${encodeURIComponent(res.message)}`);
  }

  redirect(`/artist/dashboard/messages?thread=${encodeURIComponent(threadId)}`);
}
