"use client";

import { Calendar, FileText, Lock, Video } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useId, useMemo, useRef } from "react";

import { cn } from "@/lib/utils";
import { useBookingStore } from "@/stores/bookingStore";

const brand = "#292612";
const lineColor = "#CCCCCC";
const cardBorder = "#E5E5E5";

const serviceCards = [
  { label: "Book a Session", icon: Calendar },
  { label: "Video Therapy", icon: Video },
  { label: "AI Session Notes", icon: FileText },
  { label: "Secure Messaging", icon: Lock },
] as const;

/** Dot positions inside a circle (normalized 0–100 coords) */
function useDotGrid(): { cx: number; cy: number }[] {
  return useMemo(() => {
    const dots: { cx: number; cy: number }[] = [];
    const center = 50;
    const spacing = 7;
    for (let x = 18; x <= 82; x += spacing) {
      for (let y = 18; y <= 82; y += spacing) {
        const dx = x - center;
        const dy = y - center;
        if (Math.sqrt(dx * dx + dy * dy) < 34) {
          dots.push({ cx: x, cy: y });
        }
      }
    }
    return dots;
  }, []);
}

function NodeYou({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        className="relative flex h-[112px] w-[112px] shrink-0 items-center justify-center sm:h-[120px] sm:w-[120px]"
        aria-hidden
      >
        <div className="absolute inset-0 rounded-full border border-[#292612]/12" />
        <div className="absolute inset-[10px] rounded-full border border-[#292612]/18" />
        <div className="absolute inset-[22px] rounded-full border border-[#292612]/22" />
        <div className="absolute inset-[34px] rounded-full bg-[#292612]/35" />
        <div className="absolute inset-[46px] rounded-full bg-[#292612]/90" />
      </div>
      <p className="mt-3 text-base font-semibold text-[#1A1A1A]">You</p>
      <p className="mt-0.5 text-center text-[13px] text-gray-500 sm:text-sm">
        Healthcare professional
      </p>
    </div>
  );
}

function NodeEalho({ dots }: { dots: { cx: number; cy: number }[] }) {
  const gid = useId();
  return (
    <div className={cn("flex flex-col items-center")}>
      <div
        className="relative flex h-[100px] w-[100px] shrink-0 items-center justify-center rounded-full border border-[#CCCCCC] bg-white sm:h-[108px] sm:w-[108px]"
        aria-hidden
      >
        <svg viewBox="0 0 100 100" className="h-[88px] w-[88px]" fill="none">
          {dots.map((d, i) => (
            <circle
              key={`${gid}-${i}`}
              cx={d.cx}
              cy={d.cy}
              r={1.2}
              fill={brand}
              fillOpacity={0.35}
            />
          ))}
        </svg>
      </div>
      <p className="mt-3 text-base font-semibold text-[#1A1A1A]">Ealho</p>
      <p className="mt-0.5 text-center text-[13px] text-gray-500 sm:text-sm">Your therapy platform</p>
    </div>
  );
}

function ServiceCardRow({
  item,
  index,
  inView,
  onBookSession,
}: {
  item: (typeof serviceCards)[number];
  index: number;
  inView: boolean;
  onBookSession?: () => void;
}) {
  const Icon = item.icon;
  const isBook = item.label === "Book a Session";
  const cardClass = cn(
    "flex min-h-[52px] w-full items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3 text-left transition-shadow",
    "border-[#E5E5E5] hover:shadow-md",
  );

  const inner = (
    <>
      <span className="text-[14px] font-normal leading-snug text-[#1A1A1A] sm:text-[15px]">
        {item.label}
      </span>
      <Icon
        className="size-[22px] shrink-0 text-[#292612] opacity-80 group-hover:opacity-100"
        strokeWidth={1.5}
        aria-hidden
      />
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.4, delay: 0.35 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="group w-full max-w-[280px]"
    >
      {isBook && onBookSession ? (
        <button type="button" onClick={onBookSession} className={cn(cardClass, "group")} style={{ borderColor: cardBorder }}>
          {inner}
        </button>
      ) : (
        <div className={cn(cardClass, "group")} style={{ borderColor: cardBorder }}>
          {inner}
        </div>
      )}
    </motion.div>
  );
}

/** Branching lines: trunk → bus → four taps (aligned to ~52px cards + 10px gap) */
const forkPaths = [
  "M 0 124 L 16 124",
  "M 16 124 L 16 26 L 40 26",
  "M 16 124 L 16 88 L 40 88",
  "M 16 124 L 40 124",
  "M 16 124 L 16 150 L 40 150",
  "M 16 124 L 16 212 L 40 212",
] as const;

