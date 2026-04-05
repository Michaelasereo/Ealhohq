import { LegalLayout } from "@/components/legal/LegalLayout";
import { PrivacyBody, privacyToc } from "@/components/legal/privacy-body";

export const metadata = {
  title: "Privacy Policy | Ealho Therapy",
  description:
    "How Ealho Therapy collects, uses, and protects your personal information under the NDPA 2023.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="April 2026" toc={[...privacyToc]}>
      <PrivacyBody />
    </LegalLayout>
  );
}
