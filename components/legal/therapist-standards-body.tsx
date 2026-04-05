export const therapistStandardsToc = [
  { id: "vetting", title: "1. Our vetting process" },
  { id: "obligations", title: "2. Therapist obligations" },
  { id: "ai-docs", title: "3. AI-assisted documentation" },
  { id: "patient-data", title: "4. Patient data handling" },
  { id: "accountability", title: "5. Accountability and removal" },
  { id: "payments-therapists", title: "6. Payments to therapists" },
] as const;

export function TherapistStandardsBody() {
  return (
    <>
      <section id="vetting" className="scroll-mt-24">
        <h2>1. Our vetting process</h2>
        <p>Every therapist on Ealho goes through a structured review before being approved:</p>
        <h3>Step 1 — Application review</h3>
        <p>
          Therapists submit professional credentials, qualifications, areas of specialisation, and a
          professional bio for review by the Ealho clinical team.
        </p>
        <h3>Step 2 — Credential verification</h3>
        <p>
          We verify professional qualifications against Nigerian licensing bodies including the
          Medical and Dental Council of Nigeria (MDCN) and the Association of Psychiatrists in
          Nigeria (APN) where applicable.
        </p>
        <h3>Step 3 — Approval</h3>
        <p>
          Only therapists who meet our standards are approved. Approval decisions are made by the
          Ealho clinical review team and are final.
        </p>
      </section>

      <section id="obligations" className="scroll-mt-24">
        <h2>2. Therapist obligations</h2>
        <p>By joining Ealho, all therapists agree to:</p>
        <ul>
          <li>
            Maintain valid professional registration and notify Ealho immediately if registration
            lapses
          </li>
          <li>Operate within their stated areas of specialisation</li>
          <li>
            Maintain professional confidentiality at all times in accordance with the MDCN Code of
            Conduct
          </li>
          <li>Complete sessions as scheduled or provide adequate notice of cancellation</li>
          <li>Not solicit patients for sessions outside the Ealho platform</li>
          <li>Maintain appropriate professional boundaries</li>
          <li>Comply with all applicable Nigerian laws and professional standards</li>
          <li>Participate in Ealho quality review processes</li>
        </ul>
      </section>

      <section id="ai-docs" className="scroll-mt-24">
        <h2>3. AI-assisted documentation</h2>
        <p>
          Therapists on Ealho use AI-assisted documentation tools to support clinical note-taking.
        </p>
        <p>
          <strong>3.1</strong> AI-generated notes are a clinical support tool. The treating therapist
          is responsible for reviewing, editing, and approving all session notes before they form
          part of a clinical record.
        </p>
        <p>
          <strong>3.2</strong> Therapists must not submit AI-generated notes without review.
        </p>
        <p>
          <strong>3.3</strong> Session audio is processed solely for note generation and is
          immediately and permanently deleted. Therapists do not have access to audio recordings.
        </p>
      </section>

      <section id="patient-data" className="scroll-mt-24">
        <h2>4. Patient data handling</h2>
        <p>Therapists must:</p>
        <ul>
          <li>Access only session notes for patients they are treating</li>
          <li>Not share, export, or reproduce session notes outside of the Ealho platform</li>
          <li>Not attempt to identify anonymous patients</li>
          <li>
            Report any suspected data breach immediately to Ealho at{" "}
            <a href="mailto:privacy@ealhohq.com">privacy@ealhohq.com</a>
          </li>
          <li>Comply with the Nigeria Data Protection Act 2023</li>
        </ul>
      </section>

      <section id="accountability" className="scroll-mt-24">
        <h2>5. Accountability and removal</h2>
        <p>Ealho may suspend or permanently remove a therapist from the platform for:</p>
        <ul>
          <li>Professional misconduct</li>
          <li>Violation of this Code of Practice</li>
          <li>Patient complaints upheld after investigation</li>
          <li>Lapse of professional registration</li>
          <li>Breach of confidentiality or data protection</li>
        </ul>
        <p>
          Complaints about therapists can be submitted to:{" "}
          <a href="mailto:standards@ealhohq.com">standards@ealhohq.com</a>
        </p>
        <p>
          All complaints are investigated by the Ealho clinical team. Therapists are notified and
          given opportunity to respond before any decision is made.
        </p>
      </section>

      <section id="payments-therapists" className="scroll-mt-24">
        <h2>6. Payments to therapists</h2>
        <p>
          Platform fee and payment schedule information is provided separately in the Therapist
          Commercial Agreement.
        </p>
      </section>
    </>
  );
}
