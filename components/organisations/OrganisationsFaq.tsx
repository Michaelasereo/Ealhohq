"use client";

import { motion } from "framer-motion";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Pill, SectionReveal } from "@/components/organisations/SectionReveal";

const faq = [
  [
    "Is Ealho available outside Lagos?",
    "Yes. All Ealho sessions are conducted virtually, which means your staff, patients, or users can access therapy from anywhere in Nigeria with an internet connection. We are a nationwide platform, not a Lagos-only service.",
  ],
  [
    "How quickly can we get started?",
    "Most partnerships are live within one week of signing. There is no complex technical integration required for clinic or employer partnerships. Telehealth platform integrations may take slightly longer depending on your technical setup, but we are built to keep the process simple.",
  ],
  [
    "Are your therapists actually qualified?",
    "Every therapist on Ealho holds a recognised clinical qualification — typically a degree in clinical psychology, counselling psychology, or a related field, often at postgraduate level. All therapists go through a credentialing process before joining the platform. We do not list unverified counsellors or coaches as therapists.",
  ],
  [
    "What happens if someone needs emergency support?",
    "Ealho therapists are trained to identify and appropriately respond to clinical emergencies. Our platform has clear protocols for escalation. We also provide organisations with guidance on what to do if a staff member presents in crisis outside of scheduled sessions.",
  ],
  [
    "Will my staff actually use it?",
    "Uptake depends heavily on how the benefit is communicated internally. Ealho provides organisations with communication support designed to reduce stigma and drive uptake. Programmes framed as performance and resilience tools — rather than mental health crisis resources — consistently see higher utilisation rates in the Nigerian workplace context.",
  ],
  [
    "How is confidentiality maintained?",
    "Session content is never shared with management, employers, or any third party. Organisations receive only anonymised aggregate reports — total sessions used, average wait time, and satisfaction scores. Individual staff members cannot be identified in any report we produce.",
  ],
  [
    "Can we start with a pilot?",
    "Yes. We offer a structured pilot arrangement for new partners that allows your organisation to experience the service before committing to an ongoing agreement. Speak to our partnerships team for details.",
  ],
  [
    "Do you work with HMOs and insurers?",
    "We are actively developing relationships with Nigerian HMOs and health insurance providers. If your organisation uses an HMO and wants to explore how Ealho can be integrated into your existing health benefits, contact us and we will work through the options together.",
  ],
] as const;

export function OrganisationsFaq() {
  return (
    <SectionReveal className="bg-[#FAF8F5] px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-[900px]">
        <Pill>[ FAQ ]</Pill>
        <h3 className="mt-5 text-3xl font-semibold tracking-[-0.025em] text-[#1A1A1A] sm:text-[42px]">
          Frequently Asked Questions
        </h3>
        <Accordion className="mt-8">
          {faq.map(([q, a], idx) => (
            <motion.div
              key={q}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.04 }}
            >
              <AccordionItem value={`faq-${idx}`} className="border-b border-[#d9d5ce]">
                <AccordionTrigger className="min-h-12 py-4 text-left text-base font-medium text-[#1A1A1A] hover:no-underline">
                  <span className="mr-3 text-[#292612]">{String(idx + 1).padStart(2, "0")}</span>
                  {q}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="pb-4 pl-9 text-sm leading-relaxed text-gray-600 sm:text-base">{a}</p>
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </SectionReveal>
  );
}
