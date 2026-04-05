"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type LegalTocItem = { id: string; title: string };

type LegalLayoutProps = {
  title: string;
  lastUpdated: string;
  toc: LegalTocItem[];
  children: ReactNode;
};

export function LegalLayout({
  title,
  lastUpdated,
  toc,
  children,
}: LegalLayoutProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background pb-16 print:bg-white print:pb-0">
      <div className="border-b border-border bg-muted/30 print:hidden">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-foreground hover:underline"
          >
            <ArrowLeft className="size-4 shrink-0" strokeWidth={1.5} />
            Back to home
          </Link>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11"
              onClick={handlePrint}
            >
              <Printer className="mr-2 size-4" strokeWidth={1.5} />
              Print
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-11"
              onClick={handlePrint}
            >
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 pt-8 sm:px-6 lg:grid lg:grid-cols-[minmax(200px,260px)_1fr] lg:gap-12 lg:pt-12">
        <aside className="mb-10 lg:mb-0 print:hidden">
          <div className="lg:sticky lg:top-24">
            <p className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide">
              On this page
            </p>
            <nav aria-label="Table of contents">
              <ul className="space-y-2 border-l border-border pl-3 text-sm">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="text-muted-foreground hover:text-foreground block py-1 transition-colors"
                    >
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>

        <article
          className={cn(
            "mx-auto w-full max-w-[720px] pb-8",
            "prose prose-lg max-w-none leading-relaxed text-foreground",
            "prose-headings:scroll-mt-24 prose-headings:font-semibold prose-headings:tracking-tight",
            "prose-p:text-[17px] prose-p:leading-relaxed prose-li:leading-relaxed",
            "prose-a:text-primary prose-a:underline",
            "print:prose-headings:break-after-avoid",
          )}
        >
          <header className="not-prose mb-10 border-b border-border pb-8">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h1>
            <p className="text-muted-foreground mt-3 text-sm">
              Last updated: {lastUpdated}
            </p>
          </header>
          {children}
        </article>
      </div>

    </div>
  );
}
