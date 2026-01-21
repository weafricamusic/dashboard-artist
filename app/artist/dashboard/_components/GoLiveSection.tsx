"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { GoLiveModal } from "./GoLiveModal";
import { getIdToken } from "firebase/auth";
import { getAuth } from "firebase/auth";

export function GoLiveSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleGoLive = useCallback(
    async (data: { title: string; notes: string }) => {
      setIsLoading(true);
      try {
        // Get the Firebase auth token
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          throw new Error("Not authenticated");
        }

        const idToken = await getIdToken(user);

        // Call the Go Live API
        const response = await fetch("/api/go-live", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            title: data.title,
            notes: data.notes,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to start live stream");
        }

        const responseData = await response.json();

        if (responseData.ok && responseData.session) {
          // Store session data in sessionStorage for the broadcast page
          sessionStorage.setItem(
            "liveSession",
            JSON.stringify({
              sessionId: responseData.session.id,
              channelId: responseData.session.channelId,
              agoraToken: responseData.session.agoraToken,
              uid: responseData.session.uid,
              title: responseData.session.title,
            })
          );

          // Close the modal
          setIsModalOpen(false);

          // Navigate to the broadcast page
          router.push(
            `/artist/dashboard/live/broadcast?sessionId=${responseData.session.id}`
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to start live stream";
        console.error("Go Live error:", errorMessage);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="rounded-lg bg-rose-600 px-6 py-3 text-base font-semibold text-white hover:bg-rose-500 transition-colors shadow-lg"
      >
        🔴 Go Live
      </button>

      <GoLiveModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGoLive={handleGoLive}
        isLoading={isLoading}
      />
    </>
  );
}
