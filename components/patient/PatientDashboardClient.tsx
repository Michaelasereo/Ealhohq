"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Home, MessageSquare, Plus, User, Wallet } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingWithCopy } from "@/components/shared/LoadingWithCopy";
import { Skeleton } from "@/components/ui/skeleton";
import { DASHBOARD_MESSAGES } from "@/lib/loading-messages";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CREDIT_PACKAGES } from "@/lib/credits/packages";
import { tierFromBalance } from "@/lib/credits/purchase-config";
import {
  canJoinSessionTenMinutesBefore,
  minutesUntilJoinWindow,
} from "@/lib/patient/join-eligibility";
import { createClient } from "@/lib/supabase/client";
import type { PatientSessionView } from "@/lib/mappers/patient-session";
import {
  PsychiatricInvitationBanner,
  type PsychiatricInvite,
} from "@/components/patient/PsychiatricInvitationBanner";
import { PatientMessagingPrivacyCard } from "@/components/patient/PatientMessagingPrivacyCard";
import { QuickRebookModal } from "@/components/patient/QuickRebookModal";
import { PatientMessagesTab } from "@/components/patient/PatientMessagesTab";
import type { ThreadListItem } from "@/components/chat/ChatThreadList";
import { bookingDateStartToIso, formatWAT } from "@/lib/wat-datetime";
import { cn } from "@/lib/utils";

type MainTab = "home" | "sessions" | "messages" | "profile" | "credits";

type DashboardStatsZone = {
  firstName: string;
  totalSessions: number;
  credits: { balance: number; tier: string };
};

type DashboardBookingRow = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionType: string;
  therapist: { id: string; name: string; photo: string };
  session: {
    id: string;
    sessionNumber: number;
    feedbackSubmitted: boolean;
  } | null;
};

type DashboardNextZone = {
  upcomingSession: DashboardBookingRow | null;
  psychiatricInvitations: PsychiatricInvite[];
};

type DashboardRecentZone = {
  recentSessions: DashboardBookingRow[];
};

function mapBookingToPatientView(
  b: DashboardBookingRow,
  status: PatientSessionView["status"],
  durationMins = 50,
): PatientSessionView {
  const dateIso = bookingDateStartToIso(new Date(b.date), b.startTime);
  return {
    id: b.session?.id ?? b.id,
    bookingId: b.id,
    therapist: b.therapist,
    dateIso,
    durationMins,
    type: b.sessionType === "intake" ? "intake" : "follow-up",
    status,
    feedbackSubmitted: b.session?.feedbackSubmitted ?? false,
  };
}

type SessionsData = {
  upcoming: PatientSessionView[];
  past: PatientSessionView[];
};

type ActivePackage = {
  id: string;
  packageType: string;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  expiresAt: string | null;
  therapist: { id: string; name: string; photo: string };
};

type ProfileData = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  occupation: string;
  medicalHistory: {
    currentMedications: string;
    allergies: string;
    previousDiagnoses: string;
    previousTherapy: string;
    familyMedical: string;
    familyPsychiatric: string;
    familySubstanceUse: string;
  } | null;
};

type LastTherapistData = {
  therapist: {
    id: string;
    name: string;
    photo: string;
    sessionRate: number;
    sessionDuration: number;
  };
  sessionCount: number;
  nextSlot: {
    date: string;
    time: string;
    displayDate: string;
    displayTime: string;
  } | null;
};

type CreditsData = {
  balance: number;
  tier: string;
  transactions: {
    id: string;
    date: string;
    type: string;
    amount: number;
    reference: string | null;
  }[];
};

function greetingWat(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    hour12: false,
    timeZone: "Africa/Lagos",
  }).formatToParts(new Date());
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "12", 10);
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  return "Good evening";
}

function hoursUntilSession(dateIso: string): number {
  return (
    (new Date(dateIso).getTime() - Date.now()) / (1000 * 60 * 60)
  );
}

/** WAT booking date + HH:mm for join-window helpers (matches `bookingDateStartToIso` output). */
function sessionParts(s: PatientSessionView): { bookingDate: Date; startTime: string } {
  const m = s.dateIso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  const dateStr = m?.[1] ?? s.dateIso.slice(0, 10);
  const startTime = m?.[2] ?? "09:00";
  const bookingDate = new Date(`${dateStr}T12:00:00+01:00`);
  return { bookingDate, startTime };
}

