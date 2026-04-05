/**
 * SOAP / intake shapes for UI — final schema comes from the API + Pydantic on the backend.
 */
export type SoapNoteSections = {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  risk?: string;
};

export type IntakeAssessment = {
  summary?: string;
  presentingConcerns?: string;
  riskScreening?: string;
};
