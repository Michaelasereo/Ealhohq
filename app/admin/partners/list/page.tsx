"use client";

import {
  Building2,
  CheckCircle2,
  Download,
  Loader2,
  Pencil,
  Plus,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { PartnerLogoUploadField } from "@/components/admin/PartnerLogoUploadField";
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
import { cn } from "@/lib/utils";

/** Public sample file for HR to fill and return (matches import parser). */
const STAFF_CSV_SAMPLE_HREF = "/samples/partner-staff-sample.csv";

type PartnerRow = {
  id: string;
  name: string;
  logoUrl: string | null;
  contactEmail: string;
  contactName: string;
  referralSlug: string;
  monthlyPoolSize: number;
  status: string;
  clientCount: number;
  superPartnerId: string | null;
  superPartnerName: string | null;
};

export default function SuperReferralPartnersListPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editPartner, setEditPartner] = useState<PartnerRow | null>(null);
  const [importPartner, setImportPartner] = useState<PartnerRow | null>(null);

  const partnersQ = useQuery({
    queryKey: ["admin-super-referral-partners"],
    queryFn: async (): Promise<PartnerRow[]> => {
      const r = await fetch("/api/admin/super-referral-partners", {
        credentials: "include",
      });
      const j = (await r.json()) as { success?: boolean; data?: PartnerRow[] };
      if (!r.ok || !j.success || !j.data) throw new Error("Failed to load partners");
      return j.data;
    },
  });

  if (partnersQ.isLoading) {
    return <PartnerWorkspaceLoading />;
  }

  if (partnersQ.isError) {
    return (
      <PartnerWorkspaceError
        message={
          partnersQ.error instanceof Error
            ? partnersQ.error.message
            : "Failed to load partners"
        }
      />
    );
  }

  return (
    <PartnerWorkspaceShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Building2 size={22} aria-hidden />
            Corporate partners
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Organisations whose staff book through Ealho. Link each one to a telehealth super
            partner or mark it independent. Then upload a logo and import a staff CSV (name,
            email, gender, phone). Each row becomes a patient account (clinician or
            non-clinician for the whole batch).
          </p>
        </div>
        <Button className="h-12 shrink-0" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" aria-hidden />
          Add partner
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organisations</CardTitle>
          <CardDescription className="space-y-2">
            <span>
              Referral slug is used in links (e.g.{" "}
              <code className="text-xs">?partner=MOBIHEALTH</code>). Manage umbrella telehealth
              partners under <span className="font-medium text-foreground">Super partners</span>.
            </span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <a
                href={STAFF_CSV_SAMPLE_HREF}
                download="ealho-partner-staff-sample.csv"
                className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                <Download className="size-4 shrink-0" aria-hidden />
                Download sample staff CSV
              </a>
              <span className="text-muted-foreground">
                (share with partner HR — same format as import)
              </span>
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  {[
                    "Name",
                    "Affiliation",
                    "Slug",
                    "Status",
                    "Clients",
                    "Pool size",
                    "Actions",
                  ].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(partnersQ.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No partners yet. Use &quot;Add partner&quot; to create one.
                    </td>
                  </tr>
                ) : null}
                {(partnersQ.data ?? []).map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="max-w-[10rem] px-3 py-2 text-muted-foreground">
                      {p.superPartnerName ?? (
                        <span className="text-muted-foreground/80">Independent</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{p.referralSlug}</td>
                    <td className="px-3 py-2">{p.status}</td>
                    <td className="px-3 py-2">{p.clientCount}</td>
                    <td className="px-3 py-2">{p.monthlyPoolSize}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
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
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="min-h-10"
                          onClick={() => setImportPartner(p)}
                        >
                          Import CSV
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <CreatePartnerDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          void qc.invalidateQueries({ queryKey: ["admin-super-referral-partners"] });
        }}
      />

      {editPartner ? (
        <EditPartnerDialog
          partner={editPartner}
          onClose={() => setEditPartner(null)}
          onSaved={() => {
            void qc.invalidateQueries({ queryKey: ["admin-super-referral-partners"] });
          }}
        />
      ) : null}

      {importPartner ? (
        <ImportCsvDialog
          partner={importPartner}
          open
          onClose={() => setImportPartner(null)}
          onDone={() => {
            void qc.invalidateQueries({ queryKey: ["admin-super-referral-partners"] });
          }}
        />
      ) : null}
    </PartnerWorkspaceShell>
  );
}

type SuperPartnerOption = { id: string; name: string };