export function PatientDashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<MainTab>("home");
  const [sessionTab, setSessionTab] = useState("upcoming");
  const [flash, setFlash] = useState<string | null>(null);
  const [quickRebook, setQuickRebook] = useState<{
    id: string;
    name: string;
    photo: string;
  } | null>(null);

  const homeStatsQ = useQuery({
    queryKey: ["patient-dashboard", "stats"],
    queryFn: async () => {
      const r = await fetch("/api/patient/dashboard?zone=stats", {
        credentials: "include",
      });
      const j = (await r.json()) as {
        success?: boolean;
        data?: DashboardStatsZone;
        error?: string;
      };
      if (r.status === 401) throw new Error("Please sign in again.");
      if (!r.ok) throw new Error(j.error ?? "Failed to load");
      return j.data!;
    },
    enabled: activeTab === "home",
  });

  const homeNextQ = useQuery({
    queryKey: ["patient-dashboard", "next"],
    queryFn: async () => {
      const r = await fetch("/api/patient/dashboard?zone=next", {
        credentials: "include",
      });
      const j = (await r.json()) as {
        success?: boolean;
        data?: DashboardNextZone;
        error?: string;
      };
      if (r.status === 401) throw new Error("Please sign in again.");
      if (!r.ok) throw new Error(j.error ?? "Failed to load");
      return j.data!;
    },
    enabled: activeTab === "home",
  });

  const homeRecentQ = useQuery({
    queryKey: ["patient-dashboard", "recent"],
    queryFn: async () => {
      const r = await fetch("/api/patient/dashboard?zone=recent", {
        credentials: "include",
      });
      const j = (await r.json()) as {
        success?: boolean;
        data?: DashboardRecentZone;
        error?: string;
      };
      if (r.status === 401) throw new Error("Please sign in again.");
      if (!r.ok) throw new Error(j.error ?? "Failed to load");
      return j.data!;
    },
    enabled: activeTab === "home",
  });

  const sessionsQ = useQuery({
    queryKey: ["patient-sessions"],
    queryFn: async () => {
      const r = await fetch("/api/patient/sessions", { credentials: "include" });
      const j = (await r.json()) as {
        success?: boolean;
        data?: SessionsData;
        error?: string;
      };
      if (r.status === 401) throw new Error("Please sign in again.");
      if (!r.ok) throw new Error(j.error ?? "Failed to load sessions");
      return j.data!;
    },
    enabled: activeTab === "sessions",
  });

  const packagesQ = useQuery({
    queryKey: ["patient-packages"],
    queryFn: async () => {
      const r = await fetch("/api/patient/packages", { credentials: "include" });
      const j = (await r.json()) as {
        success?: boolean;
        data?: { packages: ActivePackage[] };
        error?: string;
      };
      if (r.status === 401) throw new Error("Please sign in again.");
      if (!r.ok || !j.success) throw new Error(j.error ?? "Failed to load packages");
      return j.data?.packages ?? [];
    },
    enabled: activeTab === "sessions",
  });

  const profileQ = useQuery({
    queryKey: ["patient-profile"],
    queryFn: async () => {
      const r = await fetch("/api/patient/profile", { credentials: "include" });
      const j = (await r.json()) as {
        success?: boolean;
        data?: ProfileData;
        error?: string;
      };
      if (r.status === 401) throw new Error("Please sign in again.");
      if (!r.ok) throw new Error(j.error ?? "Failed to load profile");
      return j.data!;
    },
    enabled: activeTab === "profile",
  });

  const lastTherapistQ = useQuery({
    queryKey: ["patient-last-therapist"],
    queryFn: async () => {
      const r = await fetch("/api/patient/last-therapist", {
        credentials: "include",
      });
      const j = (await r.json()) as {
        success?: boolean;
        data?: LastTherapistData | null;
        error?: string;
      };
      if (r.status === 401) throw new Error("Please sign in again.");
      if (!r.ok) throw new Error(j.error ?? "Failed to load");
      return j.data ?? null;
    },
    enabled: activeTab === "home",
  });

  const partnerMeQ = useQuery({
    queryKey: ["patient-me"],
    queryFn: async () => {
      const r = await fetch("/api/patient/me", { credentials: "include" });
      const j = (await r.json()) as {
        success?: boolean;
        data?: {
          partnerProgram: {
            partnerName: string;
            badgeLabel: string;
            monthlyCreditsRemaining: number;
            onboardingStatus: string;
          } | null;
        } | null;
      };
      if (r.status === 401 || !j.success) return null;
      return j.data ?? null;
    },
    enabled: activeTab === "home",
    staleTime: 60_000,
  });

  const chatThreadsQ = useQuery({
    queryKey: ["chat-threads"],
    queryFn: async (): Promise<ThreadListItem[]> => {
      const r = await fetch("/api/chat/threads", { credentials: "include" });
      const j = (await r.json()) as {
        success?: boolean;
        data?: { threads: ThreadListItem[] };
      };
      if (!r.ok || !j.success || !j.data?.threads) return [];
      return j.data.threads;
    },
    staleTime: 30_000,
  });

  const creditsQ = useQuery({
    queryKey: ["credits-balance"],
    queryFn: async () => {
      const r = await fetch("/api/credits/balance", { credentials: "include" });
      const j = (await r.json()) as {
        success?: boolean;
        data?: CreditsData;
        error?: string;
      };
      if (r.status === 401) throw new Error("Please sign in again.");
      if (!r.ok) throw new Error(j.error ?? "Failed to load credits");
      return j.data!;
    },
    enabled: activeTab === "credits",
  });

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 8000);
    return () => window.clearTimeout(t);
  }, [flash]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (
      tab === "home" ||
      tab === "sessions" ||
      tab === "messages" ||
      tab === "profile" ||
      tab === "credits"
    ) {
      setActiveTab(tab as MainTab);
    }
  }, [searchParams]);

  useEffect(() => {
    const ref = searchParams.get("reference");
    const ok = searchParams.get("credit_ok");
    if (ok !== "1" || !ref?.trim()) return;

    let cancelled = false;
    (async () => {
      const r = await fetch("/api/credits/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: ref.trim() }),
      });
      if (!cancelled && r.ok) {
        await qc.invalidateQueries({ queryKey: ["credits-balance"] });
        await qc.invalidateQueries({ queryKey: ["patient-credits-summary"] });
        await qc.invalidateQueries({ queryKey: ["credit-transactions"] });
        await qc.invalidateQueries({ queryKey: ["patient-dashboard"] });
        router.replace("/dashboard");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, qc, router]);

  const cancelMut = useMutation({
    mutationFn: async (bookingId: string) => {
      const r = await fetch(`/api/patient/bookings/${bookingId}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Cancel failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["patient-sessions"] });
      void qc.invalidateQueries({ queryKey: ["patient-dashboard"] });
    },
  });

  const purchaseMut = useMutation({
    mutationFn: async (pkg: string) => {
      const r = await fetch("/api/credits/purchase", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: pkg }),
      });
      const j = (await r.json()) as {
        success?: boolean;
        data?: { authorization_url?: string };
        error?: string;
      };
      if (!r.ok || !j.success || !j.data?.authorization_url) {
        throw new Error(j.error ?? "Could not start payment");
      }
      window.location.href = j.data.authorization_url;
    },
  });

  const saveProfile = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const r = await fetch("/api/patient/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Save failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patient-profile"] }),
  });

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwErr, setPwErr] = useState<string | null>(null);

  async function changePassword() {
    setPwErr(null);
    if (pw1.length < 8) {
      setPwErr("Password must be at least 8 characters.");
      return;
    }
    if (pw1 !== pw2) {
      setPwErr("Passwords do not match.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    if (error) {
      setPwErr(error.message);
      return;
    }
    setPw1("");
    setPw2("");
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const homeFirstLoad =
    activeTab === "home" &&
    homeStatsQ.isPending &&
    homeStatsQ.fetchStatus === "fetching" &&
    !homeStatsQ.data;

  const loadingShell = homeFirstLoad ? (
    <div className="flex min-h-[40vh] flex-col items-center justify-center py-6">
      <LoadingWithCopy
        messages={[...DASHBOARD_MESSAGES]}
        size="lg"
        showProgressBar
        estimatedSeconds={4}
      />
    </div>
  ) : null;

  if (homeStatsQ.isError && activeTab === "home") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md p-4 pb-28">
        <p className="text-destructive">
          {homeStatsQ.error instanceof Error
            ? homeStatsQ.error.message
            : "Error"}
        </p>
      </main>
    );
  }

  const dashStats = homeStatsQ.data;

  const lastT = lastTherapistQ.data;
  const chatUnread =
    chatThreadsQ.data?.reduce((s, t) => s + t.unreadCount, 0) ?? 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-white px-4 pb-28 pt-4">
      {flash ? (
        <div
          className="mb-4 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground"
          role="status"
        >
          {flash}
        </div>
      ) : null}
      {activeTab === "home" && (
        <section className="space-y-4">
          {loadingShell}
          {dashStats && (
            <>
              <h1 className="text-2xl font-semibold">
                {greetingWat()}, {dashStats.firstName} 👋
              </h1>
              {partnerMeQ.data?.partnerProgram ? (
                <div
                  className={cn(
                    "flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-xs",
                    partnerMeQ.data.partnerProgram.onboardingStatus === "active"
                      ? "border-emerald-600/25 bg-emerald-50/90 text-emerald-950"
                      : "border-amber-600/25 bg-amber-50/90 text-amber-950",
                  )}
                >
                  <span className="rounded-full bg-white/80 px-2 py-0.5 font-semibold">
                    {partnerMeQ.data.partnerProgram.badgeLabel}
                  </span>
                  <span className="font-medium">
                    {partnerMeQ.data.partnerProgram.partnerName}
                  </span>
                  {partnerMeQ.data.partnerProgram.onboardingStatus ===
                  "active" ? (
                    <span className="text-emerald-900/80">
                      {partnerMeQ.data.partnerProgram.monthlyCreditsRemaining}{" "}
                      employer session
                      {partnerMeQ.data.partnerProgram.monthlyCreditsRemaining ===
                      1
                        ? ""
                        : "s"}{" "}
                      left this month
                    </span>
                  ) : (
                    <span className="text-amber-900/80">
                      Finish setup to use employer-covered sessions
                    </span>
                  )}
                </div>
              ) : null}
              {homeNextQ.data?.psychiatricInvitations?.length ? (
                <PsychiatricInvitationBanner
                  invites={homeNextQ.data.psychiatricInvitations}
                  onChanged={() => {
                    void qc.invalidateQueries({
                      queryKey: ["patient-dashboard", "next"],
                    });
                    void qc.invalidateQueries({
                      queryKey: ["patient-dashboard", "stats"],
                    });
                  }}
                />
              ) : null}
              {homeNextQ.isPending ? (
                <Skeleton className="h-36 w-full rounded-2xl" />
              ) : homeNextQ.isError ? (
                <p className="text-sm text-destructive">
                  {homeNextQ.error instanceof Error
                    ? homeNextQ.error.message
                    : "Could not load your next session."}
                </p>
              ) : homeNextQ.data?.upcomingSession ? (
                <NextSessionCard
                  s={mapBookingToPatientView(
                    homeNextQ.data.upcomingSession,
                    "upcoming",
                  )}
                />
              ) : (
                <div className="rounded-2xl border p-4">
                  <p className="mb-3">You have no upcoming sessions</p>
                  <Link
                    href="/dashboard/book"
                    className={cn(
                      buttonVariants({ variant: "default" }),
                      "flex h-12 w-full items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90",
                    )}
                  >
                    Book a Session
                  </Link>
                </div>
              )}
              {lastT ? (
                <div className="space-y-2">
                  <h2 className="font-medium">Continue with your therapist</h2>
                  <div className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-3">
                      <Image
                        src={lastT.therapist.photo}
                        alt=""
                        width={48}
                        height={48}
                        className="size-12 shrink-0 rounded-full object-cover"
                        unoptimized={lastT.therapist.photo.startsWith("http")}
                      />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-medium">{lastT.therapist.name}</p>
                        <p className="text-muted-foreground">
                          Your therapist · {lastT.sessionCount} session
                          {lastT.sessionCount === 1 ? "" : "s"}
                        </p>
                        {lastT.nextSlot ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Next available: {lastT.nextSlot.displayDate} ·{" "}
                            {lastT.nextSlot.displayTime}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            No open slots soon — see full calendar
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 min-h-12 w-full border-primary text-primary hover:bg-primary/10"
                      onClick={() =>
                        setQuickRebook({
                          id: lastT.therapist.id,
                          name: lastT.therapist.name,
                          photo: lastT.therapist.photo,
                        })
                      }
                    >
                      Book next session →
                    </Button>
                  </div>
                </div>
              ) : null}
              <div>
                <h2 className="mb-2 font-medium">Past sessions</h2>
                <div className="space-y-2">
                  {homeRecentQ.isPending ? (
                    <div className="flex min-h-[100px] items-center justify-center rounded-xl border border-dashed p-4">
                      <LoadingWithCopy
                        messages={["Fetching your sessions...", "Almost there..."]}
                        size="md"
                      />
                    </div>
                  ) : homeRecentQ.isError ? (
                    <p className="text-sm text-destructive">
                      {homeRecentQ.error instanceof Error
                        ? homeRecentQ.error.message
                        : "Could not load sessions."}
                    </p>
                  ) : (homeRecentQ.data?.recentSessions.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No past sessions yet.
                    </p>
                  ) : (
                    (homeRecentQ.data?.recentSessions ?? []).map((b) => {
                      const s = mapBookingToPatientView(b, "completed");
                      return (
                        <div key={s.id} className="rounded-xl border p-3 text-sm">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">{s.therapist.name}</p>
                              <p>
                                {formatWAT(s.dateIso)} · {s.type}
                              </p>
                            </div>
                            {s.status === "completed" ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="min-h-9 shrink-0 border-primary text-primary hover:bg-primary/10"
                                onClick={() =>
                                  setQuickRebook({
                                    id: s.therapist.id,
                                    name: s.therapist.name,
                                    photo: s.therapist.photo,
                                  })
                                }
                              >
                                Book again
                              </Button>
                            ) : null}
                          </div>
                          {!s.feedbackSubmitted && s.status === "completed" ? (
                            <Link
                              href={`/sessions/${s.id}/feedback`}
                              className="mt-2 inline-block text-primary underline"
                            >
                              Leave feedback
                            </Link>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <Link
                href="/dashboard/book"
                aria-label="Book session"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "fixed bottom-24 right-4 z-10 inline-flex size-14 items-center justify-center rounded-full bg-primary p-0 shadow-lg hover:bg-primary/90",
                )}
              >
                <Plus className="size-6" />
              </Link>
            </>
          )}
        </section>
      )}

      {activeTab === "sessions" && (
        <section>
          {sessionsQ.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : sessionsQ.isError ? (
            <p className="text-destructive">
              {sessionsQ.error instanceof Error
                ? sessionsQ.error.message
                : "Error"}
            </p>
          ) : (
            <Tabs value={sessionTab} onValueChange={setSessionTab}>
              {packagesQ.data && packagesQ.data.length > 0 ? (
                <div className="mb-4 space-y-2 rounded-xl border p-3">
                  <h2 className="text-base font-semibold">Your Session Packages</h2>
                  {packagesQ.data.map((pkg) => {
                    const progress = Math.min(
                      100,
                      Math.round((pkg.usedSessions / Math.max(1, pkg.totalSessions)) * 100),
                    );
                    return (
                      <div key={pkg.id} className="rounded-lg border p-3">
                        <p className="font-medium">{pkg.therapist.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {pkg.packageType.replace("_", "-").replace("package-", "")}
                          -session package
                        </p>
                        <div className="mt-2 h-2 w-full rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {pkg.usedSessions} of {pkg.totalSessions} sessions used
                        </p>
                        <p className="mt-2 text-sm">{pkg.remainingSessions} sessions remaining</p>
                        <p className="text-xs text-muted-foreground">
                          Valid until:{" "}
                          {pkg.expiresAt
                            ? new Date(pkg.expiresAt).toLocaleDateString("en-NG", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-2 min-h-11 w-full border-primary text-primary hover:bg-primary/10"
                          onClick={() =>
                            setQuickRebook({
                              id: pkg.therapist.id,
                              name: pkg.therapist.name,
                              photo: pkg.therapist.photo,
                            })
                          }
                        >
                          Book Next Session →
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              <TabsList className="w-full">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past</TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming" className="space-y-3 pt-3">
                {sessionsQ.data!.upcoming.length === 0 ? (
                  <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                    No upcoming sessions.
                  </div>
                ) : (
                  sessionsQ.data!.upcoming.map((s) => (
                    <SessionListCard
                      key={s.id}
                      s={s}
                      mode="upcoming"
                      onCancel={(bid) => cancelMut.mutate(bid)}
                      cancelPending={cancelMut.isPending}
                    />
                  ))
                )}
              </TabsContent>
              <TabsContent value="past" className="space-y-3 pt-3">
                {sessionsQ.data!.past.length === 0 ? (
                  <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                    No past sessions.
                  </div>
                ) : (
                  sessionsQ.data!.past.map((s) => (
                    <SessionListCard
                      key={s.id}
                      s={s}
                      mode="past"
                      onBookAgain={
                        s.status === "completed"
                          ? () =>
                              setQuickRebook({
                                id: s.therapist.id,
                                name: s.therapist.name,
                                photo: s.therapist.photo,
                              })
                          : undefined
                      }
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </section>
      )}

      {activeTab === "messages" && (
        <section className="pb-2">
          <h1 className="mb-3 text-xl font-semibold">Messages</h1>
          <PatientMessagesTab />
        </section>
      )}

      {activeTab === "profile" && (
        <ProfileSection
          q={profileQ}
          save={saveProfile.mutateAsync}
          saving={saveProfile.isPending}
          changePassword={changePassword}
          pw1={pw1}
          pw2={pw2}
          setPw1={setPw1}
          setPw2={setPw2}
          pwErr={pwErr}
          signOut={signOut}
        />
      )}

      {activeTab === "credits" && (
        <CreditsSection
          q={creditsQ}
          onBuy={(k) => purchaseMut.mutate(k)}
          buying={purchaseMut.isPending}
        />
      )}

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex min-h-14 w-full max-w-md items-center justify-around border-t border-border bg-white pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
        {(
          [
            ["home", Home, "Home"],
            ["sessions", CalendarDays, "Sessions"],
            ["messages", MessageSquare, "Messages"],
            ["profile", User, "Profile"],
            ["credits", Wallet, "Credits"],
          ] as const
        ).map(([id, Icon, label]) => (
          <button
            key={id}
            type="button"
            className={`relative flex min-h-14 min-w-[52px] flex-col items-center justify-center px-1.5 text-xs ${activeTab === id ? "text-primary" : "text-muted-foreground"}`}
            onClick={() => setActiveTab(id as MainTab)}
          >
            <Icon className="size-5" />
            {label}
            {id === "messages" && chatUnread > 0 ? (
              <span className="absolute right-0 top-0 flex min-w-4 px-0.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold leading-none text-primary-foreground">
                {chatUnread > 9 ? "9+" : chatUnread}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {quickRebook ? (
        <QuickRebookModal
          therapistId={quickRebook.id}
          therapistName={quickRebook.name}
          therapistPhoto={quickRebook.photo}
          isOpen
          onClose={() => setQuickRebook(null)}
          onBooked={() =>
            setFlash(
              "Session booked! Check your WhatsApp for your session link.",
            )
          }
        />
      ) : null}
    </main>
  );
}

function NextSessionCard({ s }: { s: PatientSessionView }) {
  const { bookingDate, startTime } = sessionParts(s);
  const joinActive = canJoinSessionTenMinutesBefore(bookingDate, startTime);
  const waitMin = minutesUntilJoinWindow(bookingDate, startTime);

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-center gap-3">
        <Image
          src={s.therapist.photo}
          alt=""
          width={48}
          height={48}
          className="size-12 rounded-full object-cover"
          unoptimized={s.therapist.photo.startsWith("http")}
        />
        <div>
          <p className="font-medium">{s.therapist.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatWAT(s.dateIso)} WAT
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm">{s.durationMins} minutes</p>
      {!joinActive && waitMin > 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Join opens in {waitMin} minute{waitMin === 1 ? "" : "s"} (10 minutes
          before start)
        </p>
      ) : null}
      {joinActive ? (
        <Link
          href={`/session/join?sessionId=${s.id}`}
          className={cn(
            buttonVariants({ variant: "default" }),
            "mt-3 flex h-12 w-full items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          Join Session
        </Link>
      ) : (
        <Button disabled className="mt-3 h-12 w-full">
          Join Session
        </Button>
      )}
    </div>
  );
}

function SessionListCard({
  s,
  mode,
  onCancel,
  cancelPending,
  onBookAgain,
}: {
  s: PatientSessionView;
  mode: "upcoming" | "past";
  onCancel?: (bookingId: string) => void;
  cancelPending?: boolean;
  onBookAgain?: () => void;
}) {
  const { bookingDate, startTime } = sessionParts(s);
  const joinActive = canJoinSessionTenMinutesBefore(bookingDate, startTime);
  const canCancel =
    mode === "upcoming" && hoursUntilSession(s.dateIso) > 24;

  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Image
            src={s.therapist.photo}
            alt=""
            width={48}
            height={48}
            className="size-12 rounded-full object-cover"
            unoptimized={s.therapist.photo.startsWith("http")}
          />
          <div className="text-sm">
            <p className="font-medium">{s.therapist.name}</p>
            <p>{formatWAT(s.dateIso)} WAT</p>
          </div>
        </div>
        {mode === "past" && s.status === "completed" && onBookAgain ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9 shrink-0 border-primary text-primary hover:bg-primary/10"
            onClick={onBookAgain}
          >
            Book again
          </Button>
        ) : null}
      </div>
      <p className="mt-2 text-sm">{s.durationMins} mins · {s.type}</p>
      <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
        {s.status}
      </span>
      {mode === "upcoming" ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {joinActive ? (
            <Link
              href={`/session/join?sessionId=${s.id}`}
              className={cn(
                buttonVariants({ variant: "default" }),
                "min-h-12 flex-1 bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              Join
            </Link>
          ) : (
            <Button
              disabled
              className="min-h-12 flex-1 bg-primary/40 text-primary-foreground"
            >
              Join
            </Button>
          )}
          <Button
            variant="outline"
            className="min-h-12 flex-1"
            disabled={!canCancel || cancelPending}
            onClick={() => onCancel?.(s.bookingId)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        !s.feedbackSubmitted &&
        s.status === "completed" && (
          <Link
            href={`/sessions/${s.id}/feedback`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "mt-2 inline-flex min-h-12 w-full items-center justify-center",
            )}
          >
            Leave feedback
          </Link>
        )
      )}
    </div>
  );
}

function ProfileSection({
  q,
  save,
  saving,
  changePassword,
  pw1,
  pw2,
  setPw1,
  setPw2,
  pwErr,
  signOut,
}: {
  q: ReturnType<typeof useQuery<ProfileData, Error>>;
  save: (p: Record<string, unknown>) => Promise<unknown>;
  saving: boolean;
  changePassword: () => void;
  pw1: string;
  pw2: string;
  setPw1: (v: string) => void;
  setPw2: (v: string) => void;
  pwErr: string | null;
  signOut: () => void;
}) {
  const [contact, setContact] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  const [bio, setBio] = useState({
    dateOfBirth: "",
    gender: "",
    occupation: "",
  });
  const [med, setMed] = useState({
    currentMedications: "",
    allergies: "",
    previousDiagnoses: "",
    previousTherapy: "",
  });
  const [fam, setFam] = useState({
    familyMedical: "",
    familyPsychiatric: "",
    familySubstanceUse: "",
  });

  useEffect(() => {
    if (!q.data) return;
    setContact({
      fullName: q.data.fullName,
      email: q.data.email,
      phone: q.data.phone,
    });
    setBio({
      dateOfBirth: q.data.dateOfBirth,
      gender: q.data.gender,
      occupation: q.data.occupation,
    });
    const mh = q.data.medicalHistory;
    setMed({
      currentMedications: mh?.currentMedications ?? "",
      allergies: mh?.allergies ?? "",
      previousDiagnoses: mh?.previousDiagnoses ?? "",
      previousTherapy: mh?.previousTherapy ?? "",
    });
    setFam({
      familyMedical: mh?.familyMedical ?? "",
      familyPsychiatric: mh?.familyPsychiatric ?? "",
      familySubstanceUse: mh?.familySubstanceUse ?? "",
    });
  }, [q.data]);

  if (q.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <p className="text-destructive">
        {q.error instanceof Error ? q.error.message : "Error"}
      </p>
    );
  }

  return (
    <section className="space-y-4 pb-8 text-sm">
      <div className="flex items-center gap-3 rounded-xl border p-4">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <User className="size-7 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Profile photo</p>
          <p className="text-xs text-muted-foreground">Coming soon</p>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border p-4">
        <Label>Full name</Label>
        <Input
          value={contact.fullName}
          onChange={(e) =>
            setContact((c) => ({ ...c, fullName: e.target.value }))
          }
          className="min-h-11"
        />
        <Label>Email</Label>
        <Input
          type="email"
          value={contact.email}
          onChange={(e) =>
            setContact((c) => ({ ...c, email: e.target.value }))
          }
          className="min-h-11"
        />
        <Label>Phone</Label>
        <Input
          value={contact.phone}
          onChange={(e) =>
            setContact((c) => ({ ...c, phone: e.target.value }))
          }
          className="min-h-11"
        />
        <Button
          type="button"
          className="mt-2 min-h-12 w-full bg-primary text-primary-foreground"
          disabled={saving}
          onClick={() =>
            void save({
              fullName: contact.fullName,
              email: contact.email,
              phone: contact.phone,
            })
          }
        >
          {saving ? "Saving…" : "Save contact"}
        </Button>
      </div>

      <div className="space-y-2 rounded-xl border p-4">
        <p className="font-medium">Biodata</p>
        <Label>Date of birth</Label>
        <Input
          type="date"
          value={bio.dateOfBirth}
          onChange={(e) =>
            setBio((b) => ({ ...b, dateOfBirth: e.target.value }))
          }
          className="min-h-11"
        />
        <Label>Gender</Label>
        <Input
          value={bio.gender}
          onChange={(e) => setBio((b) => ({ ...b, gender: e.target.value }))}
          className="min-h-11"
        />
        <Label>Occupation</Label>
        <Input
          value={bio.occupation}
          onChange={(e) =>
            setBio((b) => ({ ...b, occupation: e.target.value }))
          }
          className="min-h-11"
        />
        <Button
          type="button"
          variant="secondary"
          className="mt-2 min-h-12 w-full"
          disabled={saving}
          onClick={() =>
            void save({
              dateOfBirth: bio.dateOfBirth || undefined,
              gender: bio.gender,
              occupation: bio.occupation,
            })
          }
        >
          Save biodata
        </Button>
      </div>

      <Accordion multiple className="rounded-xl border">
        <AccordionItem value="med">
          <AccordionTrigger>Medical history</AccordionTrigger>
          <AccordionContent className="space-y-2 px-4 pb-4">
            <Label>Medications</Label>
            <Input
              value={med.currentMedications}
              onChange={(e) =>
                setMed((m) => ({ ...m, currentMedications: e.target.value }))
              }
            />
            <Label>Allergies</Label>
            <Input
              value={med.allergies}
              onChange={(e) =>
                setMed((m) => ({ ...m, allergies: e.target.value }))
              }
            />
            <Label>Previous diagnoses</Label>
            <Input
              value={med.previousDiagnoses}
              onChange={(e) =>
                setMed((m) => ({ ...m, previousDiagnoses: e.target.value }))
              }
            />
            <Label>Previous therapy</Label>
            <Input
              value={med.previousTherapy}
              onChange={(e) =>
                setMed((m) => ({ ...m, previousTherapy: e.target.value }))
              }
            />
            <Button
              type="button"
              className="mt-2 w-full min-h-12 bg-primary text-primary-foreground"
              disabled={saving}
              onClick={() =>
                void save({
                  medicalHistory: { ...med, ...fam },
                })
              }
            >
              Save medical
            </Button>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="fam">
          <AccordionTrigger>Family history</AccordionTrigger>
          <AccordionContent className="space-y-2 px-4 pb-4">
            <Label>Medical</Label>
            <Input
              value={fam.familyMedical}
              onChange={(e) =>
                setFam((f) => ({ ...f, familyMedical: e.target.value }))
              }
            />
            <Label>Psychiatric</Label>
            <Input
              value={fam.familyPsychiatric}
              onChange={(e) =>
                setFam((f) => ({ ...f, familyPsychiatric: e.target.value }))
              }
            />
            <Label>Substance use</Label>
            <Input
              value={fam.familySubstanceUse}
              onChange={(e) =>
                setFam((f) => ({ ...f, familySubstanceUse: e.target.value }))
              }
            />
            <Button
              type="button"
              className="mt-2 w-full min-h-12 bg-primary text-primary-foreground"
              disabled={saving}
              onClick={() =>
                void save({
                  medicalHistory: { ...med, ...fam },
                })
              }
            >
              Save family history
            </Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <PatientMessagingPrivacyCard />

      <div className="space-y-2 rounded-xl border p-4">
        <p className="font-medium">Security</p>
        <Label>New password</Label>
        <Input
          type="password"
          value={pw1}
          onChange={(e) => setPw1(e.target.value)}
          className="min-h-11"
        />
        <Label>Confirm password</Label>
        <Input
          type="password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          className="min-h-11"
        />
        {pwErr ? <p className="text-xs text-destructive">{pwErr}</p> : null}
        <Button
          type="button"
          variant="outline"
          className="min-h-12 w-full"
          onClick={() => void changePassword()}
        >
          Update password
        </Button>
      </div>

      <Button
        type="button"
        variant="destructive"
        className="min-h-12 w-full"
        onClick={() => void signOut()}
      >
        Sign out
      </Button>
    </section>
  );
}

function CreditsSection({
  q,
  onBuy,
  buying,
}: {
  q: ReturnType<typeof useQuery<CreditsData, Error>>;
  onBuy: (key: string) => void;
  buying: boolean;
}) {
  if (q.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <p className="text-destructive">
        {q.error instanceof Error ? q.error.message : "Error"}
      </p>
    );
  }

  const tier = tierFromBalance(q.data.balance);
  const pkgKey = (name: string) => name.toLowerCase() as "bronze" | "silver" | "gold" | "platinum";

  return (
    <section className="space-y-4 pb-8">
      <div className="rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">Balance</p>
        <p className="text-4xl font-bold tabular-nums">{q.data.balance}</p>
        <p className="mt-2 text-sm">credits</p>
        <span
          className={cn(
            "mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium capitalize",
            tier === "platinum" && "bg-violet-100 text-violet-900",
            tier === "gold" && "bg-amber-100 text-amber-900",
            tier === "silver" && "bg-slate-200 text-slate-800",
            tier === "bronze" && "bg-orange-100 text-orange-900",
          )}
        >
          {tier} tier
        </span>
      </div>

      <div>
        <p className="mb-2 font-medium">Buy credits</p>
        <div className="space-y-3">
          {CREDIT_PACKAGES.map((pkg) => (
            <div key={pkg.name} className="rounded-xl border p-3">
              <p className="font-medium">
                {pkg.name} · {pkg.sessions} sessions
              </p>
              <p className="text-sm">
                {pkg.price}{" "}
                <span className="text-primary">(save {pkg.save})</span>
              </p>
              <Button
                type="button"
                className="mt-2 h-12 w-full bg-primary text-primary-foreground"
                disabled={buying}
                onClick={() => onBuy(pkgKey(pkg.name))}
              >
                {buying ? "Opening…" : "Buy now"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 font-medium">Transactions</p>
        {q.data.transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {q.data.transactions.map((t) => (
              <li
                key={t.id}
                className="flex justify-between rounded-lg border px-3 py-2"
              >
                <span>
                  {new Date(t.date).toLocaleString("en-NG", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
                <span className="capitalize">{t.type}</span>
                <span
                  className={t.amount > 0 ? "text-emerald-700" : "text-red-700"}
                >
                  {t.amount > 0 ? "+" : ""}
                  {t.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
