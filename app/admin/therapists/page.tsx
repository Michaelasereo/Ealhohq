"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  UserPlus,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { EarningsSplitModal } from "@/components/admin/EarningsSplitModal";
import { InviteTherapistModal } from "@/components/admin/InviteTherapistModal";
import { therapistPublicLabel } from "@/lib/therapist-display-name";
import { TherapistDetailSheet } from "@/components/admin/TherapistDetailSheet";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
type TherapistRow = {
  id: string;
  profileId: string;
  status: string;
  bio: string | null;
  specializations: string[];
  qualifications: string[];
  sessionRate: number;
  sessionDuration: number;
  createdAt: string;
  email: string | null;
  profile: { fullName: string; phone: string | null };
  _count: { sessions: number; bookings: number };
  therapistPercent: number;
  platformPercent: number;
  totalTherapistEarnings: number;
  paidCompletedSessions: number;
};

async function fetchTherapists(
  status: string,
): Promise<TherapistRow[]> {
  const q = status === "all" ? "" : `?status=${encodeURIComponent(status)}`;
  const res = await fetch(`/api/admin/therapists${q}`, {
    credentials: "include",
  });
  const json = (await res.json()) as {
    success?: boolean;
    data?: TherapistRow[];
    error?: string;
  };
  if (!res.ok || !json.data) throw new Error(json.error ?? "Failed to load");
  return json.data;
}

