/** Minimal SOAP progress note shell for manual entry (WAT / therapy project). */
export function emptySoapProgressNote(): Record<string, unknown> {
  return {
    document_type: "soap_progress_note",
    subjective: {
      mood_score: null,
      mood_description: "",
      key_themes: [] as string[],
    },
    objective: {
      appearance_and_presentation: "",
    },
    assessment: {
      clinical_impression: "",
      risk_assessment: {
        level: "Not reported",
        notes: "",
      },
    },
    plan: {
      interventions_used: [] as string[],
      homework_assigned: "",
    },
  };
}
