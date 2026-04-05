import { LegalLayout } from "@/components/legal/LegalLayout";
import {
  TherapistStandardsBody,
  therapistStandardsToc,
} from "@/components/legal/therapist-standards-body";

export const metadata = {
  title: "Therapist Standards and Code of Practice | Ealho Therapy",
  description: "How Ealho vets, onboards, and holds therapists accountable.",
};

export default function TherapistStandardsPage() {
  return (
    <LegalLayout
      title="Therapist Standards and Code of Practice"
      lastUpdated="April 2026"
      toc={[...therapistStandardsToc]}
    >
      <div className="not-prose mb-10">
        <p className="text-muted-foreground text-lg leading-relaxed">
          How we vet, onboard, and hold therapists accountable on Ealho
        </p>
      </div>
      <TherapistStandardsBody />
    </LegalLayout>
  );
}
