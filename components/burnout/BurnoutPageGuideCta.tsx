"use client";

import { ArrowRight, FileText } from "lucide-react";
import { useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBookingStore } from "@/stores/bookingStore";

export function BurnoutPageGuideCta() {
  const setBurnoutFreebieModalOpen = useBookingStore((s) => s.setBurnoutFreebieModalOpen);
  const [label, setLabel] = useState("Get a free burnout guide");

  useEffect(() => {
    void fetch("/api/site-config?keys=burnout_landing_button_text,hero_cta_secondary_text")
      .then((r) => r.json())
      .then(
        (d: {
          data?: {
            burnout_landing_button_text?: string | null;
            hero_cta_secondary_text?: string | null;
          };
        }) => {
          const fromLanding = d.data?.burnout_landing_button_text?.trim();
          const fromHero = d.data?.hero_cta_secondary_text?.trim();
          if (fromLanding) setLabel(fromLanding);
          else if (fromHero) setLabel(fromHero);
          else setLabel("Get a free burnout guide");
        },
      )
      .catch(() => {});
  }, []);

  return (
    <button
      type="button"
      onClick={() => setBurnoutFreebieModalOpen(true)}
      className="mx-auto mt-8 inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-[#2C3B2D] transition-colors hover:text-[#1f2a20] sm:text-[15px]"
    >
      <FileText size={18} strokeWidth={1.5} className="shrink-0 text-[#2C3B2D]" aria-hidden />
      <span>{label}</span>
      <span
        className={cn(
          buttonVariants({ variant: "outline", size: "icon-lg" }),
          "size-12 min-h-12 min-w-12 shrink-0 rounded-full border-gray-300 bg-transparent text-[#2C3B2D] shadow-none hover:bg-black/[0.04]",
        )}
      >
        <ArrowRight className="size-5 shrink-0" strokeWidth={2} aria-hidden />
      </span>
    </button>
  );
}
