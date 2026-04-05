import { z } from "zod";

export const ROLE_VALUES = [
  "psychiatrist",
  "psychologist",
  "gp",
  "therapist",
  "clinic_owner",
  "hospital_admin",
  "telemedicine",
  "other",
] as const;

export const CITY_VALUES = [
  "lagos",
  "abuja",
  "port_harcourt",
  "ibadan",
  "kano",
  "other",
] as const;

export const TEAM_SIZE_VALUES = ["solo", "2_5", "6_15", "16_50", "50_plus"] as const;

export const INTEREST_IDS = [
  "staff_therapy",
  "notes_ai",
  "referral",
  "white_label",
] as const;

const roleEnum = z.enum(ROLE_VALUES);
const cityEnum = z.enum(CITY_VALUES);
const teamEnum = z.enum(TEAM_SIZE_VALUES);
const interestEnum = z.enum(INTEREST_IDS);

export const clinicLeadSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  role: z
    .string()
    .min(1, "Please select your role")
    .refine((r): r is z.infer<typeof roleEnum> => roleEnum.safeParse(r).success, {
      message: "Please select your role",
    }),
  clinicName: z.string().min(2, "Clinic name is required"),
  city: z
    .string()
    .min(1, "Please select your city")
    .refine((c): c is z.infer<typeof cityEnum> => cityEnum.safeParse(c).success, {
      message: "Please select your city",
    }),
  teamSize: z
    .string()
    .min(1, "Please select team size")
    .refine((t): t is z.infer<typeof teamEnum> => teamEnum.safeParse(t).success, {
      message: "Please select team size",
    }),
  interests: z
    .array(interestEnum)
    .min(1, "Please select at least one interest"),
  whatsapp: z
    .string()
    .min(10, "Enter a valid WhatsApp number")
    .max(20, "Number too long"),
});

export type ClinicLeadInput = z.infer<typeof clinicLeadSchema>;
