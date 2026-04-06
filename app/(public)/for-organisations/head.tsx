export default function Head() {
  const ld = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Ealho — Mental Health Support for Organisations",
    provider: {
      "@type": "Organization",
      name: "Ealho",
      url: "https://ealho.com",
    },
    areaServed: { "@type": "Country", name: "Nigeria" },
    description:
      "Ealho partners with private clinics, telehealth platforms, and employers across Nigeria to deliver professional therapy for staff and patients.",
    serviceType: [
      "Staff Wellness Programme",
      "Patient Mental Health Referral",
      "Telehealth Mental Health Partnership",
    ],
  };

  return (
    <>
      <link rel="canonical" href="https://ealho.com/for-organisations" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
    </>
  );
}
