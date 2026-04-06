"use client";

import { motion } from "framer-motion";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pill, SectionReveal } from "@/components/organisations/SectionReveal";

const flows = {
  clinics: [
    ["Agreement", "We agree on the partnership structure — staff wellness, patient referral, or both. Documentation is straightforward. Onboarding begins within days."],
    ["Staff Communication", "We provide your HR team with everything needed to communicate the benefit — messaging templates, FAQs, and booking instructions."],
    ["Staff Book Directly", "Staff book their own sessions privately. They choose their therapist, their time, their format. Nothing goes through management."],
    ["Patients Are Referred", "Your clinical team refers patients using a simple referral link. The patient books and pays directly. Your clinic receives a monthly referral summary."],
    ["Monthly Reporting", "Anonymised utilisation report each month — sessions used, average wait time, satisfaction scores. No individual data. No clinical content."],
  ],
  telehealth: [
    ["Commercial Agreement", "We agree session types, wholesale pricing, and remittance schedule. Most agreements finalised within two weeks."],
    ["Therapist Network Access", "Your platform gains access to Ealho's verified therapist network. We handle matching, scheduling, and quality assurance."],
    ["Users Book Through Your Platform", "The booking experience lives within your product. Users see Ealho-verified therapists available for their chosen session type."],
    ["Sessions Delivered", "Ealho therapists conduct sessions virtually. All clinical quality assurance sits with Ealho."],
    ["Monthly Settlement", "You remit Ealho's wholesale fee for all completed sessions. Simple, predictable, clean."],
  ],
  employers: [
    ["Needs Assessment", "We understand your workforce size, structure, and the specific pressures your staff face. This shapes how we configure your programme."],
    ["Retainer Agreement", "You approve a monthly retainer appropriate to your organisation's size. No per-head fees. No long-term lock-in after the initial period."],
    ["Internal Launch", "We help you communicate the benefit internally in a way that drives uptake and reduces stigma — framing therapy as a performance tool, not a crisis resource."],
    ["Ongoing Access", "Staff book sessions as needed, privately and on their own terms. You see only utilisation numbers."],
  ],
} as const;

function Steps({ steps }: { steps: readonly (readonly [string, string])[] }) {
  return (
    <div className="mt-6 space-y-4">
      {steps.map(([title, body], idx) => (
        <motion.div
          key={title}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.08 }}
          className="rounded-xl border border-[#292612]/15 bg-[#FAF8F5] p-4"
        >
          <p className="text-xs font-semibold tracking-[0.12em] text-[#292612]">
            Step {idx + 1}
          </p>
          <p className="mt-1 text-base font-semibold text-[#1A1A1A]">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">{body}</p>
        </motion.div>
      ))}
    </div>
  );
}

export function HowItWorks() {
  return (
    <SectionReveal id="how-it-works" className="bg-white px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-[1120px]">
        <Pill>[ HOW IT WORKS ]</Pill>
        <h3 className="mt-5 text-3xl font-semibold tracking-[-0.025em] text-[#1A1A1A] sm:text-[42px]">
          Simple to Start.
          <br />
          Straightforward to Run.
        </h3>

        <div className="hidden md:block">
          <Tabs defaultValue="clinics" className="mt-8">
            <TabsList className="w-full rounded-full bg-[#ece9e3] p-1">
              <TabsTrigger value="clinics" className="min-h-11 rounded-full text-sm">
                Private Clinics
              </TabsTrigger>
              <TabsTrigger value="telehealth" className="min-h-11 rounded-full text-sm">
                Telehealth Platforms
              </TabsTrigger>
              <TabsTrigger value="employers" className="min-h-11 rounded-full text-sm">
                Employers
              </TabsTrigger>
            </TabsList>
            <TabsContent value="clinics">
              <Steps steps={flows.clinics} />
            </TabsContent>
            <TabsContent value="telehealth">
              <Steps steps={flows.telehealth} />
            </TabsContent>
            <TabsContent value="employers">
              <Steps steps={flows.employers} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-8 md:hidden">
          <Accordion>
            <AccordionItem value="clinics">
              <AccordionTrigger className="min-h-12 text-base font-semibold text-[#1A1A1A]">
                Private Clinics
              </AccordionTrigger>
              <AccordionContent>
                <Steps steps={flows.clinics} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="telehealth">
              <AccordionTrigger className="min-h-12 text-base font-semibold text-[#1A1A1A]">
                Telehealth Platforms
              </AccordionTrigger>
              <AccordionContent>
                <Steps steps={flows.telehealth} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="employers">
              <AccordionTrigger className="min-h-12 text-base font-semibold text-[#1A1A1A]">
                Employers
              </AccordionTrigger>
              <AccordionContent>
                <Steps steps={flows.employers} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </SectionReveal>
  );
}
