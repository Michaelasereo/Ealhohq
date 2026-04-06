export const PROFESSIONAL_TYPES = [
  {
    group: "Medical Doctors",
    options: [
      "Medical Doctor — Consultant / Professor",
      "Medical Doctor — Registrar / Senior Resident",
      "Medical Doctor — Resident / House Officer",
      "Medical Doctor — Intern / NYSC Doctor",
    ],
  },
  {
    group: "Nursing & Midwifery",
    options: [
      "Nurse — Senior / Matron",
      "Nurse — Staff Nurse",
      "Midwife",
      "Nursing Student",
    ],
  },
  {
    group: "Allied Health",
    options: [
      "Pharmacist",
      "Physiotherapist",
      "Dentist / Oral Health",
      "Radiographer",
      "Medical Laboratory Scientist",
      "Optometrist",
      "Dietitian / Nutritionist",
    ],
  },
  {
    group: "Mental Health",
    options: ["Psychiatrist", "Psychologist", "Therapist / Counsellor"],
  },
  {
    group: "Other",
    options: [
      "Medical Student",
      "Other Healthcare Worker",
      "Non-healthcare professional",
      "Prefer not to say",
    ],
  },
] as const;
