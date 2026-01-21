"use client";

import { useCallback, useEffect, useState } from "react";

// Note: Agora RTC components are optional - requires agora-rtc-react package
// To enable, install: npm install agora-rtc-react agora-rtc-sdk-ng

interface LiveBroadcastProps {
  title: string;
  onEnd: () => void;
}

function LiveBroadcasterInner({
  title,
  onEnd,
}: LiveBroadcastProps) {
  // Agora client will be initialized when library is available
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [cameraList, setCameraList] = useState<MediaDeviceInfo[]>([]);
  const [currentCamera, setCurrentCamera] = useState<string>("");

  // Get available cameras
  useEffect(() => {
    const getCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setCameraList(videoDevices);
        if (videoDevices.length > 0) {
          setCurrentCamera(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error("Failed to get cameras:", err);
      }
    };
    getCameras();
  }, []);

  const switchCamera = useCallback(() => {
    // Camera switching would be implemented with Agora SDK
    console.log("Camera switching requires Agora SDK");
  }, []);

  const toggleMicrophone = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted]);

  const toggleCamera = useCallback(() => {
    setIsVideoOff(!isVideoOff);
  }, [isVideoOff]);

  const handleEndStream = useCallback(async () => {
    onEnd();
  }, [onEnd]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-rose-500 animate-pulse" />
              <p className="font-semibold text-white">🔴 LIVE</p>
            </div>
            <p className="mt-1 text-sm text-zinc-400">{title}</p>
          </div>
          <button
            onClick={handleEndStream}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
          >
            End Stream
          </button>
        </div>
      </div>

      {/* Video Preview */}
      <div className="relative rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden aspect-video flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-zinc-400">
            {isVideoOff ? "Camera is off" : "Initializing video feed..."}
          </p>
        </div>
      </div>

      {/* Camera Selection */}
      {cameraList.length > 1 && (
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-2">
            Switch Camera
          </label>
          <select
            value={currentCamera}
            onChange={() => switchCamera()}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-xs text-zinc-100 focus:border-zinc-600 focus:outline-none"
          >
            {cameraList.map((camera) => (
              <option key={camera.deviceId} value={camera.deviceId}>
                {camera.label || `Camera ${cameraList.indexOf(camera) + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={toggleMicrophone}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            isMuted
              ? "border border-amber-900/40 bg-amber-950/40 text-amber-200 hover:bg-amber-950/60"
              : "border border-zinc-800 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          {isMuted ? "🔇 Mic Off" : "🎤 Mic On"}
        </button>
        <button
          onClick={toggleCamera}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            isVideoOff
              ? "border border-amber-900/40 bg-amber-950/40 text-amber-200 hover:bg-amber-950/60"
              : "border border-zinc-800 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          {isVideoOff ? "📹 Camera Off" : "📷 Camera On"}
        </button>
      </div>

      {/* Info */}
      <div className="rounded-lg border border-amber-900/40 bg-amber-950/40 p-3 text-xs text-amber-200">
        <p className="font-medium">Note</p>
        <p className="mt-1">
          To enable live video streaming with Agora, install the SDK: npm
          install agora-rtc-react agora-rtc-sdk-ng
        </p>
      </div>
    </div>
  );
}

export function LiveBroadcaster(props: LiveBroadcastProps) {
  return <LiveBroadcasterInner {...props} />;
}
