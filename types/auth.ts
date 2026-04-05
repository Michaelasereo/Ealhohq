export type AppRole = "patient" | "therapist" | "admin";

export type TherapistStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

/** Custom JWT claims — source of truth is Supabase `app_metadata` (never trust client-only state). */
export type AppMetadata = {
  role?: AppRole;
  status?: TherapistStatus;
};
