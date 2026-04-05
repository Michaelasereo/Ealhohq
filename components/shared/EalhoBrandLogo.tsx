import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/** Official Ealho logo — 112×112 display box on md+ desktop (`object-contain` preserves SVG aspect). */
export function EalhoBrandLogo({
  className,
  imgClassName,
}: {
  className?: string;
  imgClassName?: string;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "flex shrink-0 items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Image
        src="/Ealho-logo.svg"
        alt="Ealho"
        width={115}
        height={42}
        className={cn(
          "h-7 w-auto max-w-[min(7.5rem,calc(100%-5rem))] object-contain object-left",
          "md:size-28 md:max-w-none",
          imgClassName,
        )}
        priority
        unoptimized
      />
    </Link>
  );
}
