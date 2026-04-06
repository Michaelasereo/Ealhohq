"use client";

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { InvitePatientModal } from "@/components/admin/InvitePatientModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PatientRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  createdAt: string;
  profile: { status: string } | null;
  credits: { balance: number } | null;
  _count: { bookings: number };
};

async function fetchPatients(): Promise<PatientRow[]> {
  const res = await fetch("/api/admin/patients", { credentials: "include" });
  const json = (await res.json()) as {
    success?: boolean;
    data?: PatientRow[];
    error?: string;
  };
  if (!res.ok || !json.data) throw new Error(json.error ?? "Failed to load");
  return json.data;
}

export default function AdminPatientsPage() {
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [creditId, setCreditId] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState(1);

  const listQ = useQuery({
    queryKey: ["admin-patients"],
    queryFn: fetchPatients,
  });

  const creditsM = useMutation({
    mutationFn: async ({
      patientId,
      amount,
    }: {
      patientId: string;
      amount: number;
    }) => {
      const res = await fetch(`/api/admin/patients/${patientId}/credits`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Failed to add credits");
    },
    onSuccess: () => {
      setCreditId(null);
      void qc.invalidateQueries({ queryKey: ["admin-patients"] });
    },
  });

  const deactivateM = useMutation({
    mutationFn: async (patientId: string) => {
      const res = await fetch(`/api/admin/patients/${patientId}/deactivate`, {
        method: "PUT",
        credentials: "include",
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Failed to deactivate");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-patients"] });
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-muted-foreground text-sm">
            Accounts, credits, and session counts.
          </p>
        </div>
        <Button
          className="h-12 min-h-[48px] shrink-0 bg-primary"
          onClick={() => setInviteOpen(true)}
        >
          <UserPlus className="mr-2 size-4" strokeWidth={1.5} />
          Invite client
        </Button>
      </div>

      {listQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Phone</th>
                <th className="p-3 font-medium">Sessions</th>
                <th className="p-3 font-medium">Credits</th>
                <th className="p-3 font-medium">Joined</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(listQ.data ?? []).map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.fullName}</td>
                  <td className="p-3 text-muted-foreground">{p.email}</td>
                  <td className="p-3">{p.phone || "—"}</td>
                  <td className="p-3">{p._count.bookings}</td>
                  <td className="p-3">{p.credits?.balance ?? 0}</td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString("en-NG")}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      {creditId === p.id ? (
                        <>
                          <Input
                            type="number"
                            min={1}
                            className="h-9 w-24"
                            value={creditAmount}
                            onChange={(e) =>
                              setCreditAmount(Number(e.target.value))
                            }
                          />
                          <Button
                            size="sm"
                            disabled={creditsM.isPending}
                            onClick={() =>
                              creditsM.mutate({
                                patientId: p.id,
                                amount: creditAmount,
                              })
                            }
                          >
                            {creditsM.isPending ? (
                              <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
                            ) : (
                              "Add credits"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCreditId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCreditId(p.id);
                              setCreditAmount(1);
                            }}
                          >
                            Add credits
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive text-destructive"
                            disabled={deactivateM.isPending}
                            onClick={() => deactivateM.mutate(p.id)}
                          >
                            Deactivate
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <InvitePatientModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={() => void qc.invalidateQueries({ queryKey: ["admin-patients"] })}
      />
    </div>
  );
}
