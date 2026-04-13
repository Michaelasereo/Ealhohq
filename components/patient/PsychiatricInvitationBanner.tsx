"use client";

import { Brain, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { bookingDateStartToIso, formatWAT } from "@/lib/wat-datetime";
import { cn } from "@/lib/utils";

export type PsychiatricInvite = {
  id: string;
  expiresAt: string;
  psychiatristName: string;
  bookingId: string;
  date: string;
  startTime: string;
  endTime: string;
};

type Props = {
  invites: PsychiatricInvite[];
  onChanged: () => void;
};

export function PsychiatricInvitationBanner({ invites, onChanged }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  if (!invites.length) return null;

  return (
    <div className="space-y-3">
      {invites.map((inv) => {
        const startIso = bookingDateStartToIso(new Date(inv.date), inv.startTime);
        const dateLabel = formatWAT(startIso);
        return (
          <div
            key={inv.id}
            className="rounded-2xl border border-blue-200 bg-blue-50/90 p-4"
          >
            <div className="mb-3 flex gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <Brain className="size-5 text-blue-700" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold text-blue-950">
                  Psychiatric assessment recommended
                </p>
                <p className="mt-1 text-xs text-blue-900/90">
                  Your therapist suggested a one-time assessment with Dr{" "}
                  {inv.psychiatristName}. Review cost in checkout if needed.
                </p>
                <p className="mt-2 text-xs text-blue-800">{dateLabel}</p>
                <p className="text-xs text-blue-700/80">
                  Invitation expires{" "}
                  {new Date(inv.expiresAt).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="h-12 flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={busy === inv.id}
                onClick={async () => {
                  setBusy(inv.id);
                  try {
                    const r = await fetch(
                      `/api/patient/psychiatric-invitations/${inv.id}`,
                      {
                        method: "PATCH",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "accept" }),
                      },
                    );
                    const j = (await r.json()) as {
                      success?: boolean;
                      data?: {
                        pay?: { bookingId: string };
                        status?: string;
                      };
                    };
                    if (!r.ok || !j.success) throw new Error("Could not accept");
                    if (j.data?.pay?.bookingId) {
                      const init = await fetch("/api/payment/initialize", {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          bookingId: j.data.pay.bookingId,
                          returnToPatientDashboard: true,
                          packageType: "single",
                        }),
                      });
                      const ij = (await init.json()) as {
                        success?: boolean;
                        data?: { authorization_url?: string };
                      };
                      if (
                        init.ok &&
                        ij.success &&
                        ij.data?.authorization_url
                      ) {
                        window.location.href = ij.data.authorization_url;
                        return;
                      }
                    }
                    onChanged();
                  } catch {
                    setBusy(null);
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                {busy === inv.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Accept"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "h-12 border-blue-200 text-blue-800 hover:bg-blue-100/80",
                )}
                disabled={busy === inv.id}
                onClick={async () => {
                  setBusy(inv.id);
                  try {
                    await fetch(`/api/patient/psychiatric-invitations/${inv.id}`, {
                      method: "PATCH",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "decline" }),
                    });
                    onChanged();
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                Decline
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
