"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const AgoraVideoCall = dynamic(
  () => import("@/components/session/AgoraVideoCall"),
  { ssr: false },
);

type Stage = "setup" | "calling" | "done";

const SAMPLE_WA =
  "Test message from Ealho Therapy — your WhatsApp integration is working. 🎉";

export default function TestSessionPage() {
  const [stage, setStage] = useState<Stage>("setup");
  const [config, setConfig] = useState({
    channelName: "test-channel-001",
    uid: 1,
  });
  const [token, setToken] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [joining, setJoining] = useState(false);

  const [waPhone, setWaPhone] = useState("");
  const [waMessage, setWaMessage] = useState(SAMPLE_WA);
  const [waLoading, setWaLoading] = useState(false);
  const [waErr, setWaErr] = useState<string | null>(null);
  const [waResult, setWaResult] = useState<string | null>(null);

  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID ?? "";

  const handleJoin = useCallback(async () => {
    setJoinError(null);
    setJoining(true);
    try {
      const res = await fetch("/api/test/agora-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelName: config.channelName,
          uid: config.uid,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        data?: { token: string; appId?: string };
        error?: string;
      };
      if (!res.ok || !data.success || !data.data) {
        setJoinError(data.error ?? "Could not get token");
        setJoining(false);
        return;
      }
      setToken(data.data.token);
      setStage("calling");
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Token error");
    } finally {
      setJoining(false);
    }
  }, [config.channelName, config.uid]);

  const sendTestWhatsApp = useCallback(async () => {
    setWaErr(null);
    setWaResult(null);
    setWaLoading(true);
    try {
      const res = await fetch("/api/test/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: waPhone.trim(),
          message: waMessage.trim() || SAMPLE_WA,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        data?: unknown;
        error?: string;
      };
      if (!res.ok) {
        setWaErr(data.error ?? "Request failed");
        return;
      }
      setWaResult(JSON.stringify(data.data ?? data, null, 2));
    } catch (e) {
      setWaErr(e instanceof Error ? e.message : "Send failed");
    } finally {
      setWaLoading(false);
    }
  }, [waMessage, waPhone]);

  function handleSessionEnd(t: string) {
    setTranscript(t);
    setStage("done");
    setToken(null);
  }

  if (stage === "setup") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-muted/40 p-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            Video session test
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Test Agora without a real booking. Open this URL in two tabs: same
            channel, different roles (UID 1 vs 2).
          </p>

          <div className="mb-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Channel name
              </label>
              <input
                value={config.channelName}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, channelName: e.target.value }))
                }
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="test-channel-001"
              />
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-foreground">
                Role
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfig((p) => ({ ...p, uid: 1 }))}
                  className={cn(
                    "flex-1 rounded-lg border py-2 text-sm font-medium transition-colors",
                    config.uid === 1
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  Therapist (UID 1)
                </button>
                <button
                  type="button"
                  onClick={() => setConfig((p) => ({ ...p, uid: 2 }))}
                  className={cn(
                    "flex-1 rounded-lg border py-2 text-sm font-medium transition-colors",
                    config.uid === 2
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  Client (UID 2)
                </button>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
            <p className="text-xs text-amber-950 dark:text-amber-100">
              Use the same channel in both tabs; join both after starting the
              first.
            </p>
          </div>

          {joinError ? (
            <p className="mb-4 text-sm text-destructive" role="alert">
              {joinError}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void handleJoin()}
            disabled={joining || !appId}
            className="w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {joining ? "Joining…" : "Join test session"}
          </button>

          {!appId ? (
            <p className="mt-4 text-center text-xs text-destructive">
              Set NEXT_PUBLIC_AGORA_APP_ID in .env.local
            </p>
          ) : (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Dev-only token API. Not available in production.
            </p>
          )}
        </div>

        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h2 className="mb-2 text-xl font-bold text-foreground">
            📱 Test WhatsApp
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Sends via your configured provider (see{" "}
            <code className="text-xs">WHATSAPP_PROVIDER</code> in{" "}
            <code className="text-xs">.env.local</code>). Dev-only endpoint.
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wa-phone">Phone (Nigerian format)</Label>
              <Input
                id="wa-phone"
                className="min-h-12"
                placeholder="08012345678"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa-msg">Message</Label>
              <textarea
                id="wa-msg"
                rows={4}
                className={cn(
                  "min-h-[100px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base",
                  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
                )}
                value={waMessage}
                onChange={(e) => setWaMessage(e.target.value)}
              />
            </div>
            {waErr ? (
              <p className="text-sm text-destructive" role="alert">
                {waErr}
              </p>
            ) : null}
            {waResult ? (
              <pre className="max-h-40 overflow-auto rounded-lg bg-muted p-3 text-xs">
                {waResult}
              </pre>
            ) : null}
            <Button
              type="button"
              className="min-h-12 w-full"
              disabled={waLoading || !waPhone.trim()}
              onClick={() => void sendTestWhatsApp()}
            >
              {waLoading ? "Sending…" : "Send test message"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "calling" && token !== null) {
    return (
      <AgoraVideoCall
        appId={appId}
        channelName={config.channelName}
        token={token}
        uid={config.uid}
        bookingId="test-booking"
        onSessionEnd={handleSessionEnd}
      />
    );
  }

  if (stage === "calling") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-white">Preparing…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-foreground">
          Session ended
        </h2>
        <div className="mb-6 rounded-xl bg-muted/50 p-4">
          <p className="mb-2 text-sm font-medium text-foreground">
            Transcript captured
          </p>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {transcript || "No transcript captured"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setStage("setup");
            setTranscript("");
          }}
          className="w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground"
        >
          Test again
        </button>
      </div>
    </div>
  );
}
