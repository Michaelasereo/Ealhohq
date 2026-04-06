"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

import { SectionReveal } from "@/components/organisations/SectionReveal";

function Callout({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-[#292612]/20 bg-[#292612]/5 p-4">
      <p className="border-l-4 border-[#292612] pl-3 text-sm font-semibold text-[#1A1A1A]">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{body}</p>
    </div>
  );
}

export function DetailSections() {
  return (
    <>
      <SectionReveal id="private-clinics" className="bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[1120px] border-l-4 border-[#292612] pl-4 sm:pl-6">
          <p className="text-xs font-semibold tracking-[0.14em] text-[#292612]">01 — PRIVATE CLINICS</p>
          <h3 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-[#1A1A1A] sm:text-[40px]">
            Your Staff Are Burning Out.
            <br />
            Your Patients Need More.
            <br />
            One Partnership Solves Both.
          </h3>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base">
            Private clinics across Nigeria face a dual challenge that rarely gets solved together.
            Your staff — doctors, nurses, pharmacists, administrative officers — carry a
            psychological burden that accumulates silently and surfaces as burnout, absenteeism,
            and turnover.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base">
            And your patients frequently leave with unmet mental health needs that fall outside
            your clinical team's capacity to address.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Callout
              title="Staff Wellness Programme"
              body="Confidential access to licensed therapists, matched to your team's needs and available around shift patterns."
            />
            <Callout
              title="Patient Referral Programme"
              body="A structured mental health pathway for patients presenting with psychological needs — so they leave your clinic with a clear next step."
            />
          </div>
          <p className="mt-6 text-base font-semibold text-[#292612]">
            The only mental health platform in Nigeria that addresses staff wellness and patient
            referral through one partner, one contact, one invoice.
          </p>
        </div>
      </SectionReveal>

      <SectionReveal id="telehealth-platforms" className="bg-[#FAF8F5] px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[1120px] border-l-4 border-[#292612] pl-4 sm:pl-6">
          <p className="text-xs font-semibold tracking-[0.14em] text-[#292612]">02 — TELEHEALTH PLATFORMS</p>
          <h3 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-[#1A1A1A] sm:text-[40px]">
            Your Users Need Mental Health Support.
            <br />
            We Have the Therapists.
          </h3>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base">
            Mental health is the fastest-growing unmet need in Nigerian telehealth. Anxiety,
            depression, burnout, grief — most platforms have no credible clinical answer for them.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ["Verified therapist network", "Licensed Nigerian therapists available for virtual sessions nationwide"],
              ["Two session formats", "Standard and extended specialist sessions for different user needs and price points"],
              ["Wholesale pricing", "Predictable costs and commercial flexibility for your platform"],
              ["Full clinical QA", "Therapist management and quality assurance handled entirely by Ealho"],
            ].map(([title, body], index) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-xl border border-[#292612]/15 bg-white p-4"
              >
                <p className="text-sm font-semibold text-[#1A1A1A]">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{body}</p>
              </motion.div>
            ))}
          </div>
          <p className="mt-6 text-base font-semibold text-[#1A1A1A]">
            You bring the users. We bring the therapists, the infrastructure, and the clinical
            standard.
          </p>
        </div>
      </SectionReveal>

      <SectionReveal id="employers" className="bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[1120px] border-l-4 border-[#292612] pl-4 sm:pl-6">
          <p className="text-xs font-semibold tracking-[0.14em] text-[#292612]">03 — EMPLOYERS</p>
          <h3 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-[#1A1A1A] sm:text-[40px]">
            An EAP Built for
            <br />
            Nigerian Workplaces.
          </h3>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base">
            Most Employee Assistance Programmes available in Nigeria are either imported solutions
            with no local cultural fit, or informal arrangements with no clinical credibility.
            Ealho is neither.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Therapists who understand the Nigerian professional context — the pressures, the stigma, the language, and the culture",
              "Fully confidential sessions with no content reported to management — only anonymised utilisation data",
              "Virtual sessions that fit around work schedules and eliminate the need to explain an absence",
              "A simple monthly retainer that fits how Nigerian organisations budget for benefits",
            ].map((line) => (
              <li key={line} className="flex gap-2 text-sm leading-relaxed text-gray-700">
                <Check size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-[#292612]" />
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-gray-600 sm:text-base">
            Healthcare workers. Corporate employees. Shift workers. Entrepreneurs. Ealho serves the
            full spectrum of Nigerian professionals.
          </p>
        </div>
      </SectionReveal>
    </>
  );
}
