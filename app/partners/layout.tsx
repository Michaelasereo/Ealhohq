"use client";

import { LogOut } from "lucide-react";

import { EalhoBrandLogo } from "@/components/shared/EalhoBrandLogo";
import { createClient } from "@/lib/supabase/client";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <EalhoBrandLogo />
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
