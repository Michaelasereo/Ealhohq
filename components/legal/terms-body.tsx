export const termsToc = [
  { id: "agreement", title: "1. Agreement" },
  { id: "who-we-are", title: "2. Who we are" },
  { id: "the-service", title: "3. The service" },
  { id: "patient-obligations", title: "4. Patient obligations" },
  { id: "payments", title: "5. Payments and refunds" },
  { id: "ai-notes", title: "6. AI-generated notes" },
  { id: "confidentiality", title: "7. Confidentiality" },
  { id: "liability", title: "8. Limitation of liability" },
  { id: "law", title: "9. Governing law" },
  { id: "contact-terms", title: "10. Contact" },
] as const;

export function TermsBody() {
  return (
    <>
      <section id="agreement" className="scroll-mt-24">
        <h2>1. Agreement</h2>
        <p>
          By using Ealho Therapy, you agree to these Terms. If you do not agree, do not use the
          platform.
        </p>
      </section>

      <section id="who-we-are" className="scroll-mt-24">
        <h2>2. Who we are</h2>
        <p>
          Ealho Therapy is a digital mental health platform connecting patients with licensed
          therapists in Nigeria.
        </p>
      </section>

      <section id="the-service" className="scroll-mt-24">
        <h2>3. The service</h2>
        <h3>3.1</h3>
        <p>
          We provide a platform for booking and conducting therapy sessions. We are not a medical
          provider.
        </p>
        <h3>3.2</h3>
        <p>
          Therapists on our platform are independent practitioners. Ealho facilitates the relationship
          but is not responsible for clinical decisions.
        </p>
        <h3>3.3</h3>
        <p>
          Ealho Therapy is not a crisis service. If you are in immediate danger, please contact
          emergency services or the Suicide Prevention Helpline Nigeria:{" "}
          <a href="tel:08008002000">0800-800-2000</a>.
        </p>
      </section>

      <section id="patient-obligations" className="scroll-mt-24">
        <h2>4. Patient obligations</h2>
        <ul>
          <li>You must be 18 or older to use this platform</li>
          <li>Provide accurate information during registration</li>
          <li>Attend or cancel sessions with adequate notice (minimum 24 hours)</li>
          <li>Treat therapists with respect</li>
          <li>Not record sessions without therapist consent</li>
        </ul>
      </section>

      <section id="payments" className="scroll-mt-24">
        <h2>5. Payments and refunds</h2>
        <p>
          <strong>5.1</strong> Sessions are paid in full at time of booking.
        </p>
        <p>
          <strong>5.2</strong> Cancellations made more than 24 hours before a session are eligible for
          a credit refund to your Ealho account.
        </p>
        <p>
          <strong>5.3</strong> Cancellations within 24 hours are non-refundable except at therapist
          discretion.
        </p>
        <p>
          <strong>5.4</strong> In the event of technical failure preventing session delivery, a full
          credit will be issued.
        </p>
      </section>

      <section id="ai-notes" className="scroll-mt-24">
        <h2>6. AI-generated notes</h2>
        <p>
          <strong>6.1</strong> Session notes are generated using artificial intelligence. These notes
          are a clinical tool for your therapist&apos;s use.
        </p>
        <p>
          <strong>6.2</strong> Notes are visible only to your treating therapist. Patients do not have
          access to AI-generated session notes.
        </p>
        <p>
          <strong>6.3</strong> You consent to AI-assisted note generation at the time of booking.
        </p>
      </section>

      <section id="confidentiality" className="scroll-mt-24">
        <h2>7. Confidentiality</h2>
        <p>
          <strong>7.1</strong> All sessions are confidential.
        </p>
        <p>
          <strong>7.2</strong> Confidentiality may be broken only where:
        </p>
        <ul>
          <li>Required by law or court order</li>
          <li>There is imminent risk of harm to you or others</li>
          <li>You have given explicit written consent</li>
        </ul>
      </section>

      <section id="liability" className="scroll-mt-24">
        <h2>8. Limitation of liability</h2>
        <p>
          Ealho Therapy&apos;s liability is limited to the value of sessions booked. We are not liable
          for clinical outcomes or decisions made by therapists.
        </p>
      </section>

      <section id="law" className="scroll-mt-24">
        <h2>9. Governing law</h2>
        <p>These Terms are governed by the laws of Nigeria.</p>
      </section>

      <section id="contact-terms" className="scroll-mt-24">
        <h2>10. Contact</h2>
        <p>
          <a href="mailto:legal@ealhohq.com">legal@ealhohq.com</a>
        </p>
      </section>
    </>
  );
}
