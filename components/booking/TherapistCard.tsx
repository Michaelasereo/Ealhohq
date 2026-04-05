import Image from "next/image";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const PLACEHOLDER = "/Ealho-logo.png";

export type TherapistCardTherapist = {
  id: string;
  profile: { fullName: string };
  profilePhoto: string | null;
  specializations: string[];
  sessionRateFormatted: string;
  sessionDuration: number;
};

export function TherapistCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex gap-3">
        <Skeleton className="size-[52px] shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <Skeleton className="h-12 w-full rounded-md" />
    </div>
  );
}

type Props = {
  therapist: TherapistCardTherapist;
  bookHref: string;
};

export function TherapistCard({ therapist, bookHref }: Props) {
  const src = therapist.profilePhoto || PLACEHOLDER;
  const specs = therapist.specializations.slice(0, 3).join(" · ");
  const remote = Boolean(therapist.profilePhoto?.startsWith("http"));

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex gap-3">
        <div className="relative size-[52px] shrink-0 overflow-hidden rounded-full bg-muted">
          <Image
            src={src}
            alt=""
            width={52}
            height={52}
            unoptimized={remote}
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-tight">
            {therapist.profile.fullName}
          </p>
          {specs ? (
            <p className="mt-1 text-xs text-muted-foreground">{specs}</p>
          ) : null}
          <p className="mt-2 text-sm">
            <span className="font-semibold text-primary">
              {therapist.sessionRateFormatted}
            </span>
            <span className="text-muted-foreground">
              {" "}
              · {therapist.sessionDuration} min
            </span>
          </p>
        </div>
      </div>
      <Link
        href={bookHref}
        className={cn(
          buttonVariants({ variant: "default" }),
          "h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90",
        )}
      >
        Book Session
      </Link>
    </div>
  );
}
