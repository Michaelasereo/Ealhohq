"use client";

import { motion } from "framer-motion";
import { ArrowRight, BriefcaseBusiness, Building2, Video } from "lucide-react";

import { Pill, SectionReveal, scrollToId } from "@/components/organisations/SectionReveal";

const cards = [
  {
    id: "private-clinics",
    number: "01",
    Icon: Building2,
    title: "Private Clinics and Hospitals",
    description:
      "Staff wellness and patient mental health referral — solved together through a single partnership.",
  },
  {
    id: "telehealth-platforms",
    number: "02",
    Icon: Video,
    title: "Telehealth Platforms and Digital Health",
    description:
      "A ready-built, white-label-ready mental health layer for your existing platform and user base.",
  },
  {
    id: "employers",
    number: "03",
    Icon: BriefcaseBusiness,
    title: "Employers and Staff Wellness",
    description:
      "A culturally grounded Employee Assistance Programme built for Nigerian workplaces and workforce pressures.",
  },
] as const;

export function PartnerTypes() {
  return (
    <SectionReveal className="bg-[#FAF8F5] px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-[1120px]">
        <Pill>[ WHO WE WORK WITH ]</Pill>
        <h2 className="mt-5 text-3xl font-semibold tracking-[-0.025em] text-[#1A1A1A] sm:text-[42px]">
          Built for Three Types of Organisations
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {cards.map((card, index) => (
            <motion.article
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="rounded-2xl border border-[#292612]/15 bg-white p-5"
            >
              <p className="text-sm font-semibold text-[#292612]">{card.number}</p>
              <div className="mt-3 flex size-10 items-center justify-center rounded-full bg-[#292612]/10">
                <card.Icon size={18} strokeWidth={1.5} className="text-[#292612]" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#1A1A1A]">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{card.description}</p>
              <button
                type="button"
                onClick={() => scrollToId(card.id)}
                className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[#292612]"
              >
                Learn more <ArrowRight size={14} strokeWidth={1.75} />
              </button>
            </motion.article>
          ))}
        </div>
      </div>
    </SectionReveal>
  );
}
