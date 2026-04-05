"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  CITY_LABELS,
  INTEREST_LABELS,
  ROLE_LABELS,
  TEAM_SIZE_LABELS,
} from "@/lib/leads/clinic-lead-labels";
import { cn } from "@/lib/utils";

type ClinicLeadRow = {
  id: string;
  fullName: string;
  role: string;
  clinicName: string;
  city: string;
  teamSize: string;
  interests: string[];
  whatsapp: string;
  contacted: boolean;
  createdAt: string;
};

function waLink(raw: string): string {
  const d = raw.replace(/\D/g, "");
  const n = d.startsWith("0")
    ? `234${d.slice(1)}`
    : d.startsWith("234")
      ? d
      : `234${d}`;
  return `https://wa.me/${n}`;
}

function formatRole(r: string) {
  return ROLE_LABELS[r as keyof typeof ROLE_LABELS] ?? r;
}
function formatCity(c: string) {
  return CITY_LABELS[c as keyof typeof CITY_LABELS] ?? c;
}
function formatTeam(t: string) {
  return TEAM_SIZE_LABELS[t as keyof typeof TEAM_SIZE_LABELS] ?? t;
}
function formatInterests(ids: string[]) {
  return ids
    .map((id) => INTEREST_LABELS[id as keyof typeof INTEREST_LABELS] ?? id)
    .join("; ");
}

async function fetchLeads(contacted: string): Promise<ClinicLeadRow[]> {
  const q =
    contacted === "all" ? "" : `?contacted=${contacted === "contacted" ? "true" : "false"}`;
  const res = await fetch(`/api/admin/leads${q}`, { credentials: "include" });
  const json = (await res.json()) as { success?: boolean; data?: ClinicLeadRow[] };
  if (!res.ok || !json.data) throw new Error("Failed to load leads");
  return json.data;
}

export default function AdminLeadsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "open" | "contacted">("all");

  const contactedParam =
    filter === "all" ? "all" : filter === "open" ? "false" : "true";

  const listQ = useQuery({
    queryKey: ["admin-leads", contactedParam],
    queryFn: () => fetchLeads(contactedParam),
  });

  const patchM = useMutation({
    mutationFn: async ({
      id,
      contacted,
    }: {
      id: string;
      contacted: boolean;
    }) => {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacted }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Update failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-leads"] });
    },
  });

  const csvBlob = useMemo(() => {
    const rows = listQ.data ?? [];
    const header = [
      "Name",
      "Clinic",
      "City",
      "Role",
      "Team",
      "WhatsApp",
      "Interests",
      "Contacted",
      "Created",
    ];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          csvEscape(r.fullName),
          csvEscape(r.clinicName),
          csvEscape(formatCity(r.city)),
          csvEscape(formatRole(r.role)),
          csvEscape(formatTeam(r.teamSize)),
          csvEscape(r.whatsapp),
          csvEscape(formatInterests(r.interests)),
          r.contacted ? "yes" : "no",
          r.createdAt,
        ].join(","),
      ),
    ];
    return new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  }, [listQ.data]);

  const downloadCsv = () => {
    const url = URL.createObjectURL(csvBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clinic-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="size-7 text-muted-foreground" strokeWidth={1.5} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Clinic leads</h1>
            <p className="text-muted-foreground text-sm">
              B2B partnership enquiries from the landing page.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 h-11"
          disabled={!listQ.data?.length}
          onClick={() => downloadCsv()}
        >
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["open", "Not contacted"],
            ["contacted", "Contacted"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            variant={filter === key ? "default" : "outline"}
            size="sm"
            className={cn(
              "min-h-10 rounded-full",
              filter === key && "bg-primary text-primary-foreground",
            )}
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {listQ.isLoading ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </p>
      ) : listQ.isError ? (
        <p className="text-sm text-red-600">Could not load leads.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">Clinic</th>
                <th className="px-3 py-3 font-medium">City</th>
                <th className="px-3 py-3 font-medium">Role</th>
                <th className="px-3 py-3 font-medium">Team</th>
                <th className="px-3 py-3 font-medium">WhatsApp</th>
                <th className="px-3 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Contacted</th>
              </tr>
            </thead>
            <tbody>
              {(listQ.data ?? []).map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-3 font-medium">{row.fullName}</td>
                  <td className="px-3 py-3">{row.clinicName}</td>
                  <td className="px-3 py-3">{formatCity(row.city)}</td>
                  <td className="px-3 py-3">{formatRole(row.role)}</td>
                  <td className="px-3 py-3">{formatTeam(row.teamSize)}</td>
                  <td className="px-3 py-3">
                    <a
                      href={waLink(row.whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {row.whatsapp}
                    </a>
                  </td>
                  <td className="text-muted-foreground px-3 py-3 whitespace-nowrap">
                    {new Date(row.createdAt).toLocaleString("en-NG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-3 py-3">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={row.contacted}
                        disabled={patchM.isPending}
                        onChange={(e) => {
                          patchM.mutate({ id: row.id, contacted: e.target.checked });
                        }}
                        className="size-4 rounded border-gray-300"
                      />
                      <span className="text-muted-foreground text-xs">
                        {row.contacted ? "Yes" : "No"}
                      </span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(listQ.data ?? []).length === 0 ? (
            <p className="text-muted-foreground px-4 py-8 text-center text-sm">
              No leads in this view.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function csvEscape(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
