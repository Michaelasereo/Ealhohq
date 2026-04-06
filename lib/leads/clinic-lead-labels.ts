import type { CITY_VALUES, ROLE_VALUES, TEAM_SIZE_VALUES } from "./clinic-lead-schema";

export const ROLE_LABELS: Record<(typeof ROLE_VALUES)[number], string> = {
  psychiatrist: "Psychiatrist",
  psychologist: "Psychologist",
  gp: "General Practitioner",
  therapist: "Therapist / Counsellor",
  clinic_owner: "Clinic Owner / Director",
  hospital_admin: "Hospital Administrator",
  telemedicine: "Telemedicine Platform",
  other: "Other",
};

export const CITY_LABELS: Record<(typeof CITY_VALUES)[number], string> = {
  lagos: "Lagos",
  abuja: "Abuja",
  port_harcourt: "Port Harcourt",
  ibadan: "Ibadan",
  kano: "Kano",
  other: "Other",
};

export const TEAM_SIZE_LABELS: Record<(typeof TEAM_SIZE_VALUES)[number], string> = {
  solo: "Just me",
  "2_5": "2 – 5",
  "6_15": "6 – 15",
  "16_50": "16 – 50",
  "50_plus": "50+",
};

export const INTEREST_LABELS: Record<
  "staff_therapy" | "notes_ai" | "referral" | "white_label",
  string
> = {
  staff_therapy: "Therapy sessions for my staff",
  notes_ai: "Ealho Notes AI for my clinic",
  referral: "Client referral partnership",
  white_label: "White-label platform",
};