export default function AdminTherapistsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTherapist, setDetailTherapist] = useState<TherapistRow | null>(
    null,
  );
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [earningsModal, setEarningsModal] = useState<TherapistRow | null>(null);

  const listQ = useQuery({
    queryKey: ["admin-therapists", tab],
    queryFn: () =>
      fetchTherapists(
        tab === "pending"
          ? "pending"
          : tab === "approved"
            ? "approved"
            : "all",
      ),
  });

  const pendingRows = useMemo(
    () => listQ.data?.filter((t) => t.status === "pending") ?? [],
    [listQ.data],
  );

  const approveM = useMutation({
    mutationFn: async (therapistId: string) => {
      const res = await fetch(
        `/api/admin/therapists/${therapistId}/approve`,
        { method: "PUT", credentials: "include" },
      );
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Approve failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-therapists"] });
    },
  });

  const rejectM = useMutation({
    mutationFn: async ({
      therapistId,
      reason,
    }: {
      therapistId: string;
      reason?: string;
    }) => {
      const res = await fetch(
        `/api/admin/therapists/${therapistId}/reject`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        },
      );
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Reject failed");
    },
    onSuccess: () => {
      setRejectId(null);
      setRejectReason("");
      void qc.invalidateQueries({ queryKey: ["admin-therapists"] });
    },
  });

  const suspendM = useMutation({
    mutationFn: async (therapistId: string) => {
      const res = await fetch(
        `/api/admin/therapists/${therapistId}/suspend`,
        { method: "PUT", credentials: "include" },
      );
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Suspend failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-therapists"] });
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Therapists</h1>
          <p className="text-muted-foreground text-sm">
            Review applications, invite clinicians, manage access.
          </p>
        </div>
        <Button
          className="h-12 min-h-[48px] shrink-0 bg-primary"
          onClick={() => setInviteOpen(true)}
        >
          <UserPlus className="mr-2 size-4" strokeWidth={1.5} />
          Invite therapist
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6 space-y-4">
          {listQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : pendingRows.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No pending applications</CardTitle>
                <CardDescription>
                  New enrollments will show up here.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            pendingRows.map((t) => (
              <Card key={t.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">
                        {t.profile.fullName}
                      </CardTitle>
                      <CardDescription>
                        {t.email ?? "—"} · {t.profile.phone ?? "—"}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-600/90"
                        disabled={approveM.isPending}
                        onClick={() => approveM.mutate(t.id)}
                      >
                        {approveM.isPending ? (
                          <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
                        ) : (
                          "Approve"
                        )}
                      </Button>
                      {rejectId === t.id ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Input
                            placeholder="Reason (optional)"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="h-9 w-48"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive text-destructive"
                            disabled={rejectM.isPending}
                            onClick={() =>
                              rejectM.mutate({
                                therapistId: t.id,
                                reason: rejectReason.trim() || undefined,
                              })
                            }
                          >
                            Confirm reject
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setRejectId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-destructive text-destructive"
                          onClick={() => {
                            setRejectId(t.id);
                            setRejectReason("");
                          }}
                        >
                          Reject
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>
                    <span className="text-muted-foreground">Applied: </span>
                    {new Date(t.createdAt).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Focus: </span>
                    {t.specializations.join(", ") || "—"}
                  </p>
                  <button
                    type="button"
                    className="mr-3 inline-flex items-center gap-1 text-primary underline"
                    onClick={() => {
                      setDetailTherapist(t);
                      setDetailOpen(true);
                    }}
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-primary underline"
                    onClick={() =>
                      setExpanded((x) => (x === t.id ? null : t.id))
                    }
                  >
                    Expand
                    {expanded === t.id ? (
                      <ChevronUp className="size-4" strokeWidth={1.5} />
                    ) : (
                      <ChevronDown className="size-4" strokeWidth={1.5} />
                    )}
                  </button>
                  {expanded === t.id && (
                    <div className="rounded-md bg-muted/50 p-3 text-sm">
                      <p className="mb-2">
                        <span className="font-medium">Bio: </span>
                        {t.bio ?? "—"}
                      </p>
                      <p>
                        <span className="font-medium">Qualifications: </span>
                        {t.qualifications.length
                          ? t.qualifications.join("; ")
                          : "—"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <TherapistTable
            rows={listQ.data ?? []}
            loading={listQ.isLoading}
            onSuspend={(id) => suspendM.mutate(id)}
            suspending={suspendM.isPending}
            onEditEarnings={(t) => setEarningsModal(t)}
            onView={(t) => {
              setDetailTherapist(t);
              setDetailOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <TherapistTable
            rows={(listQ.data ?? []).filter((r) => r.status === "approved")}
            loading={listQ.isLoading}
            onSuspend={(id) => suspendM.mutate(id)}
            suspending={suspendM.isPending}
            onEditEarnings={(t) => setEarningsModal(t)}
            onView={(t) => {
              setDetailTherapist(t);
              setDetailOpen(true);
            }}
          />
        </TabsContent>
      </Tabs>

      <TherapistDetailSheet
        therapist={detailTherapist}
        open={detailOpen}
        onOpenChange={(o) => {
          setDetailOpen(o);
          if (!o) setDetailTherapist(null);
        }}
        onTherapistUpdate={(partial) =>
          setDetailTherapist((prev) =>
            prev ? { ...prev, ...partial } : null,
          )
        }
      />

      <InviteTherapistModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={() => void qc.invalidateQueries({ queryKey: ["admin-therapists"] })}
      />

      {earningsModal ? (
        <EarningsSplitModal
          open
          onOpenChange={(o) => {
            if (!o) setEarningsModal(null);
          }}
          therapistId={earningsModal.id}
          therapistName={earningsModal.profile.fullName}
          sessionRate={earningsModal.sessionRate}
          currentTherapistPercent={earningsModal.therapistPercent}
        />
      ) : null}
    </div>
  );
}

function TherapistTable({
  rows,
  loading,
  onSuspend,
  suspending,
  onEditEarnings,
  onView,
}: {
  rows: TherapistRow[];
  loading: boolean;
  onSuspend: (id: string) => void;
  suspending: boolean;
  onEditEarnings: (t: TherapistRow) => void;
  onView: (t: TherapistRow) => void;
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No therapists to show.</p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="p-3 font-medium">Name</th>
            <th className="p-3 font-medium">Email</th>
            <th className="p-3 font-medium">Specializations</th>
            <th className="p-3 font-medium">Sessions</th>
            <th className="p-3 font-medium">Split</th>
            <th className="p-3 font-medium">Status</th>
            <th className="p-3 font-medium">Joined</th>
            <th className="p-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="p-3">
                {therapistPublicLabel(t.profile.fullName)}
              </td>
              <td className="p-3 text-muted-foreground">{t.email ?? "—"}</td>
              <td className="p-3 text-xs">
                {t.specializations.slice(0, 3).join(", ")}
              </td>
              <td className="p-3">{t._count.sessions}</td>
              <td className="p-3">
                <div className="flex flex-col gap-1">
                  <span className="inline-flex w-fit rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
                    {t.therapistPercent}/{t.platformPercent}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    ₦{t.totalTherapistEarnings.toLocaleString("en-NG")} ·{" "}
                    {t.paidCompletedSessions} paid
                  </span>
                </div>
              </td>
              <td className="p-3 capitalize">{t.status}</td>
              <td className="p-3 text-muted-foreground">
                {new Date(t.createdAt).toLocaleDateString("en-NG")}
              </td>
              <td className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onView(t)}
                  >
                    View
                  </Button>
                  {t.status === "approved" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEditEarnings(t)}
                    >
                      Edit split
                    </Button>
                  ) : null}
                  {t.status !== "suspended" && t.status !== "rejected" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={suspending}
                      onClick={() => onSuspend(t.id)}
                    >
                      Suspend
                    </Button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
