export const privacyToc = [
  { id: "introduction", title: "1. Introduction" },
  { id: "information-we-collect", title: "2. Information we collect" },
  { id: "how-we-use", title: "3. How we use your information" },
  { id: "storage-security", title: "4. Data storage and security" },
  { id: "retention", title: "5. Data retention" },
  { id: "sharing", title: "6. Sharing your information" },
  { id: "rights", title: "7. Your rights under the NDPA 2023" },
  { id: "anonymous", title: "8. Anonymous sessions" },
  { id: "children", title: "9. Children’s data" },
  { id: "cross-border", title: "10. Cross-border data transfers" },
  { id: "breach", title: "11. Data breach notification" },
  { id: "changes", title: "12. Changes to this policy" },
  { id: "contact", title: "13. Contact us" },
] as const;

export function PrivacyBody() {
  return (
    <>
      <section id="introduction" className="scroll-mt-24">
        <h2>1. Introduction</h2>
        <p>
          Ealho Therapy (operated by Ealho Technologies) is committed to protecting your personal
          information. This Privacy Policy explains how we collect, use, store, and protect your data
          when you use our platform.
        </p>
        <p>
          We operate in compliance with the Nigeria Data Protection Act 2023 (NDPA) and the
          guidelines of the Nigeria Data Protection Commission (NDPC).
        </p>
      </section>

      <section id="information-we-collect" className="scroll-mt-24">
        <h2>2. Information we collect</h2>
        <h3>2.1 Information you provide directly</h3>
        <ul>
          <li>Name, email address, phone number</li>
          <li>
            For therapists: professional qualifications, specializations, and practice details
          </li>
          <li>
            Payment information (processed securely by our payment provider — we never store card
            details)
          </li>
          <li>Session booking details and preferences</li>
          <li>Communications you send us</li>
        </ul>

        <h3 id="session-data">2.2 Session-related information</h3>
        <ul>
          <li>
            Session audio is processed in real time and permanently deleted immediately after
            processing. We do not store audio recordings.
          </li>
          <li>
            Session transcripts are used solely to generate clinical notes and are permanently
            deleted once note generation is confirmed. Transcripts are never stored long-term.
          </li>
          <li>
            Clinical session notes are generated and stored securely. Notes are accessible only to
            the treating therapist and are protected by strict access controls.
          </li>
          <li>
            Session metadata (date, duration, session number) is retained for scheduling and
            clinical continuity.
          </li>
        </ul>

        <h3>2.3 Technical information</h3>
        <ul>
          <li>Device type, browser, and IP address (for security and fraud prevention)</li>
          <li>Usage data to improve platform performance</li>
        </ul>
      </section>

      <section id="how-we-use" className="scroll-mt-24">
        <h2>3. How we use your information</h2>
        <p>We process your data for the following purposes:</p>
        <ul>
          <li>Providing therapy session scheduling and delivery</li>
          <li>Generating clinical documentation to support therapist workflow</li>
          <li>Processing payments for booked sessions</li>
          <li>Sending session confirmations and reminders</li>
          <li>Ensuring platform security and preventing fraud</li>
          <li>Complying with legal and regulatory obligations</li>
          <li>Improving our platform and services</li>
        </ul>
        <p>
          <strong>Legal basis:</strong> We process your data based on your explicit consent given at
          the time of booking or registration, and where necessary for the performance of services
          you have requested.
        </p>
      </section>

      <section id="storage-security" className="scroll-mt-24">
        <h2>4. Data storage and security</h2>
        <p>
          Your data is stored on secure cloud infrastructure with data centers located in the
          European Union. We use industry-standard security measures including:
        </p>
        <ul>
          <li>Data encryption at rest and in transit</li>
          <li>Strict access controls — staff access is limited to what is necessary for their role</li>
          <li>Regular security reviews</li>
          <li>Secure development practices</li>
        </ul>
        <p>
          Clinical session notes are accessible only to your treating therapist. No other party —
          including Ealho staff — has access to the content of your session notes.
        </p>
      </section>

      <section id="retention" className="scroll-mt-24">
        <h2>5. Data retention</h2>
        <p>We retain your data for the following periods:</p>
        <div className="not-prose my-6 overflow-x-auto">
          <table className="w-full min-w-[280px] border-collapse border border-border text-left text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="border border-border p-3 font-medium">Data type</th>
                <th className="border border-border p-3 font-medium">Retention period</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border p-3">Session audio</td>
                <td className="border border-border p-3">Deleted immediately after processing</td>
              </tr>
              <tr>
                <td className="border border-border p-3">Session transcripts</td>
                <td className="border border-border p-3">Deleted within minutes of note generation</td>
              </tr>
              <tr>
                <td className="border border-border p-3">Clinical session notes</td>
                <td className="border border-border p-3">Retained for 7 years (clinical standard)</td>
              </tr>
              <tr>
                <td className="border border-border p-3">Account information</td>
                <td className="border border-border p-3">While account is active + 2 years</td>
              </tr>
              <tr>
                <td className="border border-border p-3">Payment records</td>
                <td className="border border-border p-3">7 years (statutory requirement)</td>
              </tr>
              <tr>
                <td className="border border-border p-3">Communication logs</td>
                <td className="border border-border p-3">1 year</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          You may request deletion of your account and associated data at any time (see Section 7).
          Note: clinical records may be retained longer where required by law or professional
          standards.
        </p>
      </section>

      <section id="sharing" className="scroll-mt-24">
        <h2>6. Sharing your information</h2>
        <p>We do not sell your personal data. We do not share your data with advertisers.</p>
        <p>
          We share limited data with the following categories of service providers to operate our
          platform:
        </p>
        <ul>
          <li>Secure cloud infrastructure providers (for data storage and platform hosting)</li>
          <li>Payment processors (for transaction processing)</li>
          <li>Communication service providers (for sending session links and reminders)</li>
          <li>Video conferencing infrastructure (for secure session delivery)</li>
        </ul>
        <p>
          All service providers are contractually bound to protect your data and may only use it for
          the specific purposes we have authorised.
        </p>
        <p>We may disclose your information where required by Nigerian law or a valid court order.</p>
      </section>

      <section id="rights" className="scroll-mt-24">
        <h2>7. Your rights under the NDPA 2023</h2>
        <p>As a data subject under the Nigeria Data Protection Act 2023, you have the right to:</p>
        <ul>
          <li>
            <strong>Access:</strong> Request a copy of the data we hold about you
          </li>
          <li>
            <strong>Correction:</strong> Request correction of inaccurate data
          </li>
          <li>
            <strong>Deletion:</strong> Request deletion of your data (subject to legal retention
            requirements)
          </li>
          <li>
            <strong>Portability:</strong> Receive your data in a portable format
          </li>
          <li>
            <strong>Withdrawal of consent:</strong> Withdraw consent for processing at any time
          </li>
          <li>
            <strong>Objection:</strong> Object to certain types of processing
          </li>
          <li>
            <strong>Complaint:</strong> Lodge a complaint with the Nigeria Data Protection Commission
            (ndpc.gov.ng)
          </li>
        </ul>
        <p>
          To exercise any of these rights, contact us at:{" "}
          <a href="mailto:privacy@ealhohq.com">privacy@ealhohq.com</a>
        </p>
        <p>We will respond to all requests within 30 days.</p>
      </section>

      <section id="anonymous" className="scroll-mt-24">
        <h2>8. Anonymous sessions</h2>
        <p>
          We offer an anonymous booking option for patients who prefer additional privacy. When you
          book anonymously:
        </p>
        <ul>
          <li>You provide a chosen alias instead of your real name</li>
          <li>Your therapist sees only your alias and a session reference number</li>
          <li>
            Your real identity is never disclosed to your therapist unless you choose to share it
          </li>
          <li>
            Your email is used solely to deliver your session link and is handled with the same
            security as all other data
          </li>
        </ul>
      </section>

      <section id="children" className="scroll-mt-24">
        <h2>9. Children&apos;s data</h2>
        <p>
          Our platform is not intended for users under 18. We do not knowingly collect data from
          minors. If you believe a minor has registered, please contact us immediately.
        </p>
      </section>

      <section id="cross-border" className="scroll-mt-24">
        <h2>10. Cross-border data transfers</h2>
        <p>
          Our infrastructure is located outside Nigeria. Where we transfer your data internationally,
          we ensure adequate protections are in place in accordance with the NDPA 2023, including
          contractual safeguards with our service providers.
        </p>
      </section>

      <section id="breach" className="scroll-mt-24">
        <h2>11. Data breach notification</h2>
        <p>
          In the event of a data breach that poses a risk to your rights and freedoms, we will notify
          you and the Nigeria Data Protection Commission within 72 hours of becoming aware of the
          breach, as required by the NDPA 2023.
        </p>
      </section>

      <section id="changes" className="scroll-mt-24">
        <h2>12. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of significant
          changes by email. Continued use of the platform after changes constitutes acceptance.
        </p>
      </section>

      <section id="contact" className="scroll-mt-24">
        <h2>13. Contact us</h2>
        <p>For all privacy-related queries:</p>
        <p>
          Email: <a href="mailto:privacy@ealhohq.com">privacy@ealhohq.com</a>
        </p>
        <p>Ealho Technologies Limited</p>
        <p>Lagos, Nigeria</p>
      </section>
    </>
  );
}
