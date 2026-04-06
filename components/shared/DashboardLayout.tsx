"use client";

import { usePathname } from "next/navigation";
import {
  Calendar,
  Clock,
  DollarSign,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Tag,
  Handshake,
  UserCheck,
  Users,
} from "lucide-react";

import DashboardSidebar, { type NavItem } from "./DashboardSidebar";

const THERAPIST_NAV_BASE: NavItem[] = [
  { label: "Dashboard", href: "/therapist/dashboard", icon: LayoutDashboard },
  { label: "Sessions", href: "/therapist/sessions", icon: Calendar },
  { label: "Clients", href: "/therapist/clients", icon: Users },
  { label: "Availability", href: "/therapist/availability", icon: Clock },
  { label: "Earnings", href: "/therapist/earnings", icon: DollarSign },
  { label: "Settings", href: "/therapist/settings", icon: Settings },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Leads", href: "/admin/leads", icon: Inbox },
  { label: "Therapists", href: "/admin/therapists", icon: UserCheck },
  { label: "Clients", href: "/admin/users", icon: Users },
  { label: "Sessions", href: "/admin/sessions", icon: Calendar },
  { label: "Discounts", href: "/admin/discounts", icon: Tag },
  { label: "Partners", href: "/admin/partners", icon: Handshake },
  { label: "Chat", href: "/admin/chat", icon: MessageSquare },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: "therapist" | "admin";
}

export default function DashboardLayout({
  children,
  role,
}: DashboardLayoutProps) {
  const pathname = usePathname();

  const items: NavItem[] =
    role === "therapist" ? THERAPIST_NAV_BASE : ADMIN_NAV;
  const signOutHref =
    role === "therapist" ? "/therapist/login" : "/admin/login";

  if (role === "admin" && pathname?.startsWith("/admin/login")) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardSidebar
        items={items}
        role={role}
        signOutHref={signOutHref}
      />
      <main className="min-h-screen md:ml-64">{children}</main>
    </div>
  );
}
