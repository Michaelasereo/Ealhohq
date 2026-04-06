"use client";

import { motion } from "framer-motion";

import { Pill, scrollToId } from "@/components/organisations/SectionReveal";

export function OrganisationsHero() {
  return (
    <section className="bg-[#1A1A1A] px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-[1120px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="max-w-3xl"
        >
          <Pill dark>[ FOR ORGANISATIONS ]</Pill>
          <h1 className="mt-6 text-3xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-5xl">
            Professional Mental Health Support
            <br />
            for Organisations Across Nigeria
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#FAF8F5]/80 sm:text-lg">
            Ealho — Where Clinicians Come to Heal, and Organisations Come to Care.
          </p>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
            Whether you run a private clinic, operate a telehealth platform, or manage a
            workforce, Ealho gives your organisation a simple, trusted pathway to professional
            mental health support — for your staff, your patients, and your users.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="mailto:partnerships@ealho.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#292612] px-6 text-sm font-semibold text-[#D6EAE1] transition-colors hover:bg-[#292612]/90 sm:w-auto"
            >
              Talk to Our Partnerships Team
            </a>
            <button
              type="button"
              onClick={() => scrollToId("how-it-works")}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/30 px-6 text-sm font-semibold text-[#FAF8F5] transition-colors hover:bg-white/10 sm:w-auto"
            >
              Learn How It Works
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
