import type { Metadata } from "next";

import { BookSessionCtaButton } from "@/components/blog/BookSessionCtaButton";
import { BurnoutPageGuideCta } from "@/components/burnout/BurnoutPageGuideCta";
import { Navbar } from "@/components/landing/Navbar";
import { getSiteUrl } from "@/lib/site-url";

const base = getSiteUrl();

export const metadata: Metadata = {
  title: "Free burnout guide for clinicians | Ealho",
  description:
    "Download a free burnout guide for doctors, nurses, and healthcare workers in Nigeria — built for clinical life.",
  alternates: { canonical: `${base}/burnout-assessment` },
  openGraph: {
    title: "Free burnout guide for clinicians | Ealho",
    description:
      "Get the PDF by email — practical support for healthcare professionals in Nigeria.",
    url: `${base}/burnout-assessment`,
    type: "website",
  },
};

export default function BurnoutAssessmentPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-[720px] px-4 py-16 sm:px-6 sm:py-24">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#807a5a]">
            Free resource
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#24221e] sm:text-4xl">
            Burnout guide for clinicians
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#5c574e] sm:text-lg">
            A practical PDF for doctors, nurses, and healthcare workers in Nigeria — confidential,
            no jargon. Request it by email and we&apos;ll send it straight to your inbox.
          </p>
          <BurnoutPageGuideCta />
        </div>

        <div className="mt-12 rounded-2xl border border-[#dddbd0] bg-[#e8e6dd]/50 p-8 text-center">
          <p className="font-semibold text-[#24221e]">Need support now?</p>
          <p className="mt-2 text-sm text-[#5c574e]">
            Book a session with a licensed therapist — same platform, confidential care.
          </p>
          <div className="mt-6 flex justify-center">
            <BookSessionCtaButton />
          </div>
        </div>
      </main>
    </div>
  );
}
