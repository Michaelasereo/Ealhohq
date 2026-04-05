import { randomInt } from "crypto";

/** 6-digit code: inclusive 100000–999999 (`randomInt` max is exclusive). */
export function generateOTP(): string {
  return randomInt(100000, 1_000_000).toString();
}

export function getOTPExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10);
  return expiry;
}
