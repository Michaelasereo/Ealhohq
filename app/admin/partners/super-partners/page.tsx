"use client";

import { Layers, Loader2, Pencil, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  PartnerWorkspaceError,
  PartnerWorkspaceLoading,
} from "@/components/admin/PartnerWorkspaceLoadStates";
import { PartnerWorkspaceShell } from "@/components/admin/PartnerWorkspaceShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SuperPartnerRow = {
  id: string;
  name: string;
  contactEmail: string | null;
  contactName: string | null;
  isActive: boolean;
  partnerCount: number;
  createdAt: string;
};

export default function SuperPartnersListPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editPartner, setEditPartner] = useState<SuperPartnerRow | null>(null);

  const listQ = useQuery({
    queryKey: ["admin-super-partners"],
    queryFn: async (): Promise<SuperPartnerRow[]> => {
      const r = await fetch("/api/admin/super-partners", { credentials: "include" });
      const j = (await r.json()) as { success?: boolean; data?: SuperPartnerRow[] };
      if (!r.ok || !j.success || !j.data) throw new Error("Failed to load super partners");
      return j.data;
    },
  });

  if (listQ.isLoading) {
    return <PartnerWorkspaceLoading />;
  }

  if (listQ.isError) {
    return (
      <PartnerWorkspaceError
        message={
          listQ.error instanceof Error ? listQ.error.message : "Failed to load super partners"
        }
      />
    );
  }

  return (
    <PartnerWorkspaceShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Layers size={22} aria-hidden />
            Super partners
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Telehealth platforms and umbrella organisations that connect Ealho to corporate
            partners. When you add a corporate partner, you can link it to one of these or mark
            it as independent.
          </p>
        </div>
        <Button className="h-12 shrink-0" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" aria-hidden />
          Add super partner
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Telehealth / umbrella partners</CardTitle>
          <CardDescription>
            Each row can be selected when creating a corporate partner under{" "}
            <span className="font-medium text-foreground">Partners</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  {["Name", "Contact", "Corporate partners", "Status", "Added", "Actions"].map(
                    (h) => (
                      <th key={h} className="px-3 py-2 font-medium">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {(listQ.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No super partners yet. Create one, then use it in the corporate partner
                      form.
                    </td>
                  </tr>
                ) : null}
                {(listQ.data ?? []).map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {[p.contactName, p.contactEmail].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{p.partnerCount}</td>
                    <td className="px-3 py-2">{p.isActive ? "Active" : "Inactive"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="min-h-10"
                        onClick={() => setEditPartner(p)}
                      >
                        <Pencil className="mr-1 size-3.5" aria-hidden />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <CreateSuperPartnerDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          void qc.invalidateQueries({ queryKey: ["admin-super-partners"] });
        }}
      />

      {editPartner ? (
        <EditSuperPartnerDialog
          partner={editPartner}
          onClose={() => setEditPartner(null)}
          onSaved={() => {
            void qc.invalidateQueries({ queryKey: ["admin-super-partners"] });
          }}
        />
      ) : null}
    </PartnerWorkspaceShell>
  );
}

function EditSuperPartnerDialog({
  partner,
  onClose,
  onSaved,
}: {
  partner: SuperPartnerRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(partner.name);
  const [contactName, setContactName] = useState(partner.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(partner.contactEmail ?? "");
  const [isActive, setIsActive] = useState(partner.isActive);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(partner.name);
    setContactName(partner.contactName ?? "");
    setContactEmail(partner.contactEmail ?? "");
    setIsActive(partner.isActive);
    setErr(null);
  }, [partner]);

  const submit = async () => {
    setErr(null);
    setLoading(true);
    const res = await fetch(`/api/admin/super-partners/${partner.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        contactName: contactName.trim() === "" ? null : contactName.trim(),
        contactEmail: contactEmail.trim() === "" ? null : contactEmail.trim(),
        isActive,
      }),
    });
    const j = (await res.json()) as { success?: boolean; error?: unknown };
    setLoading(false);
    if (!res.ok || !j.success) {
      setErr(typeof j.error === "string" ? j.error : "Could not save super partner");
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit super partner</DialogTitle>
          <DialogDescription>
            Update the telehealth partner record. Inactive partners no longer appear in the
            corporate partner affiliation dropdown, except for partners already linked to this
            row.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {err ? (
            <p className="text-sm text-destructive" role="alert">
              {err}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="esp-name">Name</Label>
            <Input
              id="esp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="esp-cn">Contact name (optional)</Label>
            <Input
              id="esp-cn"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="esp-ce">Contact email (optional)</Label>
            <Input
              id="esp-ce"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="h-12"
            />
          </div>
          <label className="flex min-h-12 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded border-input"
            />
            Active (shown in affiliation dropdown for new corporate partners)
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" className="h-12" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="h-12"
            disabled={loading || !name.trim()}
            onClick={() => void submit()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateSuperPartnerDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setName("");
    setContactName("");
    setContactEmail("");
  }, [open]);

  const submit = async () => {
    setErr(null);
    setLoading(true);
    const res = await fetch("/api/admin/super-partners", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        ...(contactName.trim() ? { contactName: contactName.trim() } : {}),
        ...(contactEmail.trim() ? { contactEmail: contactEmail.trim() } : {}),
      }),
    });
    const j = (await res.json()) as { success?: boolean; error?: unknown };
    setLoading(false);
    if (!res.ok || !j.success) {
      setErr(typeof j.error === "string" ? j.error : "Could not create super partner");
      return;
    }
    onCreated();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add super partner</DialogTitle>
          <DialogDescription>
            A telehealth or umbrella organisation. Corporate partners can be linked here or left
            independent.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {err ? (
            <p className="text-sm text-destructive" role="alert">
              {err}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="sp-name">Name</Label>
            <Input
              id="sp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12"
              placeholder="e.g. PartnerCare Telehealth"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sp-cn">Contact name (optional)</Label>
            <Input
              id="sp-cn"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sp-ce">Contact email (optional)</Label>
            <Input
              id="sp-ce"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="h-12"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" className="h-12" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="h-12"
            disabled={loading || !name.trim()}
            onClick={() => void submit()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Create"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
