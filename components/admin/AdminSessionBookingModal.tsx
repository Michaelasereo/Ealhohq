"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Gift,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { formatNgn } from "@/lib/format-ngn";
import { PROFESSIONAL_TYPES } from "@/lib/booking/professional-types";
import { therapistPublicLabel } from "@/lib/therapist-display-name";

type TherapistRow = {
  id: string;
  sessionRate: number;
  sessionDuration: number;
  specializations: string[];
  profile: { fullName: string };
  email: string | null;
};

type PatientRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  credits: { balance: number } | null;
  _count: { bookings: number };
};

type PaymentType = "waived" | "credits" | "offline";

export function AdminSessionBookingModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: () => void;
}) {
  const [step, setStep] = useState(1);
  const [therapists, setTherapists] = useState<TherapistRow[]>([]);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [therapistId, setTherapistId] = useState<string | null>(null);
  const [patientMode, setPatientMode] = useState<"existing" | "guest">(
    "existing",
  );
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestProfessionalType, setGuestProfessionalType] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [dateStr, setDateStr] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [manualTime, setManualTime] = useState(false);
  const [sessionType, setSessionType] = useState<"intake" | "followup">(
    "followup",
  );
  const [paymentType, setPaymentType] = useState<PaymentType>("waived");
  const [paymentReference, setPaymentReference] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedTherapist = useMemo(
    () => therapists.find((t) => t.id === therapistId) ?? null,
    [therapists, therapistId],
  );

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === patientId) ?? null,
    [patients, patientId],
  );

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setErr(null);
    setSuccess(null);
    setTherapistId(null);
    setPatientId(null);
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setGuestProfessionalType("");
    setIsAnonymous(false);
    setDateStr("");
    setStartTime("");
    setSlots([]);
    setManualTime(false);
    setPaymentType("waived");
    setPaymentReference("");
    setSendEmail(true);

    void (async () => {
      const r = await fetch("/api/admin/therapists?status=approved", {
        credentials: "include",
      });
      const j = (await r.json()) as { success?: boolean; data?: TherapistRow[] };
      if (r.ok && j.data) setTherapists(j.data);
    })();

    void (async () => {
      const r = await fetch("/api/admin/patients", { credentials: "include" });
      const j = (await r.json()) as { success?: boolean; data?: PatientRow[] };
      if (r.ok && j.data) setPatients(j.data);
    })();
  }, [open]);

  useEffect(() => {
    if (!open || !therapistId || !dateStr) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    void (async () => {
      const r = await fetch(
        `/api/admin/therapists/${therapistId}/slots?date=${encodeURIComponent(dateStr)}`,
        { credentials: "include" },
      );
      const j = (await r.json()) as { success?: boolean; data?: string[] };
      setSlotsLoading(false);
      if (r.ok && Array.isArray(j.data)) setSlots(j.data);
      else setSlots([]);
    })();
  }, [open, therapistId, dateStr]);

  const filteredPatients = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (!q) return patients.slice(0, 50);
    return patients
      .filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [patients, patientQuery]);

  const creditBalance = selectedPatient?.credits?.balance ?? 0;

  const canNext1 = Boolean(therapistId);
  const canNext2 =
    patientMode === "guest"
      ? Boolean(guestName.trim() && guestEmail.trim())
      : Boolean(patientId);
  const canNext3 =
    Boolean(dateStr && startTime) &&
    /^\d{2}:\d{2}$/.test(startTime);

  const submit = async () => {
    setErr(null);
    setLoading(true);
    const body: Record<string, unknown> = {
      therapistId,
      date: dateStr,
      startTime,
      sessionType,
      paymentType,
      paymentReference: paymentReference.trim() || null,
      isAnonymous: patientMode === "guest" ? isAnonymous : false,
      sendConfirmation: sendEmail,
    };
    if (patientMode === "existing") {
      body.patientId = patientId;
    } else {
      body.guestName = guestName.trim();
      body.guestEmail = guestEmail.trim();
      body.guestPhone = guestPhone.trim() || "";
      const pt = guestProfessionalType.trim();
      if (pt) body.professionalType = pt;
    }
    if (paymentType === "credits" && creditBalance < 1) {
      setErr("Client has no credits.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/admin/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { success?: boolean; error?: string };
    setLoading(false);
    if (!res.ok || !json.success) {
      setErr(json.error ?? "Failed to create session");
      return;
    }
    setSuccess("Session created ✓");
    onCreated?.();
    window.setTimeout(() => {
      onOpenChange(false);
      setSuccess(null);
    }, 900);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,800px)] max-w-lg flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>Schedule session</DialogTitle>
          <DialogDescription>
            Step {step} of 5 — manual booking for therapists and clients
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
          {step === 1 && (
            <div className="space-y-3">
              <Label>Select therapist</Label>
              <div className="space-y-2">
                {therapists.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTherapistId(t.id)}
                    className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                      therapistId === t.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <p className="font-medium">
                      {therapistPublicLabel(t.profile.fullName)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t.specializations.slice(0, 4).join(" · ") || "—"}
                    </p>
                    <p className="mt-1 text-xs">
                      {formatNgn(t.sessionRate)} · {t.sessionDuration} min
                    </p>
                  </button>
                ))}
                {therapists.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No approved therapists.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={patientMode === "existing" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setPatientMode("existing")}
                >
                  Existing client
                </Button>
                <Button
                  type="button"
                  variant={patientMode === "guest" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setPatientMode("guest")}
                >
                  New guest
                </Button>
              </div>
              {patientMode === "existing" ? (
                <>
                  <div className="space-y-2">
                    <Label>Search</Label>
                    <Input
                      value={patientQuery}
                      onChange={(e) => setPatientQuery(e.target.value)}
                      placeholder="Name or email"
                      className="h-12"
                    />
                  </div>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {filteredPatients.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPatientId(p.id)}
                        className={`w-full rounded-lg border p-3 text-left text-sm ${
                          patientId === p.id
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <p className="font-medium">{p.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.email} · {p._count.bookings} bookings
                        </p>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone (optional)</Label>
                    <Input
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      What best describes them?{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <select
                      value={guestProfessionalType}
                      onChange={(e) => setGuestProfessionalType(e.target.value)}
                      className="border-input bg-background h-12 w-full cursor-pointer rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Select role…</option>
                      {PROFESSIONAL_TYPES.map((group) => (
                        <optgroup key={group.group} label={group.group}>
                          {group.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <p className="text-muted-foreground text-xs">
                      Helps match context for the therapist.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                    />
                    Anonymous (alias for therapist)
                  </label>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adm-date">Date</Label>
                <Input
                  id="adm-date"
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Available slots (WAT)</Label>
                {slotsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading slots…</p>
                ) : slots.length === 0 && dateStr ? (
                  <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                    No availability on this date. The therapist may not have set
                    their schedule. You can still enter a time manually below.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((s) => (
                      <Button
                        key={s}
                        type="button"
                        size="sm"
                        variant={startTime === s ? "default" : "outline"}
                        onClick={() => {
                          setStartTime(s);
                          setManualTime(false);
                        }}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={manualTime}
                  onChange={(e) => {
                    setManualTime(e.target.checked);
                    if (e.target.checked) setStartTime("");
                  }}
                />
                Enter time manually (HH:MM, 24h)
              </label>
              {manualTime && (
                <Input
                  placeholder="09:30"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-12"
                />
              )}
              <div className="space-y-2">
                <Label>Session type</Label>
                <div className="flex gap-3 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={sessionType === "intake"}
                      onChange={() => setSessionType("intake")}
                    />
                    Intake
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={sessionType === "followup"}
                      onChange={() => setSessionType("followup")}
                    />
                    Follow-up
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setPaymentType("waived")}
                className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left ${
                  paymentType === "waived" ? "border-primary bg-primary/5" : ""
                }`}
              >
                <Gift className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="font-medium">Waive payment</p>
                  <p className="text-sm text-muted-foreground">
                    Session is complimentary. No charge to client.
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentType("credits")}
                disabled={patientMode === "guest" || creditBalance < 1}
                className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left disabled:opacity-50 ${
                  paymentType === "credits" ? "border-primary bg-primary/5" : ""
                }`}
              >
                <CreditCard
                  className="mt-0.5 size-5 shrink-0"
                  strokeWidth={1.5}
                />
                <div>
                  <p className="font-medium">Client credits</p>
                  <p className="text-sm text-muted-foreground">
                    Balance:{" "}
                    {patientMode === "guest"
                      ? "—"
                      : `${creditBalance} credit(s)`}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentType("offline")}
                className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left ${
                  paymentType === "offline" ? "border-primary bg-primary/5" : ""
                }`}
              >
                <Banknote className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="font-medium">Offline payment</p>
                  <p className="text-sm text-muted-foreground">
                    Reference optional (transfer ref, receipt no.)
                  </p>
                </div>
              </button>
              {paymentType === "offline" && (
                <Input
                  placeholder="Payment reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="h-12"
                />
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">Therapist: </span>
                {selectedTherapist
                  ? therapistPublicLabel(selectedTherapist.profile.fullName)
                  : null}
              </p>
              <p>
                <span className="text-muted-foreground">Client: </span>
                {patientMode === "existing"
                  ? `${selectedPatient?.fullName} (${selectedPatient?.email})`
                  : `${guestName} (${guestEmail})`}
              </p>
              <p>
                <span className="text-muted-foreground">When: </span>
                {dateStr} {startTime} WAT
              </p>
              <p>
                <span className="text-muted-foreground">Payment: </span>
                {paymentType}
              </p>
              <label className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                />
                Send confirmation (email and WhatsApp if a phone number is available)
              </label>
            </div>
          )}

          {err && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {err}
            </p>
          )}
          {success && (
            <p className="mt-3 text-sm text-primary">{success}</p>
          )}
        </div>

        <DialogFooter className="flex flex-row items-center justify-between gap-2 border-t px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            disabled={step <= 1 || loading}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            <ChevronLeft className="size-4" strokeWidth={1.5} />
            Back
          </Button>
          {step < 5 ? (
            <Button
              type="button"
              disabled={
                loading ||
                (step === 1 && !canNext1) ||
                (step === 2 && !canNext2) ||
                (step === 3 && !canNext3)
              }
              onClick={() => setStep((s) => s + 1)}
            >
              Next
              <ChevronRight className="size-4" strokeWidth={1.5} />
            </Button>
          ) : (
            <Button type="button" disabled={loading} onClick={submit}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={1.5} />
                  Creating…
                </>
              ) : (
                "Create session"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
