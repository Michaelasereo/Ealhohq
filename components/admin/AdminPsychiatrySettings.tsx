"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PsychiatristRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  mdcnRegistrationNumber: string;
  specialisation: string;
  sessionRate: number;
  pharmacyPartnerId: string | null;
  pharmacyPartnerName: string | null;
  isActive: boolean;
};

type PharmacyOption = { id: string; name: string };

export function AdminPsychiatrySettings() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    mdcnRegistrationNumber: "",
    specialisation: "",
    sessionRate: "",
    pharmacyPartnerId: "" as string | "",
  });

  const pharmaciesQ = useQuery({
    queryKey: ["admin-psychiatrists-meta-pharmacies"],
    queryFn: async (): Promise<PharmacyOption[]> => {
      const r = await fetch("/api/admin/pharmacy-partners", { credentials: "include" });
      const j = (await r.json()) as {
        success?: boolean;
        data?: { id: string; name: string; isActive: boolean }[];
      };
      if (!r.ok || !j.success || !j.data) throw new Error("Failed");
      return j.data.filter((p) => p.isActive).map((p) => ({ id: p.id, name: p.name }));
    },
  });

  const listQ = useQuery({
    queryKey: ["admin-psychiatrists"],
    queryFn: async (): Promise<PsychiatristRow[]> => {
      const r = await fetch("/api/admin/psychiatrists", { credentials: "include" });
      const j = (await r.json()) as { success?: boolean; data?: PsychiatristRow[] };
      if (!r.ok || !j.success || !j.data) throw new Error("Failed");
      return j.data;
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const rate = Number(form.sessionRate);
      if (!Number.isFinite(rate) || rate <= 0) throw new Error("Invalid rate");
      const body = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        mdcnRegistrationNumber: form.mdcnRegistrationNumber.trim(),
        specialisation: form.specialisation.trim(),
        sessionRate: rate,
        pharmacyPartnerId: form.pharmacyPartnerId
          ? form.pharmacyPartnerId
          : null,
      };
      const r = await fetch("/api/admin/psychiatrists", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { success?: boolean };
      if (!r.ok || !j.success) throw new Error("Could not create");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-psychiatrists"] });
      setForm({
        name: "",
        email: "",
        phone: "",
        mdcnRegistrationNumber: "",
        specialisation: "",
        sessionRate: "",
        pharmacyPartnerId: "",
      });
    },
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const r = await fetch(`/api/admin/psychiatrists/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const j = (await r.json()) as { success?: boolean };
      if (!r.ok || !j.success) throw new Error("Could not update");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-psychiatrists"] });
    },
  });

  const canSubmit =
    form.name.trim() &&
    form.email.trim() &&
    form.phone.trim() &&
    form.mdcnRegistrationNumber.trim() &&
    form.specialisation.trim() &&
    form.sessionRate.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Psychiatrists</CardTitle>
        <CardDescription>
          One-time assessment providers for the referral pathway. Adding someone here saves
          their profile and rate for booking flows; it does not create a Supabase login or a
          dedicated psychiatrist app role yet. Availability editing will follow the same weekly
          pattern as therapists in a later iteration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">Add psychiatrist</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ps-name">Name</Label>
              <Input
                id="ps-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ps-email">Email</Label>
              <Input
                id="ps-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ps-phone">Phone</Label>
              <Input
                id="ps-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ps-mdcn">MDCN registration</Label>
              <Input
                id="ps-mdcn"
                value={form.mdcnRegistrationNumber}
                onChange={(e) =>
                  setForm({ ...form, mdcnRegistrationNumber: e.target.value })
                }
                className="h-12"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ps-spec">Specialisation</Label>
              <Input
                id="ps-spec"
                value={form.specialisation}
                onChange={(e) => setForm({ ...form, specialisation: e.target.value })}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ps-rate">Session rate (NGN)</Label>
              <Input
                id="ps-rate"
                type="number"
                min={1}
                step={1}
                value={form.sessionRate}
                onChange={(e) => setForm({ ...form, sessionRate: e.target.value })}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ps-ph">Default pharmacy</Label>
              <select
                id="ps-ph"
                value={form.pharmacyPartnerId}
                onChange={(e) =>
                  setForm({ ...form, pharmacyPartnerId: e.target.value })
                }
                className="flex h-12 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">None</option>
                {(pharmaciesQ.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button
            type="button"
            className="h-12"
            disabled={!canSubmit || createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            {createMut.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={1.5} />
                Saving…
              </>
            ) : (
              "Add psychiatrist"
            )}
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                {["Name", "Email", "MDCN", "Rate (₦)", "Pharmacy", "Active", ""].map(
                  (h) => (
                    <th key={h} className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {listQ.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    <Loader2 className="mx-auto size-6 animate-spin" />
                  </td>
                </tr>
              ) : null}
              {(listQ.data ?? []).map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2">{p.email}</td>
                  <td className="px-3 py-2">{p.mdcnRegistrationNumber}</td>
                  <td className="px-3 py-2">{p.sessionRate.toLocaleString()}</td>
                  <td className="px-3 py-2">
                    {p.pharmacyPartnerName ?? "—"}
                  </td>
                  <td className="px-3 py-2">{p.isActive ? "Yes" : "No"}</td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        toggleMut.mutate({ id: p.id, isActive: !p.isActive })
                      }
                    >
                      {p.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
