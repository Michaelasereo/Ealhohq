"use client";

import { SectionReveal } from "@/components/organisations/SectionReveal";

export function OrganisationsCta() {
  return (
    <SectionReveal className="bg-[#292612] px-4 py-14 text-center sm:px-6 sm:py-20">
      <div className="mx-auto max-w-[900px]">
        <h3 className="text-3xl font-semibold tracking-[-0.025em] text-[#D6EAE1] sm:text-[42px]">
          Ready to Bring Professional Mental Health
          <br />
          Support to Your Organisation?
        </h3>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#D6EAE1]/85 sm:text-base">
          Whether you are a private clinic, a telehealth platform, or an employer — Ealho is
          ready to partner with you.
        </p>
        <div className="mt-8">
          <a
            href="mailto:partnerships@ealho.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#D6EAE1] px-8 text-sm font-semibold text-[#292612] sm:w-auto"
          >
            Contact Our Partnerships Team
          </a>
          <p className="mt-4 text-sm text-[#D6EAE1]/90">
            partnerships@ealho.com ·{" "}
            <a
              href="https://ealho.com/for-organisations"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              ealho.com/for-organisations
            </a>
          </p>
        </div>
      </div>
    </SectionReveal>
  );
}
