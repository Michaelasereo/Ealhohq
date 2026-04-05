"use client";

import { motion } from "framer-motion";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const faqTabTrigger =
  "flex-1 rounded-full border-0 bg-transparent px-3 py-2 text-[15px] font-medium text-gray-600 shadow-none after:hidden hover:text-gray-600 data-active:bg-white data-active:font-semibold data-active:text-gray-600 data-active:shadow-sm sm:px-4 sm:text-[16px]";

const faqByTab = {
  booking: [
    {
      q: "How do I book a session?",
      a: "Browse our therapists, select a date and time that works for you, complete your details, and pay securely. The whole process takes under 2 minutes. Your session link arrives via email and WhatsApp immediately.",
    },
    {
      q: "Can I book without creating an account?",
      a: "Yes. You can book as a guest with just your name, email, and phone number. We recommend creating an account to manage your session history and access our credits system.",
    },
    {
      q: "Can I book anonymously?",
      a: 'Yes. Toggle "Anonymous session" during booking. Your therapist will only see your chosen alias and a session reference number — never your real identity.',
    },
    {
      q: "How far in advance can I book?",
      a: "Up to 4 weeks in advance. We recommend booking at least 2 hours before your desired session time.",
    },
    {
      q: "What if I need to cancel?",
      a: "Cancellations made more than 24 hours before your session receive a full credit refund. Cancellations within 24 hours are non-refundable except at therapist discretion.",
    },
  ],
  security: [
    {
      q: "Is my session confidential?",
      a: "Yes, completely. All sessions are confidential. Your therapist operates under professional ethical standards and Nigerian law. Confidentiality can only be broken where required by law or where there is imminent risk of harm.",
    },
    {
      q: "What happens to the session audio?",
      a: "Session audio is processed in real time for note generation and is permanently deleted immediately after processing. We never store audio recordings under any circumstances.",
    },
    {
      q: "Who can see my session notes?",
      a: "Only your treating therapist. Ealho staff have no access to the content of session notes. Notes are protected by strict access controls at the database level.",
    },
    {
      q: "How is my payment information protected?",
      a: "We never store card details. All payments are processed by Paystack, a PCI-DSS compliant payment provider. Your card information never touches our servers.",
    },
    {
      q: "Are you compliant with Nigerian data laws?",
      a: "Yes. We operate in full compliance with the Nigeria Data Protection Act 2023 (NDPA). You can read our full Privacy Policy for details on your rights and how we handle your data.",
    },
  ],
  packages: [
    {
      q: "How do credits work?",
      a: "Credits are prepaid session tokens. 1 credit = 1 therapy session. You buy credits in packages and use them to book sessions. Credits never expire.",
    },
    {
      q: "What packages are available?",
      a: "Bronze (2 sessions, 5% off), Silver (4 sessions, 10% off), Gold (8 sessions, 15% off), and Platinum (12 sessions, 20% off). Prices are calculated against your therapist's standard rate.",
    },
    {
      q: "Can I use insurance?",
      a: "We are working with Nigerian HMO providers to enable insurance coverage. This is currently available for select corporate partners. Contact us at hello@ealhohq.com for details.",
    },
    {
      q: "What is the standard session rate?",
      a: "Session rates are set by individual therapists and range from ₦15,000 to ₦25,000 per session. The rate is shown clearly on each therapist's profile before you book.",
    },
    {
      q: "Do credits work with any therapist?",
      a: "Yes. Credits work with any approved therapist on the platform regardless of their individual rate.",
    },
  ],
} as const;

function FaqList({
  prefix,
  items,
}: {
  prefix: string;
  items: readonly { q: string; a: string }[];
}) {
  return (
    <Accordion className="w-full">
      {items.map((item, index) => (
        <AccordionItem
          key={`${prefix}-${item.q}`}
          value={`${prefix}-${index}`}
          className="border-gray-200"
        >
          <AccordionTrigger className="py-4 text-left text-[15px] font-medium text-[#1A1A1A] hover:no-underline sm:text-[16px]">
            {item.q}
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">{item.a}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function FaqTabPanel({
  tabKey,
  prefix,
}: {
  tabKey: keyof typeof faqByTab;
  prefix: string;
}) {
  const items = faqByTab[tabKey];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mt-8 lg:mt-10"
    >
      <FaqList prefix={prefix} items={items} />
    </motion.div>
  );
}

export function FAQ() {
  return (
    <section id="faq" className="scroll-mt-24 bg-white px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-[720px]">
        <h2 className="text-center text-[2rem] font-semibold leading-[1.2] tracking-[-0.025em] text-[#1A1A1A] sm:text-[49px] sm:leading-[60px]">
          Frequently Asked Questions
        </h2>

        <Tabs defaultValue="booking" className="mt-8 w-full sm:mt-10">
          <TabsList
            variant="default"
            className="mx-auto flex h-auto min-h-11 w-full max-w-md flex-wrap gap-1 rounded-[23px] border-0 bg-[#dddbd0] p-1.5 shadow-none"
          >
            <TabsTrigger value="booking" className={cn(faqTabTrigger)}>
              Booking
            </TabsTrigger>
            <TabsTrigger value="security" className={cn(faqTabTrigger)}>
              Security
            </TabsTrigger>
            <TabsTrigger value="packages" className={cn(faqTabTrigger)}>
              Packages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="booking" className="outline-none">
            <FaqTabPanel tabKey="booking" prefix="book" />
          </TabsContent>

          <TabsContent value="security" className="outline-none">
            <FaqTabPanel tabKey="security" prefix="sec" />
          </TabsContent>

          <TabsContent value="packages" className="outline-none">
            <FaqTabPanel tabKey="packages" prefix="pkg" />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
