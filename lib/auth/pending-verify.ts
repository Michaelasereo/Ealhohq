/** sessionStorage keys for /auth/verify flows (signup + login recovery). */

export const SK = {
  email: "pending_verify_email",
  name: "pending_verify_name",
  password: "pending_verify_password",
  role: "pending_verify_role",
  phone: "pending_verify_phone",
  flow: "pending_verify_flow",
  /** JSON string array of consent type keys for NDPA audit after OTP */
  consentTypes: "pending_verify_consent_types",
} as const;

export type PendingVerifyFlow = "signup" | "login";
