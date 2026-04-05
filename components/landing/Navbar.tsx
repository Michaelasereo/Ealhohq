"use client";

import { ChevronDown, Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useBookingStore } from "@/stores/bookingStore";

const EALHO_LOGO = "/Ealho-logo.svg";

const SECTION_IDS = ["therapy-services", "notes-ai", "faq"] as const;

const RESOURCE_LINKS = [
  { href: "/#faq", label: "FAQ", external: false },
  { href: "/privacy", label: "Privacy Policy", external: true },
  { href: "/terms", label: "Terms of Service", external: true },
  { href: "/therapist-standards", label: "Therapist Standards", external: true },
] as const;

const navLinkClass =
  "inline-flex min-h-11 items-center rounded-full px-1 text-[15px] font-medium tracking-[-0.02em] text-gray-600 hover:text-gray-600 sm:text-[16px]";

const navLinkActiveClass = "font-semibold";

function ResourcesDropdown({ mobile }: { mobile?: boolean }) {
  return (
    <details
      className={cn("relative", mobile ? "w-full" : "group")}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-0.5 rounded-full px-1 py-2 text-[15px] font-medium tracking-[-0.02em] text-gray-600 hover:text-gray-600 sm:min-h-11 sm:text-[16px] [&::-webkit-details-marker]:hidden",
        )}
      >
        Resources
        <ChevronDown className="size-4 opacity-60" strokeWidth={1.5} aria-hidden />
      </summary>
      <div
        className={cn(
          "z-50 mt-2 min-w-[220px] rounded-xl border border-[#dddbd0] bg-[#e8e6dd] py-2 shadow-md",
          mobile ? "relative" : "absolute left-0 top-full",
        )}
      >
        {RESOURCE_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener noreferrer" : undefined}
            className="block min-h-11 px-4 py-2.5 text-[15px] font-medium text-gray-600 hover:text-gray-600 sm:text-[16px]"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </details>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [activeId, setActiveId] = useState<string>(SECTION_IDS[0]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const setBookingModalOpen = useBookingStore((s) => s.setBookingModalOpen);

  const updateActive = useCallback(() => {
    if (!isHome) return;
    const positions = SECTION_IDS.map((id) => {
      const el = document.getElementById(id);
      if (!el) return { id, top: Infinity };
      const rect = el.getBoundingClientRect();
      return { id, top: Math.abs(rect.top - 120) };
    });
    positions.sort((a, b) => a.top - b.top);
    const best = positions[0];
    if (best && best.top !== Infinity) setActiveId(best.id);
  }, [isHome]);

  useEffect(() => {
    if (!isHome) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5] },
    );

    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });

    window.addEventListener("scroll", updateActive, { passive: true });
    updateActive();

    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", updateActive);
    };
  }, [isHome, updateActive]);

  function sectionActive(id: string) {
    return isHome && activeId === id;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#dddbd0]/90 bg-[#e8e6dd]">
      <div className="mx-auto flex min-h-14 max-w-[1200px] items-center justify-between gap-3 px-4 py-3 sm:min-h-[72px] sm:px-6">
        <Link
          href="/"
          className="flex min-h-12 shrink-0 items-center"
          aria-label="Ealho home"
        >
          <Image
            src={EALHO_LOGO}
            alt="Ealho"
            width={160}
            height={40}
            priority
            className="h-8 w-auto max-w-[140px] object-contain object-left sm:h-9 sm:max-w-[180px]"
          />
        </Link>

        <nav className="hidden flex-1 justify-center lg:flex" aria-label="Primary">
          <ul className="flex flex-wrap items-center justify-center gap-6 xl:gap-10">
            <li>
              <a
                href="/#therapy-services"
                className={cn(
                  navLinkClass,
                  sectionActive("therapy-services") && navLinkActiveClass,
                )}
              >
                Psychotherapy
              </a>
            </li>
            <li>
              <a
                href="/#notes-ai"
                className={cn(
                  navLinkClass,
                  sectionActive("notes-ai") && navLinkActiveClass,
                )}
              >
                Ealho Notes AI
              </a>
            </li>
            <li>
              <ResourcesDropdown />
            </li>
            <li>
              <Link
                href="/organizations"
                className={cn(
                  navLinkClass,
                  pathname === "/organizations" && navLinkActiveClass,
                )}
              >
                For Organizations
              </Link>
            </li>
          </ul>
        </nav>

        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "h-11 min-h-11 rounded-full border-gray-300 bg-transparent px-5 text-[15px] font-medium text-gray-600 hover:bg-transparent hover:text-gray-600 sm:text-[16px]",
            )}
          >
            Login
          </Link>
          <button
            type="button"
            onClick={() => setBookingModalOpen(true)}
            className={cn(
              buttonVariants({ variant: "default", size: "default" }),
              "h-11 min-h-11 rounded-full border-0 px-5 text-[15px] font-medium hover:bg-primary/90 sm:text-[16px]",
            )}
          >
            Get Started
          </button>
        </div>

        <div className="flex items-center lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className={cn(
                buttonVariants({ variant: "outline", size: "icon-lg" }),
                "size-12 min-h-12 min-w-12 rounded-full border-gray-300 bg-[#e8e6dd] text-gray-600 hover:bg-[#e8e6dd] hover:text-gray-600",
              )}
              aria-label="Open menu"
            >
              <Menu className="size-6" strokeWidth={1.5} />
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100%,380px)] gap-0 bg-[#e8e6dd] p-0">
              <SheetHeader className="border-b border-border p-4 text-left">
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-4" aria-label="Mobile">
                <a
                  href="/#therapy-services"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-12 items-center rounded-lg px-3 py-3 text-base font-medium text-gray-600"
                >
                  Psychotherapy
                </a>
                <a
                  href="/#notes-ai"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-12 items-center rounded-lg px-3 py-3 text-base font-medium text-gray-600"
                >
                  Ealho Notes AI
                </a>
                <div className="px-3 py-2">
                  <ResourcesDropdown mobile />
                </div>
                <Link
                  href="/organizations"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-12 items-center rounded-lg px-3 py-3 text-base font-medium text-gray-600"
                >
                  For Organizations
                </Link>
                <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "h-12 w-full rounded-full border-gray-300 text-gray-600 hover:bg-transparent hover:text-gray-600",
                    )}
                  >
                    Login
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      setBookingModalOpen(true);
                    }}
                    className={cn(
                      buttonVariants({ variant: "default" }),
                      "h-12 w-full rounded-full hover:bg-primary/90",
                    )}
                  >
                    Get Started
                  </button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
