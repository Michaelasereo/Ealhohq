"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ConnectionUi = "connecting" | "connected" | "reconnecting" | "disconnected";

export type AgoraVideoCallProps = {
  appId: string;
  channelName: string;
  token: string;
  uid: number;
  bookingId: string;
  guestEmail?: string | null;
  onSessionEnd: (transcript: string) => void;
};

export default function AgoraVideoCall({
  appId,
  channelName,
  token,
  uid,
  bookingId,
  guestEmail,
  onSessionEnd,
}: AgoraVideoCallProps) {
  const clientRef = useRef<import("agora-rtc-sdk-ng").IAgoraRTCClient | null>(
    null,
  );
  const localContainerRef = useRef<HTMLDivElement>(null);
  const remoteContainerRef = useRef<HTMLDivElement>(null);

  const localAudioRef = useRef<import("agora-rtc-sdk-ng").IMicrophoneAudioTrack | null>(
    null,
  );
  const localVideoRef = useRef<import("agora-rtc-sdk-ng").ICameraVideoTrack | null>(
    null,
  );

  const [connectionState, setConnectionState] =
    useState<ConnectionUi>("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<string[]>([]);

  const leaveChannel = useCallback(async () => {
    try {
      localAudioRef.current?.close();
      localVideoRef.current?.close();
      localAudioRef.current = null;
      localVideoRef.current = null;
      await clientRef.current?.leave();
      clientRef.current = null;
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function joinChannel() {
      try {
        const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
        if (cancelled) return;

        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;

        client.on("connection-state-change", (cur) => {
          if (cur === "CONNECTED") setConnectionState("connected");
          else if (cur === "RECONNECTING") setConnectionState("reconnecting");
          else if (cur === "DISCONNECTED") setConnectionState("disconnected");
        });

        client.on("user-published", async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === "video" && user.videoTrack) {
            setHasRemoteVideo(true);
            if (remoteContainerRef.current) {
              user.videoTrack.play(remoteContainerRef.current);
            }
          }
          if (mediaType === "audio" && user.audioTrack) {
            user.audioTrack.play();
          }
        });

        client.on("user-unpublished", (_user, mediaType) => {
          if (mediaType === "video") setHasRemoteVideo(false);
        });

        await client.join(appId, channelName, token, uid);

        const [audioTrack, videoTrack] =
          await AgoraRTC.createMicrophoneAndCameraTracks();
        localAudioRef.current = audioTrack;
        localVideoRef.current = videoTrack;

        if (localContainerRef.current) {
          videoTrack.play(localContainerRef.current);
        }
        await client.publish([audioTrack, videoTrack]);
        setConnectionState("connected");
      } catch (e) {
        console.error("Failed to join channel:", e);
        setConnectionState("disconnected");
      }
    }

    void joinChannel();

    timerRef.current = setInterval(() => {
      setSessionDuration((p) => p + 1);
    }, 1000);

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      void leaveChannel();
    };
  }, [appId, channelName, token, uid, leaveChannel]);

  async function handleEndSession() {
    setIsEnding(true);
    await leaveChannel();
    const transcript =
      transcriptRef.current.join("\n") ||
      "[No transcript available — notes will need manual entry]";
    onSessionEnd(transcript);
  }

  function toggleMute() {
    const t = localAudioRef.current;
    if (!t) return;
    const nextMuted = !isMuted;
    t.setEnabled(!nextMuted);
    setIsMuted(nextMuted);
  }

  function toggleCamera() {
    const t = localVideoRef.current;
    if (!t) return;
    const nextOff = !isCameraOff;
    t.setEnabled(!nextOff);
    setIsCameraOff(nextOff);
  }

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  void bookingId;
  void guestEmail;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {connectionState === "connecting" ? (
        <div className="absolute top-0 right-0 left-0 z-10 bg-yellow-500 py-2 text-center text-sm text-black">
          Connecting…
        </div>
      ) : null}
      {connectionState === "reconnecting" ? (
        <div className="absolute top-0 right-0 left-0 z-10 bg-yellow-500 py-2 text-center text-sm text-black">
          Reconnecting…
        </div>
      ) : null}

      <div
        ref={remoteContainerRef}
        className="relative flex-1 bg-gray-900"
      >
        {!hasRemoteVideo ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="mx-auto mb-3 flex size-20 items-center justify-center rounded-full bg-gray-700">
                <span className="text-3xl">👤</span>
              </div>
              <p className="text-gray-400">Waiting for other participant…</p>
            </div>
          </div>
        ) : null}
      </div>

      <div
        ref={localContainerRef}
        className="absolute top-16 right-4 h-36 w-28 overflow-hidden rounded-xl border-2 border-white/20 bg-gray-800"
      />

      <div className="absolute top-16 left-4 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
        {formatDuration(sessionDuration)}
      </div>

      <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent pt-4 pb-8">
        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={toggleMute}
            className={`flex size-14 items-center justify-center rounded-full text-xl text-white transition-colors ${
              isMuted ? "bg-red-500" : "bg-white/20 hover:bg-white/30"
            }`}
          >
            {isMuted ? "🔇" : "🎤"}
          </button>

          <button
            type="button"
            onClick={() => setShowEndConfirm(true)}
            className="flex size-16 items-center justify-center rounded-full bg-red-500 text-2xl text-white shadow-lg transition-colors hover:bg-red-600"
          >
            📵
          </button>

          <button
            type="button"
            onClick={toggleCamera}
            className={`flex size-14 items-center justify-center rounded-full text-xl text-white transition-colors ${
              isCameraOff ? "bg-red-500" : "bg-white/20 hover:bg-white/30"
            }`}
          >
            {isCameraOff ? "📷" : "📹"}
          </button>
        </div>
      </div>

      {showEndConfirm ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="mb-2 text-lg font-semibold">End this session?</h3>
            <p className="mb-6 text-sm text-gray-600">
              Your session notes will be generated automatically after ending.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 rounded-xl border border-gray-200 py-3 font-medium text-gray-700"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => void handleEndSession()}
                disabled={isEnding}
                className="flex-1 rounded-xl bg-red-500 py-3 font-medium text-white disabled:opacity-50"
              >
                {isEnding ? "Ending…" : "End Session"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
