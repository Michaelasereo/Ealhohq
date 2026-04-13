"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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

type PharmacyRow = {
  id: string;
  name: string;
  location: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  isActive: boolean;
};

export function AdminPharmacySettings() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    location: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [err, setErr] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ["admin-pharmacy-partners"],
    queryFn: async (): Promise<PharmacyRow[]> => {
      const r = await fetch("/api/admin/pharmacy-partners", { credentials: "include" });
      const j = (await r.json()) as { success?: boolean; data?: PharmacyRow[] };
      if (!r.ok || !j.success || !j.data) throw new Error("Failed to load");
      return j.data;
    },
  });

  useEffect(() => {
    if (listQ.isError) setErr("Could not load pharmacy partners.");
    else setErr(null);
  }, [listQ.isError]);

  const createMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/pharmacy-partners", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = (await r.json()) as { success?: boolean; error?: unknown };
      if (!r.ok || !j.success) throw new Error("Could not create");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-pharmacy-partners"] });
      void qc.invalidateQueries({ queryKey: ["admin-psychiatrists-meta-pharmacies"] });
      setForm({
        name: "",
        location: "",
        contactPerson: "",
        contactEmail: "",
        contactPhone: "",
      });
    },
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const r = await fetch(`/api/admin/pharmacy-partners/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const j = (await r.json()) as { success?: boolean };
      if (!r.ok || !j.success) throw new Error("Could not update");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-pharmacy-partners"] });
    },
  });

  const canSubmit =
    form.name.trim() &&
    form.location.trim() &&
    form.contactPerson.trim() &&
    form.contactEmail.trim() &&
    form.contactPhone.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pharmacy partners</CardTitle>
        <CardDescription>
          Pickup locations for psychiatric prescriptions. Contact emails receive operational
          messages (for example pickup codes). This list does not create Ealho staff logins for
          pharmacies—those are separate if you invite them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {err ? (
          <p className="text-sm text-destructive" role="alert">
            {err}
          </p>
        ) : null}

        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">Add pharmacy</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rx-name">Name</Label>
              <Input
                id="rx-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-12"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="rx-loc">Location / address</Label>
              <Input
                id="rx-loc"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rx-cp">Contact person</Label>
              <Input
                id="rx-cp"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rx-ce">Contact email</Label>
              <Input
                id="rx-ce"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="h-12"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="rx-phone">Contact phone</Label>
              <Input
                id="rx-phone"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="h-12"
              />
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
              "Add pharmacy"
            )}
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                {["Name", "Location", "Contact", "Email", "Phone", "Active", ""].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
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
                  <td className="px-3 py-2">{p.location}</td>
                  <td className="px-3 py-2">{p.contactPerson}</td>
                  <td className="px-3 py-2">{p.contactEmail}</td>
                  <td className="px-3 py-2">{p.contactPhone}</td>
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
