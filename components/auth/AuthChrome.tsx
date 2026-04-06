"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Hero-matching page background + centered Ealho logo above auth card(s). */
export function AuthChrome({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-screen w-full bg-[var(--figma-bg-hero)]">
      <div
        className={cn(
          "mx-auto flex min-h-screen w-full max-w-[375px] flex-col justify-center px-4 py-8",
          className,
        )}
      >
        <div className="mb-8 flex shrink-0 justify-center">
          <Link
            href="/"
            className="inline-flex"
            aria-label="Ealho Therapy home"
          >
            <Image
              src="/Ealho-logo.svg"
              alt=""
              width={138}
              height={50}
              priority
              className="h-10 w-auto sm:h-11"
              style={{ width: "auto", height: "auto" }}
            />
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
