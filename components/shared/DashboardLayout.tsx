"use client";

import { usePathname } from "next/navigation";
import {
  Building2,
  Calendar,
  Clock,
  Coins,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Inbox,
  Layers,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Mail,
  Settings,
  SlidersHorizontal,
  Star,
  Tag,
  Handshake,
  Pill,
  Stethoscope,
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

/** Affiliate / clinic referral programme (unchanged product surface). */
const ADMIN_GENERAL_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Leads", href: "/admin/leads", icon: Inbox },
  { label: "Therapists", href: "/admin/therapists", icon: UserCheck },
  { label: "Clients", href: "/admin/users", icon: Users },
  { label: "Sessions", href: "/admin/sessions", icon: Calendar },
  { label: "Blog", href: "/admin/blog", icon: FileText },
  { label: "Reviews", href: "/admin/reviews", icon: Star },
  { label: "Newsletter", href: "/admin/newsletter", icon: Mail },
  { label: "Marketing", href: "/admin/marketing", icon: Megaphone },
  { label: "Discounts", href: "/admin/discounts", icon: Tag },
  { label: "Pharmacy partners", href: "/admin/pharmacy-partners", icon: Pill },
  { label: "Psychiatry", href: "/admin/psychiatry", icon: Stethoscope },
  { label: "Referral partners", href: "/admin/referral-partners", icon: Handshake },
  { label: "Chat", href: "/admin/chat", icon: MessageSquare },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

/** Corporate wellness / super referral partners (new shell). */
const ADMIN_PARTNERS_NAV: NavItem[] = [
  { label: "Overview", href: "/admin/partners", icon: LayoutDashboard },
  { label: "Super partners", href: "/admin/partners/super-partners", icon: Layers },
  { label: "Partners", href: "/admin/partners/list", icon: Building2 },
  { label: "Clients", href: "/admin/partners/clients", icon: Users },
  { label: "Credit pools", href: "/admin/partners/pools", icon: Coins },
  { label: "Reports", href: "/admin/partners/reports", icon: FileSpreadsheet },
  { label: "Settings", href: "/admin/partners/settings", icon: SlidersHorizontal },
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

  const isCorporatePartnersShell =
    role === "admin" && pathname?.startsWith("/admin/partners");

  const items: NavItem[] =
    role === "therapist"
      ? THERAPIST_NAV_BASE
      : isCorporatePartnersShell
        ? ADMIN_PARTNERS_NAV
        : ADMIN_GENERAL_NAV;
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
        adminWorkspaceSwitcher={
          role === "admin"
            ? {
                generalHref: "/admin/dashboard",
                partnersHref: "/admin/partners",
                mode: isCorporatePartnersShell ? "partners" : "general",
              }
            : undefined
        }
      />
      <main className="min-h-screen md:ml-64">{children}</main>
    </div>
  );
}
