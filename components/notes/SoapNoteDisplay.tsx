"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export type NoteType = "soap" | "intake";

export type SoapNoteDisplayProps = {
  note: Record<string, unknown>;
  noteType: NoteType;
};

function isNotReported(v: unknown): boolean {
  const s = String(v ?? "").trim();
  return !s || s.toLowerCase() === "not reported";
}

function ClinicalLine({ children }: { children: React.ReactNode }) {
  const s = String(children ?? "");
  if (isNotReported(s)) {
    return (
      <span className="italic text-muted-foreground">Not reported</span>
    );
  }
  return <span className="text-foreground">{children}</span>;
}

function ClinicalBlock({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <p className="italic text-muted-foreground">Not reported</p>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p className="italic text-muted-foreground">Not reported</p>;
    }
    return (
      <ul className="list-inside list-disc space-y-1 text-sm">
        {value.map((x, i) => (
          <li key={i}>
            <ClinicalLine>{String(x)}</ClinicalLine>
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    return (
      <pre className="overflow-x-auto rounded-md bg-muted/50 p-2 text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  return (
    <p className="text-sm">
      <ClinicalLine>{String(value)}</ClinicalLine>
    </p>
  );
}

function riskLooksElevated(risk: Record<string, unknown> | undefined): boolean {
  if (!risk) return false;
  const level = String(risk.overall_risk_level ?? "").toLowerCase();
  if (level && !isNotReported(level)) {
    if (
      /no\s*(current\s*)?risk|low|none|minimal|not\s*elevated/.test(level)
    ) {
      return false;
    }
    if (/moderate|high|severe|imminent|concern|yes|present/.test(level)) {
      return true;
    }
  }
  const text = JSON.stringify(risk).toLowerCase();
  return (
    /suicid|self-harm|harm to others|homicid|ideation|plan|intent/.test(
      text,
    ) && !/no\s|denies|negative|not reported/.test(text.slice(0, 80))
  );
}

function SoapRiskCard({ risk }: { risk: Record<string, unknown> | undefined }) {
  const elevated = riskLooksElevated(risk);
  return (
    <div
      className={cn(
        "rounded-xl border-2 p-4 print:break-inside-avoid",
        elevated
          ? "border-destructive/70 bg-destructive/5"
          : "border-border bg-card",
      )}
    >
      <h3 className="mb-3 text-xs font-bold tracking-wide text-destructive uppercase">
        Risk assessment
      </h3>
      <dl className="grid gap-2 text-sm">
        {(
          [
            ["Suicidality", risk?.suicidality],
            ["Self-harm", risk?.self_harm],
            ["Harm to others", risk?.harm_to_others],
            ["Overall risk level", risk?.overall_risk_level],
          ] as const
        ).map(([label, val]) => (
          <div key={label} className="grid gap-0.5">
            <dt className="text-xs font-medium text-muted-foreground">
              {label}
            </dt>
            <dd>
              <ClinicalBlock value={val} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function SoapNoteDisplay({ note, noteType }: SoapNoteDisplayProps) {
  if (noteType === "soap") {
    const meta = (note.session_metadata as Record<string, unknown>) ?? {};
    const sub = (note.subjective as Record<string, unknown>) ?? {};
    const obj = (note.objective as Record<string, unknown>) ?? {};
    const ass = (note.assessment as Record<string, unknown>) ?? {};
    const risk = ass.risk_assessment as Record<string, unknown> | undefined;
    const plan = (note.plan as Record<string, unknown>) ?? {};
    const hw = (sub.homework_completion as Record<string, unknown>) ?? {};

    return (
      <article className="mx-auto max-w-3xl space-y-4 print:text-black">
        <header className="rounded-xl border border-border bg-card p-4 print:break-inside-avoid">
          <h1 className="text-lg font-semibold">SOAP progress note</h1>
          <dl className="mt-2 grid gap-1 text-sm text-muted-foreground">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>
                Date:{" "}
                <ClinicalLine>{String(meta.date ?? "")}</ClinicalLine>
              </span>
              <span>
                Session:{" "}
                <ClinicalLine>
                  {String(meta.session_number ?? "")}
                </ClinicalLine>
              </span>
              <span>
                Client ID:{" "}
                <ClinicalLine>{String(meta.client_id ?? "")}</ClinicalLine>
              </span>
            </div>
          </dl>
        </header>

        <SoapRiskCard risk={risk} />

        <Accordion
          multiple
          defaultValue={["subjective", "objective", "assessment_rest", "plan"]}
          className="rounded-xl border border-border bg-card px-2"
        >
          <AccordionItem value="subjective">
            <AccordionTrigger>Subjective</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Mood (score)
                </p>
                <ClinicalBlock value={sub.mood_score} />
                <ClinicalBlock value={sub.mood_description} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Key themes
                </p>
                <ClinicalBlock value={sub.key_themes} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Updates since last session
                </p>
                <ClinicalBlock value={sub.updates_since_last_session} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Homework
                </p>
                <ClinicalBlock value={hw.assigned_last_session} />
                <ClinicalBlock value={hw.completed} />
                <ClinicalBlock value={hw.client_response} />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="objective">
            <AccordionTrigger>Objective</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <ClinicalBlock value={obj.appearance_and_presentation} />
              <ClinicalBlock value={obj.affect_observed} />
              <ClinicalBlock value={obj.behavior_during_session} />
              <ClinicalBlock value={obj.nonverbal_cues} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="assessment_rest">
            <AccordionTrigger>Assessment (clinical)</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <ClinicalBlock value={ass.clinical_impression} />
              <ClinicalBlock value={ass.progress_toward_goals} />
              <ClinicalBlock value={ass.goal_status} />
              <ClinicalBlock value={ass.emerging_patterns} />
              <ClinicalBlock value={ass.diagnostic_observations} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="plan">
            <AccordionTrigger>Plan</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <ClinicalBlock value={plan.interventions_used} />
              <ClinicalBlock value={plan.client_response_to_interventions} />
              <ClinicalBlock value={plan.homework_assigned} />
              <ClinicalBlock value={plan.smart_goals} />
              <ClinicalBlock value={plan.goals_for_next_session} />
              <ClinicalBlock value={plan.referrals_or_escalations} />
              <ClinicalBlock value={plan.next_session_date} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </article>
    );
  }

  const meta = (note.session_metadata as Record<string, unknown>) ?? {};
  const profile = (note.client_profile as Record<string, unknown>) ?? {};
  const complaint = (note.presenting_complaint as Record<string, unknown>) ?? {};
  const personal = (note.personal_history as Record<string, unknown>) ?? {};
  const family = (note.family_history as Record<string, unknown>) ?? {};
  const mse = (note.mental_status_examination as Record<string, unknown>) ?? {};
  const formulation =
    (note.clinical_formulation as Record<string, unknown>) ?? {};
  const risk = (note.risk_assessment as Record<string, unknown>) ?? {};
  const diagnosis = (note.provisional_diagnosis as Record<string, unknown>) ?? {};
  const plan = (note.initial_treatment_plan as Record<string, unknown>) ?? {};
  const sig = (note.significant_other_interview as Record<string, unknown>) ?? {};

  return (
    <article className="mx-auto max-w-3xl space-y-4 print:text-black">
      <header className="rounded-xl border border-border bg-card p-4 print:break-inside-avoid">
        <h1 className="text-lg font-semibold">Intake assessment</h1>
        <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>
            Date: <ClinicalLine>{String(meta.date ?? "")}</ClinicalLine>
          </span>
          <span>
            Client ID:{" "}
            <ClinicalLine>{String(meta.client_id ?? "")}</ClinicalLine>
          </span>
        </dl>
      </header>

      <SoapRiskCard risk={risk} />

      <Accordion
        multiple
        defaultValue={[
          "profile",
          "complaint",
          "mse",
          "formulation",
          "diagnosis",
          "plan",
          "sig",
        ]}
        className="rounded-xl border border-border bg-card px-2"
      >
        <AccordionItem value="profile">
          <AccordionTrigger>Client profile</AccordionTrigger>
          <AccordionContent className="space-y-2">
            {Object.entries(profile).map(([k, v]) => (
              <div key={k}>
                <p className="text-xs font-medium capitalize text-muted-foreground">
                  {k.replaceAll("_", " ")}
                </p>
                <ClinicalBlock value={v} />
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="complaint">
          <AccordionTrigger>Presenting complaint</AccordionTrigger>
          <AccordionContent className="space-y-2">
            {Object.entries(complaint).map(([k, v]) => (
              <div key={k}>
                <p className="text-xs font-medium capitalize text-muted-foreground">
                  {k.replaceAll("_", " ")}
                </p>
                <ClinicalBlock value={v} />
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="personal">
          <AccordionTrigger>Personal history</AccordionTrigger>
          <AccordionContent className="space-y-2">
            {Object.entries(personal).map(([k, v]) => (
              <div key={k}>
                <p className="text-xs font-medium capitalize text-muted-foreground">
                  {k.replaceAll("_", " ")}
                </p>
                <ClinicalBlock value={v} />
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="family">
          <AccordionTrigger>Family history</AccordionTrigger>
          <AccordionContent className="space-y-2">
            {Object.entries(family).map(([k, v]) => (
              <div key={k}>
                <p className="text-xs font-medium capitalize text-muted-foreground">
                  {k.replaceAll("_", " ")}
                </p>
                <ClinicalBlock value={v} />
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="mse">
          <AccordionTrigger>Mental status examination</AccordionTrigger>
          <AccordionContent className="space-y-2">
            {Object.entries(mse).map(([k, v]) => (
              <div key={k}>
                <p className="text-xs font-medium capitalize text-muted-foreground">
                  {k.replaceAll("_", " ")}
                </p>
                <ClinicalBlock value={v} />
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="formulation">
          <AccordionTrigger>Clinical formulation</AccordionTrigger>
          <AccordionContent className="space-y-2">
            {Object.entries(formulation).map(([k, v]) => (
              <div key={k}>
                <p className="text-xs font-medium capitalize text-muted-foreground">
                  {k.replaceAll("_", " ")}
                </p>
                <ClinicalBlock value={v} />
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="diagnosis">
          <AccordionTrigger>Provisional diagnosis</AccordionTrigger>
          <AccordionContent className="space-y-2">
            {Object.entries(diagnosis).map(([k, v]) => (
              <div key={k}>
                <p className="text-xs font-medium capitalize text-muted-foreground">
                  {k.replaceAll("_", " ")}
                </p>
                <ClinicalBlock value={v} />
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="plan">
          <AccordionTrigger>Initial treatment plan</AccordionTrigger>
          <AccordionContent className="space-y-2">
            {Object.entries(plan).map(([k, v]) => (
              <div key={k}>
                <p className="text-xs font-medium capitalize text-muted-foreground">
                  {k.replaceAll("_", " ")}
                </p>
                <ClinicalBlock value={v} />
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sig">
          <AccordionTrigger>Significant other interview</AccordionTrigger>
          <AccordionContent className="space-y-2">
            {Object.entries(sig).map(([k, v]) => (
              <div key={k}>
                <p className="text-xs font-medium capitalize text-muted-foreground">
                  {k.replaceAll("_", " ")}
                </p>
                <ClinicalBlock value={v} />
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </article>
  );
}
