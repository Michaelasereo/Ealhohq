"use client";

import {
  BarChart3,
  FileSpreadsheet,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** String keys so Server Components can pass icons without passing component references. */
const EMPTY_STATE_ICONS = {
  "bar-chart": BarChart3,
  spreadsheet: FileSpreadsheet,
  sliders: SlidersHorizontal,
  users: Users,
} as const;

export type PartnerWorkspaceEmptyStateIcon = keyof typeof EMPTY_STATE_ICONS;

type Props = {
  icon: PartnerWorkspaceEmptyStateIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  className?: string;
};

export function PartnerWorkspaceEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: Props) {
  const Icon = EMPTY_STATE_ICONS[icon];

  return (
    <Card
      className={cn(
        "border-dashed border-muted-foreground/25 bg-muted/20",
        className,
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
          <Icon className="size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="text-base leading-relaxed">{description}</CardDescription>
      </CardHeader>
      {action ? (
        <CardContent className="pt-0">
          <Link
            href={action.href}
            className={buttonVariants({
              variant: "default",
              className: "inline-flex min-h-12 px-4",
            })}
          >
            {action.label}
          </Link>
        </CardContent>
      ) : null}
    </Card>
  );
}
