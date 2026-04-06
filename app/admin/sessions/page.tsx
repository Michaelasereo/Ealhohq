"use client";

import Link from "next/link";
import { useState } from "react";
import { Calendar, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AdminSessionBookingModal } from "@/components/admin/AdminSessionBookingModal";
import { therapistPublicLabel } from "@/lib/therapist-display-name";
import { Button } from "@/components/ui/button";

type BookingRow = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  sessionType: string;
  professionalType: string | null;
  paidWithCredits: boolean;
  therapist: {
    profile: { fullName: string };
  };
  patient: { fullName: string; email: string } | null;
  session: { id: string; status: string } | null;
};

async function fetchBookings(): Promise<BookingRow[]> {
  const res = await fetch("/api/admin/sessions", { credentials: "include" });
  const json = (await res.json()) as {
    success?: boolean;
    data?: BookingRow[];
    error?: string;
  };
  if (!res.ok || !json.data) throw new Error(json.error ?? "Failed to load");
  return json.data;
}

export default function AdminSessionsPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const listQ = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: fetchBookings,
  });

  const cancelM = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await fetch(`/api/admin/bookings/${bookingId}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Cancel failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-sessions"] });
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground text-sm">
            Schedule and review therapy sessions.
          </p>
        </div>
        <Button
          className="h-12 min-h-[48px] shrink-0 bg-primary"
          onClick={() => setModalOpen(true)}
        >
          <Calendar className="mr-2 size-4" strokeWidth={1.5} />
          Schedule session
        </Button>
      </div>

      {listQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Time</th>
                <th className="p-3 font-medium">Therapist</th>
                <th className="p-3 font-medium">Client</th>
                <th className="p-3 font-medium">Professional type</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Payment</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(listQ.data ?? []).map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="p-3">
                    {new Date(b.date).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="p-3">
                    {b.startTime}–{b.endTime} WAT
                  </td>
                  <td className="p-3">
                    {therapistPublicLabel(b.therapist.profile.fullName)}
                  </td>
                  <td className="p-3">
                    {b.patient?.fullName ?? "—"}{" "}
                    <span className="text-muted-foreground text-xs">
                      {b.patient?.email}
                    </span>
                  </td>
                  <td className="p-3">
                    {b.professionalType ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {b.professionalType}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 capitalize">{b.sessionType}</td>
                  <td className="p-3">
                    {b.paidWithCredits
                      ? "Credits"
                      : b.paymentStatus === "paid"
                        ? "Paid"
                        : b.paymentStatus}
                  </td>
                  <td className="p-3">{b.status}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/session/join?bookingId=${b.id}`}
                        className="inline-flex h-7 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
                      >
                        View
                      </Link>
                      {b.status !== "cancelled" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-destructive text-destructive"
                          disabled={cancelM.isPending}
                          onClick={() => cancelM.mutate(b.id)}
                        >
                          {cancelM.isPending ? (
                            <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
                          ) : (
                            "Cancel"
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminSessionBookingModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={() => void qc.invalidateQueries({ queryKey: ["admin-sessions"] })}
      />
    </div>
  );
}
