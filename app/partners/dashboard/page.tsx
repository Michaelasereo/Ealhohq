"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/button";

type DashboardPayload = {
  partner: {
    name: string;
    contactName: string;
    referralCode: string;
    feePerSession: number;
  };
  stats: {
    sessionsThisMonth: number;
    earningsThisMonth: number;
    allTimeSessions: number;
    allTimeEarnings: number;
    pendingPayout: number;
  };
  referrals: { id: string; date: string; status: string; amount: number }[];
  payoutThreshold: number;
};

export default function PartnerDashboardPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["partner-dashboard"],
    queryFn: async (): Promise<DashboardPayload> => {
      const r = await fetch("/api/partners/dashboard", { credentials: "include" });
      const j = (await r.json()) as { success?: boolean; data?: DashboardPayload; error?: string };
      if (!r.ok || !j.success || !j.data) throw new Error(j.error ?? "Failed");
      return j.data;
    },
  });

  const payoutM = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/partners/payout-request", { method: "POST", credentials: "include" });
      const j = (await r.json()) as { success?: boolean; error?: string };
      if (!r.ok || !j.success) throw new Error(j.error ?? "Failed");
    },
    onSuccess: () => void q.refetch(),
  });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading dashboard...</p>;
  if (q.isError || !q.data) {
    return <p className="text-sm text-destructive">{q.error instanceof Error ? q.error.message : "Failed to load dashboard"}</p>;
  }

  const { partner, stats, referrals, payoutThreshold } = q.data;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const referralUrl = `${appUrl}/book?ref=${partner.referralCode}`;

  function copy(text: string, key: string) {
    void navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Partner Dashboard</h1>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-gray-500">Referral link</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="truncate text-sm">{referralUrl}</code>
            <Button size="sm" variant="outline" onClick={() => copy(referralUrl, "link")}>
              {copied === "link" ? <Check size={14} /> : <Copy size={14} />}
            </Button>
          </div>
          <p className="mt-3 text-xs text-gray-500">Referral code</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="text-sm">{partner.referralCode}</code>
            <Button size="sm" variant="outline" onClick={() => copy(partner.referralCode, "code")}>
              {copied === "code" ? <Check size={14} /> : <Copy size={14} />}
            </Button>
          </div>
        </div>
        <div id="partner-qr" className="rounded-2xl border bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-gray-900">Your QR Code</p>
          <div className="flex flex-col items-center gap-3">
            <QRCodeSVG
              value={referralUrl}
              size={160}
              bgColor="#FFFFFF"
              fgColor="#2C3B2D"
              level="M"
              includeMargin
            />
            <button
              type="button"
              onClick={() => {
                const svg = document.querySelector("#partner-qr svg");
                if (!svg) return;
                const svgData = new XMLSerializer().serializeToString(svg);
                const canvas = document.createElement("canvas");
                canvas.width = 200;
                canvas.height = 200;
                const ctx = canvas.getContext("2d");
                const img = new Image();
                img.onload = () => {
                  ctx?.drawImage(img, 0, 0);
                  const link = document.createElement("a");
                  link.download = `ealho-${partner.referralCode}-qr.png`;
                  link.href = canvas.toDataURL();
                  link.click();
                };
                img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
              }}
              className="text-xs font-medium text-[#2C3B2D] underline hover:no-underline"
            >
              Download QR Code
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Sessions referred this month" value={stats.sessionsThisMonth.toLocaleString()} />
        <Stat label="Earnings this month (pending)" value={`₦${stats.earningsThisMonth.toLocaleString()}`} />
        <Stat label="All-time sessions" value={stats.allTimeSessions.toLocaleString()} />
        <Stat label="All-time earnings" value={`₦${stats.allTimeEarnings.toLocaleString()}`} />
      </div>

      <div className="rounded-2xl border bg-white p-4 text-sm">
        <p className="font-semibold">How it works</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-gray-600">
          <li>Share your link or code with patients</li>
          <li>Patient books and completes a session</li>
          <li>You earn ₦{partner.feePerSession.toLocaleString()} and get paid monthly</li>
        </ol>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold">Pending payouts</p>
          <Button
            onClick={() => payoutM.mutate()}
            disabled={payoutM.isPending || stats.pendingPayout < payoutThreshold}
          >
            Request payout
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          Pending amount: ₦{stats.pendingPayout.toLocaleString()} (threshold: ₦{payoutThreshold.toLocaleString()})
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {referrals.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{new Date(r.date).toLocaleDateString("en-NG")}</td>
                <td className="px-3 py-2 capitalize">{r.status}</td>
                <td className="px-3 py-2">₦{r.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
