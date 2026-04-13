"use client";

import Image from "next/image";
import Link from "next/link";
import { LogOut, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { EalhoBrandLogo } from "@/components/shared/EalhoBrandLogo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

interface DashboardSidebarProps {
  items: NavItem[];
  role: "therapist" | "admin";
  signOutHref: string;
  /** General vs corporate wellness area (admin only). */
  adminWorkspaceSwitcher?: {
    generalHref: string;
    partnersHref: string;
    mode: "general" | "partners";
  };
}

type MePayload = {
  success?: boolean;
  data?: {
    fullName: string;
    email: string | null;
    profilePhoto: string | null;
  };
};

export default function DashboardSidebar({
  items,
  role,
  signOutHref,
  adminWorkspaceSwitcher,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<{
    name: string;
    photo: string | null;
  } | null>(null);

  useEffect(() => {
    if (role !== "therapist") return;
    let cancelled = false;
    (async () => {
      const r = await fetch("/api/therapist/profile/me", {
        credentials: "include",
      });
      const j = (await r.json()) as MePayload;
      if (cancelled || !j.success || !j.data) return;
      setProfile({
        name: j.data.fullName,
        photo: j.data.profilePhoto,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = signOutHref;
  }

  return (
    <aside className="fixed left-0 top-0 z-30 hidden min-h-screen w-64 flex-col border-r border-border bg-background md:flex">
      <div className="flex min-h-32 w-full items-center justify-between gap-2 border-b border-border px-6 py-2">
        <EalhoBrandLogo />
        <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {role}
        </span>
      </div>

      {adminWorkspaceSwitcher ? (
        <div className="border-b border-border px-3 pb-3 pt-1">
          <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Admin area
          </p>
          <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
            <Link
              href={adminWorkspaceSwitcher.generalHref}
              className={cn(
                "min-h-10 flex-1 rounded-md px-2 py-2 text-center text-xs font-medium transition-colors",
                adminWorkspaceSwitcher.mode === "general"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              General
            </Link>
            <Link
              href={adminWorkspaceSwitcher.partnersHref}
              className={cn(
                "min-h-10 flex-1 rounded-md px-2 py-2 text-center text-xs font-medium transition-colors",
                adminWorkspaceSwitcher.mode === "partners"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Partners
            </Link>
          </div>
        </div>
      ) : null}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const isActive =
            item.href === "/admin/partners"
              ? pathname === "/admin/partners"
              : pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#292612]/8 font-semibold text-[#292612]"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700",
              )}
            >
              {isActive ? (
                <span
                  className="absolute -ml-3 left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[#292612]"
                  aria-hidden
                />
              ) : null}
              <Icon size={18} strokeWidth={1.5} className="shrink-0" aria-hidden />
              <span className="flex flex-1 items-center justify-between gap-2">
                {item.label}
                {item.badge && item.badge > 0 ? (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground tabular-nums">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
      </nav>

      {role === "therapist" ? (
        <div className="border-t border-border px-3 pb-2 pt-3">
          <div className="flex items-center gap-3 px-0">
            {profile?.photo ? (
              <Image
                src={profile.photo}
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 rounded-full object-cover"
                unoptimized={profile.photo.startsWith("http")}
              />
            ) : (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#292612]/10 text-sm font-medium text-[#292612]">
                {profile?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {profile?.name ?? "Loading…"}
              </p>
              <p className="text-xs text-gray-400">Therapist</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="border-t border-border px-3 py-4">
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full min-h-12 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
        >
          <LogOut size={18} strokeWidth={1.5} aria-hidden />
          Sign out
        </button>
      </div>
    </aside>
  );
}
