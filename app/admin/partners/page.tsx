"use client";

import { Handshake } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { InvitePartnerModal } from "@/components/admin/InvitePartnerModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PartnerRow = {
  id: string;
  name: string;
  referralCode: string;
  city: string;
  totalReferred: number;
  totalEarned: number;
  totalPaid: number;
  pending: number;
  tier: string;
  isActive: boolean;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
};

type PayoutRow = {
  id: string;
  partnerName: string;
  amount: number;
  sessionCount: number;
  status: string;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  createdAt: string;
};

export default function AdminPartnersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("partners");

  const partnersQ = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async (): Promise<PartnerRow[]> => {
      const r = await fetch("/api/admin/partners", { credentials: "include" });
      const j = (await r.json()) as { success?: boolean; data?: PartnerRow[]; error?: string };
      if (!r.ok || !j.success || !j.data) throw new Error(j.error ?? "Failed");
      return j.data;
    },
  });

  const payoutsQ = useQuery({
    queryKey: ["admin-partner-payouts"],
    queryFn: async (): Promise<PayoutRow[]> => {
      const r = await fetch("/api/admin/partners/payouts", { credentials: "include" });
      const j = (await r.json()) as { success?: boolean; data?: PayoutRow[]; error?: string };
      if (!r.ok || !j.success || !j.data) throw new Error(j.error ?? "Failed");
      return j.data;
    },
  });

  const generatePayouts = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/partners/payouts", { method: "POST", credentials: "include" });
      const j = (await r.json()) as { success?: boolean; error?: string };
      if (!r.ok || !j.success) throw new Error(j.error ?? "Failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-partner-payouts"] });
      void qc.invalidateQueries({ queryKey: ["admin-partners"] });
    },
  });

  const updatePayout = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "paid" }) => {
      const r = await fetch(`/api/admin/partners/payouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const j = (await r.json()) as { success?: boolean; error?: string };
      if (!r.ok || !j.success) throw new Error(j.error ?? "Failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-partner-payouts"] });
      void qc.invalidateQueries({ queryKey: ["admin-partners"] });
    },
  });
  const updatePartner = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const r = await fetch(`/api/admin/partners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      const j = (await r.json()) as { success?: boolean; error?: string };
      if (!r.ok || !j.success) throw new Error(j.error ?? "Failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-partners"] });
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Handshake size={20} /> Partners
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => generatePayouts.mutate()}>
            Generate monthly payouts
          </Button>
          <Button onClick={() => setOpen(true)}>Add Partner</Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>
        <TabsContent value="partners" className="mt-4">
          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  {["Name", "Code", "City", "Sessions", "Earned", "Paid", "Pending", "Tier", "Active", "Actions"].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(partnersQ.data ?? []).map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2">{p.referralCode}</td>
                    <td className="px-3 py-2">{p.city}</td>
                    <td className="px-3 py-2">{p.totalReferred}</td>
                    <td className="px-3 py-2">₦{p.totalEarned.toLocaleString()}</td>
                    <td className="px-3 py-2">₦{p.totalPaid.toLocaleString()}</td>
                    <td className="px-3 py-2">₦{p.pending.toLocaleString()}</td>
                    <td className="px-3 py-2">{p.tier}</td>
                    <td className="px-3 py-2">{p.isActive ? "Yes" : "No"}</td>
                    <td className="px-3 py-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updatePartner.mutate({ id: p.id, isActive: !p.isActive })}
                      >
                        {p.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="payouts" className="mt-4">
          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  {["Partner", "Sessions", "Amount", "Bank Details", "Requested At", "Actions"].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(payoutsQ.data ?? []).map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2">{p.partnerName}</td>
                    <td className="px-3 py-2">{p.sessionCount}</td>
                    <td className="px-3 py-2">₦{p.amount.toLocaleString()}</td>
                    <td className="px-3 py-2">{[p.bankName, p.accountName, p.accountNumber].filter(Boolean).join(" · ")}</td>
                    <td className="px-3 py-2">{new Date(p.createdAt).toLocaleDateString("en-NG")}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => updatePayout.mutate({ id: p.id, status: "approved" })}>
                          Approve
                        </Button>
                        <Button size="sm" onClick={() => updatePayout.mutate({ id: p.id, status: "paid" })}>
                          Mark paid
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <InvitePartnerModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => {
          void qc.invalidateQueries({ queryKey: ["admin-partners"] });
        }}
      />
    </div>
  );
}
