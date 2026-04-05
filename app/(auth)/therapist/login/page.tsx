"use client";

import Link from "next/link";

import { SignInForm } from "@/components/auth/SignInForm";

export default function TherapistLoginPage() {
  return (
    <SignInForm
      title="Therapist sign in"
      description="Log in to your therapist dashboard"
      footer={
        <div className="space-y-3 text-center text-sm">
          <p>
            New to Ealho?{" "}
            <Link
              href="/therapist/enroll"
              className="cursor-pointer font-medium text-primary underline"
            >
              Apply to join
            </Link>
          </p>
          <p className="text-muted-foreground">
            Booking therapy as a patient?{" "}
            <Link href="/login" className="cursor-pointer font-medium text-primary underline">
              Patient log in
            </Link>
          </p>
        </div>
      }
    />
  );
}
