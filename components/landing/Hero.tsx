"use client";

import { ArrowRight, Calendar, FileText, Lock, Shield } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { GlassPill } from "@/components/landing/GlassPill";
import { figma } from "@/lib/figma-assets";
import { figmaPrimaryCta } from "@/lib/ealho-link-styles";
import { cn } from "@/lib/utils";
import { useBookingStore } from "@/stores/bookingStore";

const HERO_BURNOUT_GUIDE_LABEL = "Get a free burnout guide";

export function Hero() {
  const setBookingModalOpen = useBookingStore((s) => s.setBookingModalOpen);
  const setBurnoutFreebieModalOpen = useBookingStore((s) => s.setBurnoutFreebieModalOpen);
  const [secondaryCtaText, setSecondaryCtaText] = useState(HERO_BURNOUT_GUIDE_LABEL);

  useEffect(() => {
    void fetch("/api/site-config?keys=hero_cta_secondary_text")
      .then((r) => r.json())
      .then(
        (d: {
          data?: {
            hero_cta_secondary_text?: string | null;
          };
        }) => {
          const t = d.data?.hero_cta_secondary_text?.trim();
          setSecondaryCtaText(t && t.length > 0 ? t : HERO_BURNOUT_GUIDE_LABEL);
        },
      )
      .catch(() => {});
  }, []);

  return (
    <section
      id="hero"
      className="relative scroll-mt-24 overflow-x-visible overflow-y-hidden rounded-b-[32px] bg-[#e8e6dd] px-4 pb-0 pt-8 sm:rounded-b-[40px] sm:px-6 sm:pt-10"
    >
      <div className="relative z-[1] mx-auto max-w-[1200px] pb-8 sm:pb-12">
        <div className="relative mx-auto mt-6 max-w-[min(100%,640px)] px-6 text-center sm:mt-10 sm:px-10 md:px-14">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[2rem] font-medium leading-[1.05] tracking-[-0.03em] text-[#24221e] sm:text-5xl lg:text-[65px] lg:leading-[65px]"
          >
            <span className="relative inline-block">
              <motion.span
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="absolute bottom-full left-1/2 z-10 inline-block w-max shrink-0 -translate-x-1/2 translate-y-[32%] sm:translate-y-[28%] lg:translate-y-[26%]"
              >
                <GlassPill>Clinicians🎉</GlassPill>
              </motion.span>
              <span className="relative z-0">T</span>
            </span>
            herapy{" "}
            built for
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.06 }}
            className="relative mt-1 text-[2rem] font-medium leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:mt-2 lg:text-[65px] lg:leading-[65px]"
          >
            <span className="text-[#24221e]">the </span>
            <span className="text-[#807a5a]">Clinician</span>
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mx-auto mt-6 max-w-[592px] text-[15px] leading-[22px] tracking-[-0.025em] text-[#5c574e] sm:text-[16px]"
          >
            Nigeria&apos;s first therapy platform built exclusively for doctors, nurses, and
            healthcare professionals. Confidential, insurance-covered, and scheduled around your
            clinical life.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-8 flex flex-col items-center gap-3 sm:mt-10"
          >
            <button
              type="button"
              onClick={() => setBookingModalOpen(true)}
              className={cn(figmaPrimaryCta, "min-w-[170px] gap-2")}
            >
              <Calendar size={18} strokeWidth={1.5} className="shrink-0" aria-hidden />
              <span>Book a Session</span>
            </button>
            <button
              type="button"
              onClick={() => setBurnoutFreebieModalOpen(true)}
              className="inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-[#2C3B2D] transition-colors hover:text-[#1f2a20] sm:text-[15px]"
            >
              <FileText size={18} strokeWidth={1.5} className="shrink-0 text-[#2C3B2D]" aria-hidden />
              <span>{secondaryCtaText}</span>
              <span
                className={cn(
                  buttonVariants({ variant: "outline", size: "icon-lg" }),
                  "size-12 min-h-12 min-w-12 shrink-0 rounded-full border-gray-300 bg-transparent text-[#2C3B2D] shadow-none hover:bg-black/[0.04]",
                )}
              >
                <ArrowRight className="size-5 shrink-0" strokeWidth={2} aria-hidden />
              </span>
            </button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mx-auto mt-10 max-w-[520px] rounded-[28px] bg-[#dddbd0] px-4 py-7 sm:mt-12 sm:rounded-[40px] sm:px-[18px] sm:py-8"
        >
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-[7px]">
            {[figma.heroPortrait1, figma.heroPortrait2, figma.heroPortrait3].map((src, i) => (
              <div
                key={src}
                className={cn(
                  "relative aspect-[150/156] w-[min(30%,152px)] overflow-hidden rounded-[26px] sm:w-[152px]",
                )}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="152px"
                  priority={i === 0}
                />
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="relative z-[2] mx-auto mt-0 flex max-w-[420px] justify-center rounded-tl-[50px] rounded-tr-[50px] bg-white px-6 py-3 shadow-sm sm:mt-2">
        <div className="flex flex-wrap items-center justify-center gap-4 text-[#24221e] sm:gap-6">
          <span className="flex items-center gap-1.5 text-[14px] font-medium leading-[1.2] tracking-[-0.025em] sm:text-[16px]">
            <Shield
              size={16}
              strokeWidth={1.5}
              className="shrink-0 text-primary"
              aria-hidden
            />
            NDPA Compliant
          </span>
          <span className="flex items-center gap-1.5 text-[14px] font-medium leading-[1.2] tracking-[-0.025em] sm:text-[16px]">
            <Lock
              size={16}
              strokeWidth={1.5}
              className="shrink-0 text-primary"
              aria-hidden
            />
            Security Encrypted
          </span>
        </div>
      </div>
    </section>
  );
}
