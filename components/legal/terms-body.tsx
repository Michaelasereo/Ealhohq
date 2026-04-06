export const termsToc = [
  { id: "agreement", title: "1. Agreement" },
  { id: "who-we-are", title: "2. Who we are" },
  { id: "the-service", title: "3. The service" },
  { id: "patient-obligations", title: "4. Client obligations" },
  { id: "payments", title: "5. Cancellation and rescheduling policy" },
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
          Ealho Therapy is a digital mental health platform connecting clients with licensed
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
        <h2>4. Client obligations</h2>
        <ul>
          <li>You must be 18 or older to use this platform</li>
          <li>Provide accurate information during registration</li>
          <li>Attend or cancel sessions with adequate notice (minimum 24 hours)</li>
          <li>Treat therapists with respect</li>
          <li>Not record sessions without therapist consent</li>
        </ul>
      </section>

      <section id="payments" className="scroll-mt-24">
        <h2>5. Cancellation and rescheduling policy</h2>
        <h3>5.1 Cancellations by clients</h3>
        <ul>
          <li>
            <strong>More than 24 hours before the session:</strong> full credit refund to your Ealho
            account. If you paid by card, the refund is processed within 5–7 business days.
          </li>
          <li>
            <strong>Between 2 and 24 hours before the session:</strong> 50% credit refund (0.5 session
            credit) for bookings paid with credits. No cash refunds in this window.
          </li>
          <li>
            <strong>Less than 2 hours before the session:</strong> no refund. Session credit or payment
            is forfeited.
          </li>
          <li>
            <strong>No-shows:</strong> no refund. The session is forfeited.
          </li>
        </ul>
        <h3>5.2 Rescheduling by clients</h3>
        <ul>
          <li>Rescheduling is allowed up to 2 hours before the session start time.</li>
          <li>
            Rescheduling is treated as a cancellation plus a new booking time on the same booking
            record. If you reschedule more than 24 hours before the original start, there is no
            additional charge beyond what you already paid.
          </li>
          <li>Maximum of two reschedules per booking.</li>
        </ul>
        <h3>5.3 Cancellations by therapists</h3>
        <p>
          If your therapist cancels less than 24 hours before a session, you receive a full refund
          where applicable plus one complimentary session credit. Ealho will contact you to help
          arrange continuity of care where possible.
        </p>
        <h3>5.4 Ealho platform cancellations</h3>
        <p>
          If a session cannot be delivered because of a platform issue on our side, you receive a full
          refund where applicable plus one complimentary session credit.
        </p>
      </section>

      <section id="ai-notes" className="scroll-mt-24">
        <h2>6. AI-generated notes</h2>
        <p>
          <strong>6.1</strong> Session notes are generated using artificial intelligence. These notes
          are a clinical tool for your therapist&apos;s use.
        </p>
        <p>
          <strong>6.2</strong> Notes are visible only to your treating therapist. Clients do not have
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
