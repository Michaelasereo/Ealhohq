import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { CrisisContext } from "@/components/organisations/CrisisContext";
import { DetailSections } from "@/components/organisations/DetailSections";
import { HowItWorks } from "@/components/organisations/HowItWorks";
import { OrganisationsCta } from "@/components/organisations/OrganisationsCta";
import { OrganisationsFaq } from "@/components/organisations/OrganisationsFaq";
import { OrganisationsHero } from "@/components/organisations/OrganisationsHero";
import { PartnerTypes } from "@/components/organisations/PartnerTypes";
import { WhyOrganisationsChooseEalho } from "@/components/organisations/WhyOrganisationsChooseEalho";

export const metadata = {
  title: "Mental Health Support for Organisations in Nigeria | Ealho",
  description:
    "Ealho partners with private clinics, telehealth platforms, and employers across Nigeria to deliver professional therapy for staff and patients. Licensed therapists. Nationwide coverage. Simple onboarding.",
  keywords: [
    "mental health support Nigeria",
    "employee wellness programme Nigeria",
    "therapy for healthcare workers Nigeria",
    "staff mental health Nigeria",
    "telehealth mental health partnership Nigeria",
    "therapy for clinic patients Nigeria",
    "corporate mental health Nigeria",
  ],
  alternates: {
    canonical: "https://ealho.com/for-organisations",
  },
} as const;

export default function ForOrganisationsPage() {
  return (
    <>
      <Navbar />
      <main className="min-w-0 flex-1">
        <OrganisationsHero />
        <PartnerTypes />
        <DetailSections />
        <WhyOrganisationsChooseEalho />
        <CrisisContext />
        <HowItWorks />
        <OrganisationsFaq />
        <OrganisationsCta />
      </main>
      <Footer />
    </>
  );
}
