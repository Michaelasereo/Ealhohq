import { ClinicPartnership } from "@/components/landing/ClinicPartnership";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { TherapyServices } from "@/components/landing/TherapyServices";
import { LandingSection } from "@/components/landing/LandingSection";
import { Navbar } from "@/components/landing/Navbar";
import { NotesAI } from "@/components/landing/NotesAI";
import { CaptureReferralFromUrl } from "@/components/referral/CaptureReferralFromUrl";
import { TherapistTeam } from "@/components/landing/TherapistTeam";

export default function HomePage() {
  return (
    <>
      <CaptureReferralFromUrl />
      <Navbar />
      <main className="min-w-0 flex-1">
        <LandingSection delay={0}>
          <Hero />
        </LandingSection>
        <LandingSection delay={0.08}>
          <TherapyServices />
        </LandingSection>
        <LandingSection delay={0.15}>
          <TherapistTeam />
        </LandingSection>
        <LandingSection delay={0.25}>
          <NotesAI />
        </LandingSection>
        <LandingSection delay={0.35}>
          <FAQ />
        </LandingSection>
        <LandingSection delay={0.45}>
          <ClinicPartnership />
        </LandingSection>
        <LandingSection delay={0.55}>
          <Footer />
        </LandingSection>
      </main>
    </>
  );
}
