"use client";

import { Check, ChevronRight, Mic, MicOff } from "lucide-react";
import { motion, useInView } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

import { figma } from "@/lib/figma-assets";
import { cn } from "@/lib/utils";

/** Brand accent for mock UI — matches `--primary` / globals */
const accent = "#292612";

function ThreePanelMockup() {
  const patients = [
    { name: "Adaeze O.", type: "Intake", active: true },
    { name: "Emeka T.", type: "Follow-up", active: false },
    { name: "Ngozi A.", type: "Follow-up", active: false },
    { name: "Bola M.", type: "Intake", active: false },
    { name: "Tunde K.", type: "Follow-up", active: false },
  ] as const;

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ background: "#F0EDE6", minHeight: "420px" }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, #C8C4BC 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: `${accent}26` }}
      >
        <MicOff size={16} strokeWidth={1.5} style={{ color: accent }} />
      </div>

      <div className="relative z-10 flex min-h-[420px] items-center justify-center gap-2 overflow-x-auto p-4 sm:gap-3 sm:p-6 md:min-w-0">
        {/* PANEL 1 — Sessions list */}
        <div className="w-44 shrink-0 rounded-2xl border border-gray-100/80 bg-white p-4 shadow-sm sm:w-48">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-gray-400">
            Sessions
          </p>
          <p className="mb-3 text-sm font-semibold text-gray-800">Today (5)</p>
          <div className="space-y-1.5">
            {patients.map((patient, i) => (
              <div
                key={i}
                className={cn(
                  "flex cursor-default items-center justify-between rounded-lg px-2.5 py-2 transition-colors",
                  patient.active
                    ? "border border-[#292612]/15 bg-[#292612]/8"
                    : "hover:bg-gray-50",
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      patient.active ? "bg-[#292612]" : "bg-gray-200",
                    )}
                  />
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "truncate text-xs font-medium",
                        patient.active ? "text-[#292612]" : "text-gray-700",
                      )}
                    >
                      {patient.name}
                    </p>
                    <p className="text-[10px] text-gray-400">{patient.type}</p>
                  </div>
                </div>
                {patient.active ? (
                  <ChevronRight
                    size={12}
                    strokeWidth={1.5}
                    className="shrink-0 text-[#292612]"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex shrink-0 flex-col items-center gap-1">
          <div className="h-px w-6 bg-gray-300 sm:w-8" />
          <ChevronRight size={12} strokeWidth={1.5} className="text-gray-400" />
        </div>

        {/* PANEL 2 — Active session */}
        <div className="flex w-44 shrink-0 flex-col items-center rounded-2xl border border-gray-100/80 bg-white p-5 shadow-sm sm:w-48">
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full"
            style={{ backgroundColor: `${accent}1a` }}
          >
            <Mic size={28} strokeWidth={1.5} style={{ color: accent }} aria-hidden />
          </div>
          <div className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#1A1A1A]">
            <div className="flex h-5 items-end gap-0.5">
              {[3, 5, 8, 5, 3, 6, 4, 7, 5, 3].map((h, i) => (
                <div
                  key={i}
                  className="w-0.5 animate-pulse rounded-full bg-white"
                  style={{
                    height: `${h * 2}px`,
                    animationDelay: `${i * 80}ms`,
                    animationDuration: "1.2s",
                  }}
                />
              ))}
            </div>
          </div>
          <div className="rounded-full bg-gray-100 px-3 py-1.5">
            <p className="text-[10px] font-medium text-gray-500">Session in progress · 24:18</p>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex shrink-0 flex-col items-center gap-1">
          <div className="h-px w-6 bg-gray-300 sm:w-8" />
          <ChevronRight size={12} strokeWidth={1.5} className="text-gray-400" />
        </div>

        {/* PANEL 3 — Notes */}
        <div className="w-44 shrink-0 rounded-2xl border border-gray-100/80 bg-white p-4 shadow-sm sm:w-48">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Session Notes</p>
            <div className="flex items-center gap-1">
              <div className="size-1.5 animate-pulse rounded-full bg-green-500" />
              <span className="text-[10px] text-gray-400">Live</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="rounded-lg bg-gray-50 p-2.5">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div
                    className="flex h-4 w-4 items-center justify-center rounded-full"
                    style={{ backgroundColor: accent }}
                  >
                    <span className="text-[8px] font-bold text-white">S</span>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-600">Subjective</span>
                </div>
                <Check size={10} strokeWidth={2.5} className="text-green-500" />
              </div>
              <div className="space-y-1">
                <div className="h-1.5 w-full rounded bg-gray-200" />
                <div className="h-1.5 w-3/4 rounded bg-gray-200" />
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-2.5">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div
                    className="flex h-4 w-4 items-center justify-center rounded-full"
                    style={{ backgroundColor: accent }}
                  >
                    <span className="text-[8px] font-bold text-white">O</span>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-600">Objective</span>
                </div>
                <Check size={10} strokeWidth={2.5} className="text-green-500" />
              </div>
              <div className="space-y-1">
                <div className="h-1.5 w-full rounded bg-gray-200" />
                <div className="h-1.5 w-1/2 rounded bg-gray-200" />
              </div>
            </div>

            <div
              className="rounded-lg border p-2.5"
              style={{
                borderColor: `${accent}33`,
                backgroundColor: `${accent}0a`,
              }}
            >
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div
                    className="flex h-4 w-4 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${accent}4d` }}
                  >
                    <span className="text-[8px] font-bold" style={{ color: accent }}>
                      A
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-600">Assessment</span>
                </div>
                <div className="flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="size-1.5 animate-bounce rounded-full"
                      style={{
                        animationDelay: `${i * 120}ms`,
                        backgroundColor: accent,
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <div className="h-1.5 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-1.5 w-2/3 animate-pulse rounded bg-gray-200" />
                <div className="h-1.5 w-1/2 animate-pulse rounded bg-gray-200" />
              </div>
            </div>

            <div className="rounded-lg border border-gray-100 p-2.5 opacity-45">
              <div className="flex items-center gap-1.5">
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-200">
                  <span className="text-[8px] font-bold text-gray-400">P</span>
                </div>
                <span className="text-[10px] font-semibold text-gray-400">Plan</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotesAI() {
  const mockRef = useRef(null);
  const inView = useInView(mockRef, { once: true, margin: "-60px" });

  return (
    <section id="notes-ai" className="scroll-mt-24 bg-white px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-[1200px]">
        <div className="mx-auto max-w-[905px] text-center">
          <h2 className="text-[2rem] font-semibold leading-[1.2] tracking-[-0.025em] text-[#1A1A1A] sm:text-[49px] sm:leading-[60px]">
            Ealho Notes AI
          </h2>
          <p className="mt-2 text-[2rem] font-semibold leading-[1.2] tracking-[-0.025em] text-[#807a5a] sm:text-[49px] sm:leading-[60px]">
            AI-Powered Session Notes
          </p>
          <p className="mx-auto mt-6 max-w-[592px] text-[15px] leading-relaxed tracking-[-0.02em] text-gray-600 sm:text-[16px]">
            EALHO Notes AI automatically transcribes your sessions and generates structured SOAP
            notes. Save 15+ hours weekly on documentation.
          </p>
        </div>

        <motion.div
          ref={mockRef}
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mt-10 sm:mt-12"
        >
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
            <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[#807a5a]">
              After every session →
            </p>
            <div className="w-full max-w-[920px]">
              <ThreePanelMockup />
            </div>
          </div>
        </motion.div>

        <div className="mt-14 sm:mt-20">
          <div className="mx-auto flex max-w-[592px] flex-col items-center gap-6 px-2 text-center">
            <div className="relative size-[142px] shrink-0 overflow-hidden rounded-full ring-2 ring-gray-200">
              <Image
                src={figma.testimonialAvatar}
                alt=""
                fill
                className="object-cover"
                sizes="142px"
              />
            </div>
            <p className="max-w-[327px] text-[20px] font-medium leading-[1.35] tracking-[-0.025em] text-[#1A1A1A] sm:text-[24px]">
              “Focus on therapy, Let Ealho make your notes”
            </p>
            <p className="text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              EALHO connects medical doctors with therapists who understand the weight of the white
              coat. Confidential, covered by insurance, and designed for your schedule.
            </p>
            <div className="text-[15px] leading-relaxed tracking-[-0.015em] text-gray-500 sm:text-[16px]">
              <p>Michael Asere</p>
              <p>CEO, Co-founder Ealho Therapy</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