function CreatePartnerDialog({
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
  const [referralSlug, setReferralSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  /** Empty string = independent corporate partner */
  const [superPartnerId, setSuperPartnerId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const superPartnersQ = useQuery({
    queryKey: ["admin-super-partners"],
    queryFn: async (): Promise<SuperPartnerOption[]> => {
      const r = await fetch("/api/admin/super-partners", { credentials: "include" });
      const j = (await r.json()) as {
        success?: boolean;
        data?: { id: string; name: string; isActive: boolean }[];
      };
      if (!r.ok || !j.success || !j.data) throw new Error("Failed to load super partners");
      return j.data
        .filter((row) => row.isActive)
        .map((row) => ({ id: row.id, name: row.name }));
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setName("");
    setContactName("");
    setContactEmail("");
    setReferralSlug("");
    setLogoUrl(null);
    setSuperPartnerId("");
  }, [open]);

  const submit = async () => {
    setErr(null);
    setLoading(true);
    const res = await fetch("/api/admin/super-referral-partners", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        superPartnerId: superPartnerId.trim() ? superPartnerId.trim() : null,
        ...(referralSlug.trim() ? { referralSlug: referralSlug.trim() } : {}),
        ...(logoUrl?.trim() ? { logoUrl: logoUrl.trim() } : {}),
      }),
    });
    const j = (await res.json()) as { success?: boolean; error?: unknown };
    setLoading(false);
    if (!res.ok || !j.success) {
      setErr(typeof j.error === "string" ? j.error : "Could not create partner");
      return;
    }
    onCreated();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add corporate partner</DialogTitle>
          <DialogDescription>
            Link to a telehealth super partner if applicable, or independent. Slug is
            auto-generated from the name if you leave it blank. Upload a logo for booking links
            and staff invites (Supabase Storage).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {err ? (
            <p className="text-sm text-destructive" role="alert">
              {err}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="sr-affiliation">Affiliation</Label>
            <select
              id="sr-affiliation"
              value={superPartnerId}
              onChange={(e) => setSuperPartnerId(e.target.value)}
              disabled={loading || superPartnersQ.isLoading}
              className={cn(
                "flex h-12 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none transition-colors",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm",
                "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
              )}
            >
              <option value="">Independent (not under a super partner)</option>
              {(superPartnersQ.data ?? []).map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
            </select>
            {superPartnersQ.isError ? (
              <p className="text-xs text-destructive">Could not load super partners list.</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sr-name">Organisation name</Label>
            <Input
              id="sr-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sr-cn">Contact name</Label>
            <Input
              id="sr-cn"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sr-ce">Contact email</Label>
            <Input
              id="sr-ce"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sr-slug">Referral slug (optional)</Label>
            <Input
              id="sr-slug"
              placeholder="MOBIHEALTH"
              value={referralSlug}
              onChange={(e) => setReferralSlug(e.target.value)}
              className="h-12 font-mono text-sm"
            />
          </div>
          <PartnerLogoUploadField
            logoUrl={logoUrl}
            onLogoUrlChange={setLogoUrl}
            disabled={loading}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" className="h-12" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="h-12"
            disabled={
              loading ||
              !name.trim() ||
              !contactName.trim() ||
              !contactEmail.trim()
            }
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

const PARTNER_STATUS_OPTIONS = [
  { value: "pending_payment", label: "Pending payment" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
] as const;

function EditPartnerDialog({
  partner,
  onClose,
  onSaved,
}: {
  partner: PartnerRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(partner.name);
  const [contactName, setContactName] = useState(partner.contactName);
  const [contactEmail, setContactEmail] = useState(partner.contactEmail);
  const [referralSlug, setReferralSlug] = useState(partner.referralSlug);
  const [logoUrl, setLogoUrl] = useState<string | null>(partner.logoUrl);
  const [superPartnerId, setSuperPartnerId] = useState(partner.superPartnerId ?? "");
  const [status, setStatus] = useState(() =>
    PARTNER_STATUS_OPTIONS.some((o) => o.value === partner.status)
      ? partner.status
      : "pending_payment",
  );
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const superPartnersQ = useQuery({
    queryKey: ["admin-super-partners", "edit", partner.id],
    queryFn: async (): Promise<SuperPartnerOption[]> => {
      const r = await fetch("/api/admin/super-partners", { credentials: "include" });
      const j = (await r.json()) as {
        success?: boolean;
        data?: { id: string; name: string; isActive: boolean }[];
      };
      if (!r.ok || !j.success || !j.data) throw new Error("Failed to load super partners");
      return j.data
        .filter((row) => row.isActive || row.id === partner.superPartnerId)
        .map((row) => ({
          id: row.id,
          name: row.isActive ? row.name : `${row.name} (inactive)`,
        }));
    },
  });

  useEffect(() => {
    setName(partner.name);
    setContactName(partner.contactName);
    setContactEmail(partner.contactEmail);
    setReferralSlug(partner.referralSlug);
    setLogoUrl(partner.logoUrl);
    setSuperPartnerId(partner.superPartnerId ?? "");
    setStatus(
      PARTNER_STATUS_OPTIONS.some((o) => o.value === partner.status)
        ? partner.status
        : "pending_payment",
    );
    setErr(null);
  }, [partner]);

  const submit = async () => {
    setErr(null);
    setLoading(true);
    const res = await fetch(`/api/admin/super-referral-partners/${partner.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        referralSlug: referralSlug.trim(),
        logoUrl: logoUrl?.trim() || null,
        superPartnerId: superPartnerId.trim() ? superPartnerId.trim() : null,
        status: PARTNER_STATUS_OPTIONS.some((o) => o.value === status) ? status : undefined,
      }),
    });
    const j = (await res.json()) as { success?: boolean; error?: unknown };
    setLoading(false);
    if (!res.ok || !j.success) {
      const msg =
        typeof j.error === "string"
          ? j.error
          : res.status === 409
            ? "That referral slug is already in use"
            : "Could not save partner";
      setErr(msg);
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit corporate partner</DialogTitle>
          <DialogDescription>
            Update organisation details, affiliation, logo, or referral slug. Changing the slug
            updates booking links that use <code className="text-xs">?partner=…</code>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {err ? (
            <p className="text-sm text-destructive" role="alert">
              {err}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="ed-affiliation">Affiliation</Label>
            <select
              id="ed-affiliation"
              value={superPartnerId}
              onChange={(e) => setSuperPartnerId(e.target.value)}
              disabled={loading || superPartnersQ.isLoading}
              className={cn(
                "flex h-12 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none transition-colors",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm",
                "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
              )}
            >
              <option value="">Independent (not under a super partner)</option>
              {(superPartnersQ.data ?? []).map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ed-name">Organisation name</Label>
            <Input
              id="ed-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ed-cn">Contact name</Label>
            <Input
              id="ed-cn"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ed-ce">Contact email</Label>
            <Input
              id="ed-ce"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ed-slug">Referral slug</Label>
            <Input
              id="ed-slug"
              value={referralSlug}
              onChange={(e) => setReferralSlug(e.target.value)}
              className="h-12 font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ed-status">Status</Label>
            <select
              id="ed-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={loading}
              className={cn(
                "flex h-12 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none transition-colors",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm",
                "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
              )}
            >
              {PARTNER_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <PartnerLogoUploadField
            logoUrl={logoUrl}
            onLogoUrlChange={setLogoUrl}
            disabled={loading}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" className="h-12" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="h-12"
            disabled={
              loading ||
              !name.trim() ||
              !contactName.trim() ||
              !contactEmail.trim() ||
              !referralSlug.trim()
            }
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

function ImportCsvDialog({
  partner,
  open,
  onClose,
  onDone,
}: {
  partner: PartnerRow;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  /** Optional fallback if the admin pastes instead of choosing a file */
  const [pasteText, setPasteText] = useState("");
  const [clientType, setClientType] = useState<"clinician" | "non_clinician">("non_clinician");
  const [sendInvites, setSendInvites] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<null | {
    createdCount: number;
    errors: { row: number; email?: string; message: string }[];
  }>(null);

  const resetForm = useCallback(() => {
    setCsvFile(null);
    setPasteText("");
    setErr(null);
    setSuccessData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, resetForm]);

  const hasPayload = Boolean(csvFile) || pasteText.trim().length > 0;

  const submit = async () => {
    setErr(null);
    setSuccessData(null);
    setLoading(true);
    const url = `/api/admin/super-referral-partners/${partner.id}/import-csv`;

    let res: Response;
    if (csvFile) {
      const fd = new FormData();
      fd.append("file", csvFile);
      fd.append("clientType", clientType);
      fd.append("sendInvites", sendInvites ? "true" : "false");
      res = await fetch(url, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
    } else {
      res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvText: pasteText.trim(),
          clientType,
          sendInvites,
        }),
      });
    }
    const j = (await res.json()) as {
      success?: boolean;
      data?: {
        createdCount: number;
        errors: { row: number; email?: string; message: string }[];
      };
      error?: unknown;
    };
    setLoading(false);
    if (!res.ok || !j.success || !j.data) {
      setErr(typeof j.error === "string" ? j.error : "Import failed");
      return;
    }
    setSuccessData({
      createdCount: j.data.createdCount,
      errors: j.data.errors ?? [],
    });
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        {successData ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <CheckCircle2
                  className="size-7 shrink-0 text-green-600 dark:text-green-500"
                  aria-hidden
                />
                Import complete
              </DialogTitle>
              <DialogDescription>
                {successData.createdCount === 0
                  ? `No new accounts were created for ${partner.name}. Review row issues below if any.`
                  : `${successData.createdCount} staff ${successData.createdCount === 1 ? "account" : "accounts"} created for ${partner.name}.`}
              </DialogDescription>
            </DialogHeader>
            <div
              className="space-y-4 py-2"
              role="status"
              aria-live="polite"
            >
              {successData.errors.length > 0 ? (
                <div className="rounded-xl border border-amber-200/80 bg-amber-50 p-4 text-sm dark:border-amber-900/40 dark:bg-amber-950/35">
                  <p className="font-medium text-amber-950 dark:text-amber-100">
                    {successData.createdCount === 0 ? "Issues" : "Some rows had issues"} (
                    {successData.errors.length})
                  </p>
                  <ul className="mt-3 max-h-48 list-inside list-disc space-y-1 overflow-y-auto text-amber-900/90 dark:text-amber-100/90">
                    {successData.errors.slice(0, 20).map((e, i) => (
                      <li key={`${e.row}-${i}`}>
                        Row {e.row}
                        {e.email ? ` (${e.email})` : ""}: {e.message}
                      </li>
                    ))}
                  </ul>
                  {successData.errors.length > 20 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Showing first 20 issues.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="rounded-xl border border-green-200/80 bg-green-50 px-4 py-3 text-sm text-green-950 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-100">
                  All rows imported successfully. Invite emails were sent according to your
                  settings.
                </p>
              )}
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full sm:w-auto"
                onClick={() => {
                  resetForm();
                }}
              >
                Import another file
              </Button>
              <Button type="button" className="h-12 w-full min-w-[8rem] sm:w-auto" onClick={onClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Import staff — {partner.name}</DialogTitle>
              <DialogDescription className="space-y-2">
                <span>
                  Upload a <strong>.csv</strong> file (first row = headers). Required columns:{" "}
                  <strong>name</strong>, <strong>email</strong>. Optional: gender, phone. The whole
                  batch is tagged as clinician or non-clinician.
                </span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <a
                    href={STAFF_CSV_SAMPLE_HREF}
                    download="ealho-partner-staff-sample.csv"
                    className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    <Download className="size-4 shrink-0" aria-hidden />
                    Download sample CSV
                  </a>
                  <span className="text-muted-foreground">for partner HR to fill and return</span>
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
          {err ? (
            <p className="text-sm text-destructive" role="alert">
              {err}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label>CSV file</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="sr-only"
              id="partner-staff-csv-file"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setCsvFile(f);
                if (f) setPasteText("");
              }}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                className="h-12 shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 size-4" aria-hidden />
                Choose file
              </Button>
              <p className="min-h-12 flex-1 rounded-lg border border-dashed border-input bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
                {csvFile ? (
                  <span className="font-medium text-foreground">{csvFile.name}</span>
                ) : (
                  "No file selected"
                )}
              </p>
            </div>
          </div>

          <details className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
            <summary className="cursor-pointer font-medium text-foreground">
              Paste CSV text instead
            </summary>
            <p className="mt-2 text-muted-foreground">
              If you cannot upload a file, paste the raw CSV below. Choosing a file clears this.
            </p>
            <textarea
              id="csv-paste"
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value);
                if (e.target.value.trim()) {
                  setCsvFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }
              }}
              placeholder={`name,email,gender,phone\nJane Doe,jane@company.com,female,080…`}
              className={cn(
                "mt-2 flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            />
          </details>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Staff type (batch)</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="ct"
                checked={clientType === "clinician"}
                onChange={() => setClientType("clinician")}
              />
              Clinician
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="ct"
                checked={clientType === "non_clinician"}
                onChange={() => setClientType("non_clinician")}
              />
              Non-clinician
            </label>
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendInvites}
              onChange={(e) => setSendInvites(e.target.checked)}
            />
            Send invite emails now
          </label>
        </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="h-12" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                className="h-12"
                disabled={loading || !hasPayload}
                onClick={() => void submit()}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  "Run import"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
