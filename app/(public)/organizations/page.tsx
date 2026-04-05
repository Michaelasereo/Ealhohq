"use client";

import {
  Building2,
  Check,
  HeartHandshake,
  Stethoscope,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { cn } from "@/lib/utils";

const features = [
  "Bulk session credits at discounted rates",
  "Organisation admin dashboard",
  "Usage reporting and analytics",
  "Priority therapist matching",
  "AI-powered session notes via Ealho Notes AI API",
  "FHIR-compatible EHR integration",
  "Dedicated account manager",
  "NDPA compliant data handling",
] as const;

const tiers = [
  {
    name: "Starter",
    detail: "Up to 10 staff",
    price: "from ₦120,000/month",
  },
  {
    name: "Business",
    detail: "Up to 50 staff",
    price: "from ₦450,000/month",
  },
  {
    name: "Enterprise",
    detail: "Unlimited",
    price: "custom pricing",
  },
] as const;

export default function OrganizationsPage() {
  function scrollToPricing() {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <Navbar />
      <main className="min-w-0 flex-1 bg-[#FAF8F5]">
        <section className="mx-auto max-w-[900px] px-4 py-14 text-center sm:px-6 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <h1 className="text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-[#1A1A1A] sm:text-5xl">
              Ealho for Organizations
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-gray-600 sm:text-[17px]">
              Give your team access to confidential therapy and AI-powered clinical documentation.
              One platform, built for healthcare.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <a
                href="mailto:hello@ealhohq.com"
                className="inline-flex h-12 min-h-12 items-center justify-center rounded-full bg-[#292612] px-8 text-base font-medium text-[#D6EAE1] hover:bg-[#292612] hover:text-[#D6EAE1]"
              >
                Talk to Us
              </a>
              <button
                type="button"
                onClick={scrollToPricing}
                className="inline-flex h-12 min-h-12 items-center justify-center rounded-full border border-gray-300 bg-transparent px-8 text-base font-medium text-gray-700 hover:bg-transparent hover:text-gray-700"
              >
                View Pricing
              </button>
            </div>
            <p className="mt-10">
              <Link href="/" className="text-sm font-medium text-[#292612] underline-offset-4 hover:underline">
                ← Back to home
              </Link>
            </p>
          </motion.div>
        </section>

        <section className="border-t border-gray-200/80 bg-white px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-[1100px]">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center text-xl font-semibold text-[#1A1A1A] sm:text-2xl"
            >
              Who is this for
            </motion.h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: Stethoscope,
                  title: "Hospitals & Clinics",
                  body: "Provide your clinical staff with access to confidential therapy and automate session documentation across your practice.",
                },
                {
                  icon: Building2,
                  title: "Telemedicine Platforms",
                  body: "Integrate Ealho Notes AI into your platform via our API. Structured SOAP notes generated automatically after every consultation.",
                },
                {
                  icon: HeartHandshake,
                  title: "Corporate Employers",
                  body: "Support the mental health of your healthcare workforce. Bulk session credits, usage reports, and dedicated account management.",
                },
              ].map((card) => (
                <motion.article
                  key={card.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                  className="rounded-2xl border border-gray-100 bg-[#FAF8F5] p-6"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#292612]/10">
                    <card.icon className="text-[#292612]" size={24} strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[#1A1A1A]">{card.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{card.body}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-[720px]">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center text-xl font-semibold text-[#1A1A1A] sm:text-2xl"
            >
              What you get
            </motion.h2>
            <ul className="mt-8 space-y-3">
              {features.map((line, i) => (
                <motion.li
                  key={line}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className="flex gap-3 text-[15px] leading-relaxed text-gray-700 sm:text-[16px]"
                >
                  <Check
                    className="mt-0.5 shrink-0 text-[#292612]"
                    size={18}
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  {line}
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="pricing"
          className="border-t border-gray-200/80 bg-white px-4 py-14 sm:px-6 sm:py-20"
        >
          <div className="mx-auto max-w-[1000px]">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center text-xl font-semibold text-[#1A1A1A] sm:text-2xl"
            >
              Pricing
            </motion.h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {tiers.map((t) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className={cn(
                    "flex flex-col rounded-2xl border border-gray-100 bg-[#FAF8F5] p-6",
                  )}
                >
                  <p className="text-lg font-semibold text-[#292612]">{t.name}</p>
                  <p className="mt-1 text-sm text-gray-600">{t.detail}</p>
                  <p className="mt-4 text-lg font-medium text-[#1A1A1A]">{t.price}</p>
                </motion.div>
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-gray-600">
              All plans include onboarding support and a 30-day pilot period.
            </p>
            <div className="mt-8 flex justify-center">
              <a
                href="mailto:hello@ealhohq.com"
                className="inline-flex h-12 min-h-12 items-center justify-center rounded-full bg-[#292612] px-8 text-base font-medium text-[#D6EAE1] hover:bg-[#292612] hover:text-[#D6EAE1]"
              >
                Contact us for a quote
              </a>
            </div>
          </div>
        </section>

        <div className="border-t border-gray-200/80 px-4 py-8 text-center sm:px-6">
          <Link href="/" className="text-sm font-medium text-[#292612] underline-offset-4 hover:underline">
            ← Back to home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
