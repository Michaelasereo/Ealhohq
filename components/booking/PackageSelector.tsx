"use client";

import { motion } from "framer-motion";

import {
  calculatePackagePrice,
  getPackageOption,
  PACKAGE_OPTIONS,
} from "@/lib/packages/config";
import { cn } from "@/lib/utils";

interface PackageSelectorProps {
  sessionRate: number;
  therapistName: string;
  selectedPackage: string;
  onSelect: (packageId: string) => void;
}

export function PackageSelector({
  sessionRate,
  therapistName,
  selectedPackage,
  onSelect,
}: PackageSelectorProps) {
  const selected = getPackageOption(selectedPackage);

  return (
    <section className="space-y-3 rounded-xl border p-4">
      <div>
        <h2 className="text-base font-semibold">How many sessions would you like?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          All sessions with {therapistName}. Unused sessions valid for 6 months.
        </p>
      </div>

      <div className="space-y-3">
        {PACKAGE_OPTIONS.map((option) => {
          const active = selected.id === option.id;
          const price = calculatePackagePrice(sessionRate, option);

          return (
            <motion.button
              key={option.id}
              type="button"
              whileTap={{ scale: 0.99 }}
              animate={{ scale: active ? 1.02 : 1 }}
              onClick={() => onSelect(option.id)}
              className={cn(
                "relative min-h-12 w-full rounded-xl border p-4 text-left transition-colors",
                active
                  ? "border-2 border-[#1A7A4A] bg-[#F0FAF4]"
                  : "border-border bg-card hover:bg-muted/30",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "mt-0.5 inline-flex size-5 items-center justify-center rounded-full border",
                      active
                        ? "border-[#1A7A4A] bg-[#1A7A4A]"
                        : "border-muted-foreground/40 bg-background",
                    )}
                    aria-hidden
                  >
                    <span
                      className={cn(
                        "size-2 rounded-full bg-white transition-opacity",
                        active ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </span>
                  <p className="font-semibold">{option.label}</p>
                </div>
                {option.tag ? (
                  <span className="rounded-full bg-[#1A7A4A] px-2 py-0.5 text-xs font-medium text-white">
                    {option.tag}
                  </span>
                ) : null}
              </div>

              {option.id === "single" ? (
                <p className="mt-2 text-sm font-semibold">
                  ₦{sessionRate.toLocaleString("en-NG")}
                </p>
              ) : (
                <div className="mt-2 space-y-1 text-sm">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-foreground">
                      ₦{price.finalPrice.toLocaleString("en-NG")}
                    </span>
                    <span className="text-muted-foreground line-through">
                      ₦{price.originalPrice.toLocaleString("en-NG")}
                    </span>
                    <span className="text-xs font-medium text-[#1A7A4A]">
                      {price.savingsText}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ₦{price.pricePerSession.toLocaleString("en-NG")} per session
                  </p>
                </div>
              )}

              <p className="mt-2 text-sm text-muted-foreground">{option.description}</p>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
