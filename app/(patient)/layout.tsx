"use client";

import Image from "next/image";
import {
  Calendar,
  ClipboardList,
  CreditCard,
  Home,
  LogOut,
  Plus,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { EalhoBrandLogo } from "@/components/shared/EalhoBrandLogo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const PATIENT_NAV = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Sessions", href: "/sessions", icon: Calendar },
  { label: "History", href: "/history", icon: ClipboardList },
  { label: "Profile", href: "/profile", icon: User },
  { label: "Credits", href: "/credits", icon: CreditCard },
];

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<{
    name: string;
    photo: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const r = await fetch("/api/patient/profile/me", {
        credentials: "include",
      });
      const d = (await r.json()) as {
        data?: { fullName?: string; profilePhoto?: string | null };
      };
      if (cancelled) return;
      setProfile({
        name: d.data?.fullName ?? user.email ?? "",
        photo: d.data?.profilePhoto ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSignOut() {
    const supabase = createClient();
    void supabase.auth.signOut().then(() => {
      window.location.href = "/login";
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed left-0 top-0 z-30 hidden min-h-screen w-64 flex-col border-r border-gray-100 bg-white md:flex">
        <div className="flex min-h-32 w-full items-center justify-between gap-2 border-b border-gray-100 px-6 py-2">
          <EalhoBrandLogo />
          <span className="shrink-0 text-xs font-medium text-gray-400">
            patient
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {PATIENT_NAV.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700",
                )}
              >
                {isActive ? (
                  <span
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary -ml-3"
                    aria-hidden
                  />
                ) : null}
                <Icon size={18} strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}

          <Link
            href="/book"
            className={cn(
              buttonVariants({ variant: "default" }),
              "mt-4 flex w-full min-h-12 items-center justify-start gap-3 px-3 py-2.5 text-sm font-medium",
            )}
          >
            <Plus size={18} strokeWidth={1.5} />
            Book Session
          </Link>
        </nav>

        <div className="space-y-1 border-t border-gray-100 px-3 py-4">
          <div className="mb-1 flex items-center gap-3 px-3 py-2">
            {profile?.photo ? (
              <Image
                src={profile.photo}
                alt=""
                width={32}
                height={32}
                className="size-8 rounded-full object-cover"
                unoptimized={profile.photo.startsWith("http")}
              />
            ) : (
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                {profile?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {profile?.name ?? "Loading…"}
              </p>
              <p className="text-xs text-gray-400">Patient</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
          >
            <LogOut size={18} strokeWidth={1.5} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-h-screen pb-20 md:ml-64 md:pb-0">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-100 bg-white pb-[max(env(safe-area-inset-bottom),8px)] pt-2 md:hidden">
        <div className="flex h-16 items-center justify-around px-2">
          {PATIENT_NAV.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg px-2 py-1",
                  isActive ? "text-primary" : "text-gray-400",
                )}
              >
                <Icon size={20} strokeWidth={1.5} />
                <span className="max-w-[64px] truncate text-xs font-medium">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
