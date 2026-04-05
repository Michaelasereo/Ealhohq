"use client";

import { Calendar } from "lucide-react";
import Image from "next/image";
import { figma } from "@/lib/figma-assets";
import { figmaPrimaryCta } from "@/lib/ealho-link-styles";
import { cn } from "@/lib/utils";
import { useBookingStore } from "@/stores/bookingStore";

export function TherapistTeam() {
  const setBookingModalOpen = useBookingStore((s) => s.setBookingModalOpen);

  return (
    <section className="scroll-mt-24 bg-white px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto flex max-w-[980px] flex-col items-center text-center">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-1">
          <h2 className="text-[2rem] font-medium leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:text-[52px] lg:leading-[1.05]">
            <span className="text-[#24221e]">Ealho&apos;s Team of</span>
            <br />
            <span className="text-[#807a5a]">Exceptional therapists</span>
          </h2>
          <p className="line-clamp-3 max-w-3xl text-pretty text-[15px] leading-relaxed tracking-[-0.02em] text-gray-600 sm:text-[16px]">
            Behind every Ealho session is a licensed mental health professional with years of
            experience supporting healthcare workers. We don&apos;t just match you with any
            therapist—we match you with someone who genuinely understands your world.
          </p>
          <button
            type="button"
            onClick={() => setBookingModalOpen(true)}
            className={cn(
              "mt-2 inline-flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-full border-0 bg-[#292612] px-6 text-base font-medium text-[#D6EAE1] transition-none hover:bg-[#292612] hover:text-[#D6EAE1]",
            )}
          >
            <Calendar size={18} strokeWidth={1.5} className="shrink-0" aria-hidden />
            <span>Book a Session</span>
          </button>
        </div>

        <div className="relative mx-auto mt-12 flex w-full max-w-[980px] flex-col gap-4 sm:mt-16 md:flex-row md:items-end md:justify-center md:gap-3 lg:gap-4">
          <div className="relative aspect-[231/479] w-full overflow-hidden rounded-[22px] md:max-w-[231px]">
            <Image
              src={figma.teamFrame1}
              alt=""
              fill
              className="object-cover grayscale transition-all duration-[400ms] ease-out hover:grayscale-0"
              sizes="(max-width:768px) 100vw, 231px"
            />
          </div>
          <div className="relative aspect-[140/479] w-full overflow-hidden rounded-[22px] md:max-w-[140px]">
            <Image
              src={figma.teamFrame3}
              alt=""
              fill
              className="object-cover grayscale transition-all duration-[400ms] ease-out hover:grayscale-0"
              sizes="(max-width:768px) 100vw, 140px"
            />
          </div>
          <div className="relative aspect-[294/479] w-full overflow-hidden rounded-[22px] md:max-w-[294px]">
            <Image
              src={figma.teamFrame2}
              alt=""
              fill
              className="object-cover grayscale transition-all duration-[400ms] ease-out hover:grayscale-0"
              sizes="(max-width:768px) 100vw, 294px"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
