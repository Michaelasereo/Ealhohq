"use client";

import Link from "next/link";

import { SignInForm } from "@/components/auth/SignInForm";

export default function LoginPage() {
  return (
    <SignInForm
      title="Log in"
      description="Sign in to your Ealho Therapy account"
      footer={
        <div className="space-y-3 text-center text-sm">
          <p>
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="cursor-pointer font-medium text-primary underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      }
    />
  );
}