function DesktopFork({ inView }: { inView: boolean }) {
  return (
    <svg
      viewBox="0 0 44 248"
      className="h-[248px] w-11 shrink-0 overflow-visible"
      aria-hidden
    >
      {forkPaths.map((d, i) => (
        <motion.path
          key={d}
          d={d}
          stroke={lineColor}
          strokeWidth={1}
          fill="none"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : {}}
          transition={{
            duration: 0.55,
            delay: 0.35 + i * 0.05,
            ease: [0.45, 0, 0.55, 1],
          }}
        />
      ))}
    </svg>
  );
}

function DesktopDiagram({
  inView,
  onOpenTherapistModal,
}: {
  inView: boolean;
  onOpenTherapistModal: () => void;
}) {
  return (
    <div className="relative mx-auto hidden w-full max-w-[1100px] md:flex md:flex-row md:items-center md:justify-center md:gap-0 md:pt-2 lg:justify-between">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="shrink-0"
      >
        <NodeYou />
      </motion.div>

      <motion.div
        className="mx-2 h-px w-10 origin-left bg-[#CCCCCC] lg:mx-3 lg:w-14 xl:w-20"
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.45, 0, 0.55, 1] }}
        style={{ transformOrigin: "left center" }}
        aria-hidden
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.45, delay: 0.12 }}
        className="shrink-0"
      >
        <NodeEalhoWrapper />
      </motion.div>

      <motion.div
        className="mx-1 h-px min-w-[24px] flex-1 origin-left bg-[#CCCCCC] lg:mx-2"
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 0.55, delay: 0.22, ease: [0.45, 0, 0.55, 1] }}
        style={{ transformOrigin: "left center" }}
        aria-hidden
      />

      <DesktopFork inView={inView} />

      <div className="ml-1 flex min-w-0 flex-col gap-2.5 lg:ml-2">
        {serviceCards.map((item, index) => (
          <ServiceCardRow
            key={item.label}
            item={item}
            index={index}
            inView={inView}
            onBookSession={
              item.label === "Book a Session" ? onOpenTherapistModal : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

function NodeEalhoWrapper() {
  const dots = useDotGrid();
  return <NodeEalho dots={dots} />;
}

function MobileDiagram({
  inView,
  onOpenTherapistModal,
}: {
  inView: boolean;
  onOpenTherapistModal: () => void;
}) {
  const dots = useDotGrid();

  return (
    <div className="relative mx-auto flex w-full max-w-[320px] flex-col items-center md:hidden">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4 }}
      >
        <NodeYou />
      </motion.div>

      <svg width="2" height="40" className="my-1 overflow-visible" aria-hidden>
        <motion.path
          d="M 1 0 L 1 40"
          stroke={lineColor}
          strokeWidth={1}
          fill="none"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
      </svg>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <NodeEalho dots={dots} />
      </motion.div>

      <svg width="2" height="36" className="my-1 overflow-visible" aria-hidden>
        <motion.path
          d="M 1 0 L 1 36"
          stroke={lineColor}
          strokeWidth={1}
          fill="none"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : {}}
          transition={{ duration: 0.45, delay: 0.35 }}
        />
      </svg>

      <div className="flex w-full flex-col items-center gap-2.5">
        {serviceCards.map((item, index) => (
          <ServiceCardRow
            key={item.label}
            item={item}
            index={index}
            inView={inView}
            onBookSession={
              item.label === "Book a Session" ? onOpenTherapistModal : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

export function TherapyServices() {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });
  const setBookingModalOpen = useBookingStore((s) => s.setBookingModalOpen);

  return (
    <section
      ref={ref}
      id="therapy-services"
      className="scroll-mt-24 bg-white px-4 py-14 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mx-auto max-w-[640px] px-4 text-center sm:px-10 md:px-14">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.35 }}
            className="inline-flex rounded-full border border-[#dddbd0] bg-[#faf8f5] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#807a5a]"
          >
            [ THERAPY SERVICES ]
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="mt-4 text-[2rem] font-medium leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:text-[52px] lg:leading-[1.05]"
          >
            <span className="text-[#807a5a]">Therapy Services</span>
            <br />
            <span className="text-[#24221e]">Built Around You</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-4 text-[15px] leading-relaxed tracking-[-0.02em] text-[#5c574e] sm:mt-5 sm:text-[16px]"
          >
            From your first session to ongoing care — Ealho handles everything so you can focus on
            healing, not logistics.
          </motion.p>
        </div>

        <div className="mt-12 sm:mt-14">
          <DesktopDiagram
            inView={inView}
            onOpenTherapistModal={() => setBookingModalOpen(true)}
          />
          <MobileDiagram
            inView={inView}
            onOpenTherapistModal={() => setBookingModalOpen(true)}
          />
        </div>
      </div>
    </section>
  );
}
