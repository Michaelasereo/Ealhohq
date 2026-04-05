import { LegalLayout } from "@/components/legal/LegalLayout";
import { TermsBody, termsToc } from "@/components/legal/terms-body";

export const metadata = {
  title: "Terms of Service | Ealho Therapy",
  description: "Terms of Service for using the Ealho Therapy platform.",
};

export default function TermsOfServicePage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="April 2026" toc={[...termsToc]}>
      <TermsBody />
    </LegalLayout>
  );
}
